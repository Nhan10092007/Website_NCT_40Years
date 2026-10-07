# Phần Auth: xác thực, phân quyền và hồ sơ người dùng

Tài liệu mô tả toàn bộ phần đăng ký, đăng nhập, phân quyền và hồ sơ của backend web kỷ niệm 40 năm (Express, ES Modules, PostgreSQL).

- **Xác thực (authentication):** trả lời "bạn là ai?" (đăng ký, đăng nhập, JWT).
- **Phân quyền (authorization):** trả lời "bạn được làm gì?" (phải đăng nhập, phải là admin, đúng vai trò).

---

## 1. Phạm vi hiện tại

**Đã có**
- Đăng ký, đăng nhập, xem thông tin của mình.
- Đổi mật khẩu.
- Xem và sửa hồ sơ người dùng.
- Danh sách niên khóa cho ô chọn.
- Giới hạn số lần gọi (đăng nhập, đăng ký).
- Phân quyền: bắt buộc đăng nhập, bắt buộc admin, giới hạn theo vai trò.
- Middleware nhận ảnh tải lên (chưa dùng).

**Đã hoãn (chưa làm)**: quên mật khẩu và xác thực email. Xem mục 13.

---

## 2. Cấu trúc file

```
backend/src/
├── app.js                       # gắn route, errorHandler đặt cuối cùng
├── config/
│   ├── db.js                    # kết nối Postgres, hàm query
│   └── env.js                   # đọc biến môi trường (JWT_SECRET, JWT_EXPIRES_IN...)
├── modules/
│   ├── auth/
│   │   ├── auth.schema.js       # kiểm tra dữ liệu gửi lên (zod)
│   │   ├── auth.service.js      # băm mật khẩu, SQL, tạo JWT
│   │   ├── auth.controller.js   # nhận request, gọi service, trả response
│   │   └── auth.routes.js       # nối đường dẫn với controller
│   └── users/
│       ├── users.schema.js
│       ├── users.service.js
│       ├── users.controller.js
│       └── users.routes.js
├── middlewares/
│   ├── auth.js                  # requireAuth, requireAdmin
│   ├── validate.js              # chạy schema zod trước controller
│   ├── errorHandler.js          # trả lỗi thống nhất cho toàn app
│   ├── rateLimit.js             # giới hạn số lần gọi
│   ├── requireRole.js           # giới hạn theo vai trò
│   └── upload.js                # nhận ảnh tải lên (multer)
└── utils/
    ├── cohorts.js               # tạo danh sách niên khóa hợp lệ
    └── appError.js              # lỗi có kèm mã HTTP
```

Vai trò từng tầng trong một module:

| File | Việc duy nhất của nó |
|---|---|
| routes | Đường dẫn nào giao cho hàm nào, kèm middleware nào chạy trước |
| schema | Dữ liệu gửi lên có hợp lệ không |
| controller | Lấy dữ liệu từ `req`, gọi service, trả `res` |
| service | Làm việc thật: băm mật khẩu, truy vấn DB, tạo token |

Controller không đụng DB, service không biết `req/res`.

### Gắn vào `app.js`
```js
app.use(express.json());                       // phải đứng trước các route
app.use('/api/locations', locationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use(errorHandler);                         // luôn đứng cuối cùng
```

---

## 3. Luồng hoạt động

### Đăng ký
1. `POST /api/auth/register` đi qua `registerLimiter`.
2. `validate(registerSchema)` kiểm tra dữ liệu. Sai thì trả `400`, không đi tiếp.
3. Controller gọi `service.register`.
4. Service băm mật khẩu bằng bcrypt, `INSERT` vào bảng `users`, tạo JWT.
5. Trả `201` kèm `{ user, token }`.

### Đăng nhập
1. `POST /api/auth/login` đi qua `loginLimiter` rồi `validate(loginSchema)`.
2. Service tìm người dùng theo email, so mật khẩu bằng bcrypt.
3. Sai email hoặc sai mật khẩu đều trả cùng một thông báo `401`.
4. Đúng thì trả `{ user, token }`.

### Truy cập route cần đăng nhập
1. Frontend gửi header `Authorization: Bearer <token>`.
2. `requireAuth` kiểm tra chữ ký và hạn của token, gán `req.user = { id, role, isAdmin }`.
3. Các middleware và controller phía sau dùng `req.user` để biết ai đang gọi.

---

## 4. Dữ liệu người dùng

| Trường gửi lên | Cột DB | Bắt buộc | Ghi chú |
|---|---|---|---|
| `email` | `email` | Có | Cắt khoảng trắng, đổi chữ thường, duy nhất |
| `password` | `password_hash` | Có | 8 đến 72 ký tự, lưu dạng đã băm |
| `displayName` | `display_name` | Có | Không rỗng |
| `role` | `role` | Có | `student`, `alumni` hoặc `teacher` |
| `cohort` | `cohort` | Học sinh và cựu học sinh | Phải thuộc danh sách niên khóa hợp lệ |
| `className` | `class_name` | Học sinh và cựu học sinh | Không rỗng |
| `currentCity` | `current_city` | Không | |
| `job` | `job` | Không | |
| `avatarURL` | `avatar_url` | Không | Phải là URL |

Giáo viên có thể bỏ trống `cohort` và `className`. Cột `is_admin` **không** nhận từ dữ liệu gửi lên, luôn mặc định `false`.

### Quy tắc niên khóa
- Niên khóa là **khóa học**, một khóa dài **3 năm**, định dạng `bắt đầu-kết thúc`, ví dụ `2022-2025`.
- Khóa đầu tiên là `1986-1989` (năm thành lập trường).
- Khóa cuối là khóa bắt đầu ở **năm hiện tại** (tính lúc chạy, không ghi cứng).
- Danh sách sắp mới nhất lên đầu, sinh bởi `generateCohorts()` trong `utils/cohorts.js`. Muốn đổi mốc năm hay độ dài khóa chỉ cần sửa hai hằng số ở đầu file đó.
- Cột `cohort` trong DB là `TEXT`; việc chỉ nhận giá trị trong danh sách do backend kiểm tra (`auth.schema.js` và `users.schema.js`).

---

## 5. Hợp đồng API

Mọi phản hồi lỗi có dạng `{ "message": "..." }`. Riêng lỗi `400` do dữ liệu sai còn có thêm `errors: [{ field, message }]`.

### Auth: `/api/auth`

#### `GET /api/auth/cohorts`
Công khai. Trả danh sách niên khóa cho ô chọn (`<select>`) ở form đăng ký.

- `200`: `["2026-2029", "2025-2028", ..., "1986-1989"]`

#### `POST /api/auth/register`
Công khai. Body ví dụ:

```json
{
  "email": "an@example.com",
  "password": "matkhau123",
  "displayName": "Nguyễn Văn An",
  "role": "alumni",
  "cohort": "2015-2018",
  "className": "12A3",
  "currentCity": "TP.HCM",
  "job": "Kỹ sư phần mềm"
}
```

- `201`: `{ "user": {...}, "token": "..." }`
- `400`: dữ liệu không hợp lệ
- `409`: email đã được sử dụng
- `429`: đăng ký quá nhiều lần

#### `POST /api/auth/login`
Công khai. Body: `{ "email": "...", "password": "..." }`

- `200`: `{ "user": {...}, "token": "..." }`
- `400`: thiếu hoặc sai định dạng
- `401`: email hoặc mật khẩu không đúng
- `429`: thử sai quá nhiều lần

#### `GET /api/auth/me`
Cần đăng nhập.

- `200`: `{ "user": {...} }`
- `401`: thiếu token, token sai hoặc hết hạn, hoặc tài khoản không còn tồn tại

#### `PATCH /api/auth/password`
Cần đăng nhập. Body: `{ "currentPassword": "...", "newPassword": "..." }` (mật khẩu mới 8 đến 72 ký tự và khác mật khẩu cũ).

- `200`: `{ "message": "Đã đổi mật khẩu" }`
- `400`: dữ liệu không hợp lệ, hoặc **mật khẩu hiện tại sai** (cố ý không dùng `401` để frontend không tự đăng xuất người dùng)
- `401`: chưa đăng nhập hoặc token hết hạn

### Hồ sơ: `/api/users`

#### `GET /api/users/:id`
Cần đăng nhập. Xem hồ sơ công khai của một người (không có email).

- `200`: `{ "user": { id, display_name, role, cohort, class_name, current_city, job, avatar_url, created_at } }`
- `401`: chưa đăng nhập
- `404`: không tìm thấy

#### `PATCH /api/users/me`
Cần đăng nhập. Sửa hồ sơ của chính mình. Chỉ gửi các trường muốn đổi: `displayName`, `cohort`, `className`, `currentCity`, `job`, `avatarURL`. Gửi `null` hoặc chuỗi rỗng ở `currentCity`, `job`, `avatarURL` để xóa. Không đổi được `email`, `role`, `is_admin` (các trường lạ bị bỏ qua).

- `200`: `{ "user": {...} }` (đầy đủ như `/me`)
- `400`: không có trường nào, hoặc dữ liệu sai (ví dụ niên khóa không hợp lệ)
- `401`: chưa đăng nhập

### Đối tượng `user` trả về (login, register, me, sửa hồ sơ)
Tên trường giữ dạng snake_case như cột DB:

```json
{
  "id": 1,
  "email": "an@example.com",
  "display_name": "Nguyễn Văn An",
  "role": "alumni",
  "cohort": "2015-2018",
  "class_name": "12A3",
  "current_city": "TP.HCM",
  "job": "Kỹ sư phần mềm",
  "avatar_url": null,
  "is_admin": false,
  "created_at": "2026-10-06T02:00:00.000Z"
}
```

Không bao giờ có `password_hash` trong phản hồi.

---

## 6. JWT

- **Nội dung (payload):** `{ id, role, isAdmin }`.
- **Ký bằng:** `JWT_SECRET` trong `.env`.
- **Hạn dùng:** `JWT_EXPIRES_IN`, mặc định `7d` (7 ngày). Hết hạn thì người dùng đăng nhập lại.
- **Gửi lên:** header `Authorization: Bearer <token>`.
- **Frontend:** lưu token bằng `localStorage.setItem('token', ...)`. File `client.js` (axios) tự đọc `localStorage` và gắn header cho mọi request.

---

## 7. Phân quyền (authorization)

### Ba mức người dùng
| Mức | Là ai | Làm được gì |
|---|---|---|
| Khách | Chưa đăng nhập | Xem tour, xem kỷ niệm |
| Người dùng | Đã đăng nhập, `is_admin = FALSE` | Đăng kỷ niệm, thích, bình luận, sửa và xóa **bài của mình** |
| Admin | Đã đăng nhập, `is_admin = TRUE` | Mọi thứ trên, cộng thêm duyệt, gỡ bài và bình luận của **bất kỳ ai** |

### Ba middleware phân quyền
- **`requireAuth`** (`middlewares/auth.js`): bắt buộc đăng nhập. Thiếu hoặc sai token thì trả `401`.
- **`requireAdmin`** (`middlewares/auth.js`): bắt buộc là admin, **phải đặt sau `requireAuth`**. Không phải admin thì trả `403`.
- **`requireRole(...roles)`** (`middlewares/requireRole.js`): chỉ cho các vai trò được liệt kê (`student`, `alumni`, `teacher`), **phải đặt sau `requireAuth`**. Không đúng vai trò thì trả `403`.

Vai trò (`role`) là **thân phận**, còn admin (`is_admin`) là **quyền**; hai thứ độc lập nhau. Hiện chưa có tính năng nào phải phân theo vai trò, nên `requireRole` đã viết sẵn nhưng chưa dùng.

Cách dùng trên route:

```js
router.get('/me', requireAuth, controller.me);
router.delete('/memories/:id', requireAuth, controller.remove);   // chủ bài hoặc admin: kiểm tra trong service
router.get('/admin/memories', requireAuth, requireAdmin, controller.listPending);
router.post('/...', requireAuth, requireRole('teacher'), controller.xxx);
```

### Cách một người thành admin
Không có nút hay trang nào để tự nhận quyền admin. Cấp bằng SQL, chạy tay:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'email-cua-admin@example.com';
```

Có thể cấp cho nhiều người. Vì `isAdmin` nằm trong token nên sau khi cấp hoặc thu quyền, người đó phải **đăng nhập lại** để token mới có hiệu lực (token cũ còn hiệu lực tối đa 7 ngày).

### Hai điều cần nhớ
- **Quyền thật nằm ở backend.** Frontend ẩn nút "Trang admin" với người thường chỉ để cho gọn, không phải để bảo mật. Mọi API của admin bắt buộc có `requireAdmin`.
- Quyền "chủ bài hoặc admin" (xóa bài, xóa bình luận) kiểm tra trong **service** của module đó, vì nó phụ thuộc vào chủ của từng bản ghi.

### Code phần admin nằm ở đâu
| Phần | Nằm ở |
|---|---|
| Kiểm tra quyền | `middlewares/auth.js` (đã xong) |
| API riêng của admin (xem bài chờ duyệt, duyệt hoặc từ chối bài, gỡ bình luận) | `modules/admin/` (chưa làm), gắn bằng `app.use('/api/admin', ...)` và dùng `requireAuth` + `requireAdmin` một lần ở đầu router |
| Xóa bài, bình luận "của mình hoặc admin" | `modules/memories/`, `modules/comments/` |
| Giao diện | `frontend/src/pages/AdminPage.jsx` (route `/admin` đã có) |

---

## 8. Các middleware

| File | Làm gì | Trạng thái |
|---|---|---|
| `auth.js` | `requireAuth`, `requireAdmin` | Đã dùng |
| `validate.js` | Chạy schema zod trên `req.body`, sai thì trả `400`, đúng thì thay `req.body` bằng dữ liệu đã làm sạch | Đã dùng |
| `errorHandler.js` | Đổi `AppError` thành mã HTTP tương ứng, JSON sai cú pháp thành `400`, lỗi lạ thành `500` | Đã dùng, phải đặt cuối `app.js` |
| `rateLimit.js` | `loginLimiter` (10 lần sai trong 15 phút, đăng nhập đúng không bị tính), `registerLimiter` (20 lần mỗi giờ). Vượt quá trả `429` | Đã dùng |
| `requireRole.js` | Giới hạn theo vai trò | Viết sẵn, chưa dùng |
| `upload.js` | Nhận ảnh bằng multer: tối đa 5 ảnh, mỗi ảnh 5MB, chỉ JPG, PNG, WebP. `uploadImages` (trường `images`) và `uploadSingleImage` (trường `image`). Ảnh nằm ở `req.files` hoặc `req.file` | Viết sẵn, dùng khi làm `memories` và cần Cloudinary |

Ghi chú:
- Bộ đếm của `rateLimit` nằm trong bộ nhớ nên khởi động lại server là đặt lại. Khi triển khai sau reverse proxy cần bật `app.set('trust proxy', 1)`.
- `upload.js` kiểm tra loại ảnh theo thông tin trình duyệt gửi lên (có thể giả). Lớp bảo vệ thật là Cloudinary, nó từ chối file không phải ảnh khi tải lên.
- Form gửi ảnh phải dùng `multipart/form-data`.

---

## 9. Kiểm duyệt bài kỷ niệm (chưa chốt)

Bảng `memories` có cột `status` với ba giá trị: `pending`, `approved`, `rejected`. Có hai cách dùng:

1. **Duyệt trước:** bài mới là `pending`, chỉ hiện công khai sau khi admin chuyển sang `approved`. Kiểm soát chặt nhưng admin phải thường xuyên vào duyệt, người đăng phải chờ.
2. **Duyệt sau:** bài mới hiện luôn (`approved`), admin chỉ gỡ bài xấu (chuyển `rejected` hoặc xóa). Nhẹ việc hơn, hợp với kế hoạch làm nhanh.

**Còn phải quyết định:**
- Ai sẽ là admin trong thực tế (hai người làm web, một thầy cô hoặc cán bộ nhà trường, hay vài cựu học sinh tình nguyện).
- Trường có yêu cầu duyệt trước hay không.

Dù chọn cách nào đều cần module `admin` và trang `AdminPage`.

---

## 10. Bảo mật đã làm

- Mật khẩu băm bằng **bcrypt** (10 vòng), không bao giờ lưu mật khẩu gốc. Giới hạn tối đa 72 ký tự vì bcrypt chỉ đọc 72 byte đầu.
- Mọi câu SQL dùng **tham số** (`$1`, `$2`...), không ghép chuỗi, chống SQL injection. Với sửa hồ sơ, tên cột lấy từ một bảng ánh xạ cố định chứ không lấy từ dữ liệu gửi lên.
- Email chuẩn hóa về chữ thường, cột `email` có `UNIQUE`. Email trùng bắt bằng mã lỗi Postgres `23505`, không kiểm tra trước rồi mới ghi (tránh hai người đăng ký cùng lúc).
- Đăng nhập sai email hay sai mật khẩu đều báo **cùng một thông báo**, và luôn chạy một lần so mật khẩu (kể cả khi email không tồn tại) để không lộ email nào đã đăng ký.
- `is_admin` không nhận từ client.
- Dữ liệu gửi lên luôn qua schema zod trước khi tới controller.
- Giới hạn số lần gọi theo IP cho đăng nhập và đăng ký.
- Hồ sơ người dùng (`/api/users/:id`) yêu cầu đăng nhập và không trả email.
- Phản hồi không bao giờ chứa `password_hash`.

---

## 11. Cách test

Chạy backend (`npm run dev`) rồi dùng Thunder Client (extension trong VS Code) hoặc `curl`:

```bash
# Danh sách niên khóa
curl http://localhost:3000/api/auth/cohorts

# Đăng ký
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"an@example.com","password":"matkhau123","displayName":"Nguyễn Văn An","role":"alumni","cohort":"2015-2018","className":"12A3"}'

# Đăng nhập (lấy token từ kết quả)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"an@example.com","password":"matkhau123"}'

# Xem thông tin của mình (thay TOKEN)
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer TOKEN"
```

### Các tình huống nên thử
1. `GET /api/auth/cohorts`: phần tử đầu là `2026-2029`, phần tử cuối là `1986-1989`, tổng 41 phần tử.
2. Đăng ký hợp lệ: `201` kèm `user` và `token`.
3. Đăng ký lại cùng email: `409`.
4. Đăng ký với niên khóa sai (ví dụ `2015-2019`): `400`.
5. Học sinh bỏ trống `cohort`: `400`; giáo viên bỏ trống: `201`.
6. Đăng nhập đúng: `200`; sai mật khẩu: `401`.
7. `/me` có token: `200`; không token: `401`.
8. `PATCH /api/auth/password` với mật khẩu hiện tại đúng, rồi đăng nhập lại bằng mật khẩu mới; mật khẩu hiện tại sai: `400`.
9. `PATCH /api/users/me` gửi `{ "job": "Giáo viên" }`: `200`; gửi `{}`: `400`; gửi `cohort` sai: `400`.
10. `GET /api/users/1` có token: `200` (không có email); không token: `401`.
11. Đăng nhập sai mật khẩu liên tiếp 11 lần: lần thứ 11 trả `429` (khởi động lại backend để đặt lại).

Kiểm tra dữ liệu thật trong DB:
```bash
psql "postgresql://postgres:MAT_KHAU@localhost:5432/web40nam" -c "SELECT id, email, role, cohort, is_admin FROM users;"
```

---

## 12. Lưu ý cho người làm giao diện

- Ô chọn niên khóa lấy danh sách từ `GET /api/auth/cohorts`.
- Khi để trống niên khóa (giáo viên), **không gửi trường `cohort` lên**. Gửi chuỗi rỗng `""` sẽ bị báo "Niên khóa không hợp lệ". Tương tự với `className`.
- Sau khi đăng ký hoặc đăng nhập thành công, lưu `token` vào `localStorage`, lấy thông tin người dùng từ `user` trong phản hồi.
- Khi bất kỳ request nào trả `401`, xóa token trong `localStorage` và đưa người dùng về trang đăng nhập. (Đổi mật khẩu sai mật khẩu hiện tại trả `400`, không phải `401`, nên không bị đăng xuất nhầm.)
- Nút "Đăng xuất" chỉ cần xóa token ở frontend, backend không giữ phiên.
- Trang admin (`/admin`) chỉ hiện với `user.is_admin === true`, nhưng việc chặn thật nằm ở backend.
- Form gửi ảnh dùng `multipart/form-data`, tên trường ảnh là `images` (nhiều ảnh) hoặc `image` (một ảnh).

---

## 13. Chưa làm và giới hạn hiện tại

**Đã hoãn**
- **Quên mật khẩu** và **xác thực email**: cần dịch vụ gửi email (SMTP, Resend...), thêm cột `users.email_verified` và bảng lưu token. Hiện **DB chưa có** các thứ này. Làm khi cần.

**Chưa làm**
- Refresh token (hết 7 ngày phải đăng nhập lại).
- Module `admin` và trang `AdminPage`.
- Cho đổi `role` (ví dụ học sinh lên cựu học sinh) qua API sửa hồ sơ.
- Tải ảnh đại diện lên; hiện chỉ nhận đường link ảnh (`avatarURL`).

**Giới hạn đã biết**
- Đổi mật khẩu **không làm các token cũ mất hiệu lực**; token cũ vẫn dùng được tới khi hết hạn.
- Cấp hay thu quyền admin chỉ có hiệu lực ở token mới (phải đăng nhập lại).
- Token lưu ở `localStorage` nên nếu trang bị lỗ hổng XSS thì token có thể bị đánh cắp. Cách an toàn hơn là cookie `httpOnly` (cần đổi cả backend và `client.js`).
- Bộ đếm giới hạn số lần gọi nằm trong bộ nhớ, đặt lại khi khởi động lại server.

---

## 14. Cài đặt

### Thư viện (thư mục `backend`)
```bash
npm i bcrypt jsonwebtoken zod express-rate-limit multer
```
`bcrypt` báo lỗi biên dịch trên WSL thì dùng `bcryptjs` và đổi dòng `import` cho khớp.

### Biến môi trường (`backend/.env`)
| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng backend (hiện `3000`) |
| `CLIENT_URL` | Địa chỉ frontend, dùng cho CORS (hiện `http://localhost:5173`) |
| `DATABASE_URL` | Chuỗi kết nối Postgres |
| `JWT_SECRET` | Khóa ký token, bắt buộc, phải khác nhau giữa máy dev và máy chủ thật |
| `JWT_EXPIRES_IN` | Hạn token, tùy chọn, mặc định `7d` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Chỉ cần khi làm upload ảnh |

`.env` không được commit lên Git; chỉ commit `.env.example` với giá trị mẫu.

### Danh sách kiểm tra khi dán code
- [ ] `config/env.js` có `jwtSecret` và `jwtExpiresIn`.
- [ ] `utils/appError.js` và `utils/cohorts.js` có đủ, đúng đường dẫn import.
- [ ] 4 file trong `modules/auth/` và 4 file trong `modules/users/`.
- [ ] 6 file trong `middlewares/`.
- [ ] `app.js`: `express.json()` trước route, đủ `/api/auth` và `/api/users`, `errorHandler` cuối cùng, dấu phẩy đúng ở `app.use('/api/auth', authRoutes)`.
- [ ] Mọi `import` file nội bộ đều có đuôi `.js`.

# Module Users

Module quản lý **hồ sơ người dùng** của website kỷ niệm 40 năm trường. Module này tách khỏi `auth`:

- **auth**: xác thực (đăng ký, đăng nhập, cấp token JWT).
- **users**: thông tin của người dùng trong cộng đồng trường (tên hiển thị, niên khóa, lớp, nơi ở, công việc, ảnh đại diện).

Vị trí: `backend/src/modules/users/`

## Cấu trúc file

| File | Công dụng |
| --- | --- |
| `users.routes.js` | Khai báo đường dẫn, gắn middleware (`requireAuth`, `validate`) và nối với controller. |
| `users.controller.js` | Nhận request, gọi service, trả JSON. Lấy `id` và `role` từ `req.user` (do `requireAuth` gắn từ token) rồi truyền xuống service. Lỗi được chuyển cho `errorHandler` bằng `next(err)`. |
| `users.service.js` | Chứa logic truy vấn PostgreSQL (lấy và cập nhật hồ sơ) và kiểm tra quy tắc theo vai trò. |
| `users.schema.js` | Schema zod kiểm tra dữ liệu gửi lên khi sửa hồ sơ. |

Route được đăng ký trong `app.js`:

```js
app.use('/api/users', usersRoutes);
```

## API hiện có

Tất cả endpoint đều yêu cầu đăng nhập: header `Authorization: Bearer <token>`.

### `GET /api/users/me`

Lấy hồ sơ của chính người đang đăng nhập.

- Thành công (200): `{ "user": { ... } }`
- Các trường trả về: `id`, `email`, `display_name`, `role`, `cohort`, `class_name`, `current_city`, `job`, `avatar_url`, `is_admin`, `created_at`
- Lỗi: 401 nếu chưa đăng nhập hoặc token hết hạn; 404 nếu tài khoản không còn tồn tại.

### `PATCH /api/users/me`

Sửa hồ sơ của chính mình. Chỉ gửi các trường muốn đổi; trường không gửi thì giữ nguyên.

| Trường | Quy tắc |
| --- | --- |
| `displayName` | Chuỗi, bỏ khoảng trắng đầu/cuối, không được rỗng. Không xóa được. |
| `cohort` | Phải nằm trong danh sách niên khóa hợp lệ (`isValidCohort` trong `utils/cohorts.js`). Mỗi khóa 3 năm, bắt đầu từ 1986. Không xóa được. |
| `className` | Chuỗi, không được rỗng. Không xóa được. |
| `currentCity` | Chuỗi. Gửi `null` hoặc chuỗi rỗng để xóa (lưu `NULL`). |
| `job` | Chuỗi. Gửi `null` hoặc chuỗi rỗng để xóa (lưu `NULL`). |

Quy tắc theo vai trò:

- **Giáo viên** (`teacher`) không có niên khóa và lớp. Nếu gửi `cohort` hoặc `className` thì trả 400 "Giáo viên không có niên khóa hoặc lớp".
- **Học sinh và cựu học sinh** có thể đổi niên khóa và lớp sang giá trị khác, nhưng không thể xóa hai trường này.

Kết quả:

- Thành công (200): `{ "user": { ... } }` với hồ sơ sau khi cập nhật.
- Lỗi 400: dữ liệu không hợp lệ (ví dụ niên khóa sai), body không có trường nào để cập nhật, hoặc giáo viên gửi niên khóa/lớp.
- Lỗi 401: chưa đăng nhập.

## Cách hoạt động của việc cập nhật

- Service ghép câu `UPDATE` chỉ gồm những trường có trong request. Tên cột lấy từ một bảng cố định (`UPDATABLE_FIELDS`), không lấy từ người dùng.
- Phân biệt rõ: trường **không gửi** thì không đụng đến, trường gửi **`null`** thì được xóa.
- Vai trò lấy từ `req.user.role` (trong token JWT, do server ký), không lấy từ body, vì body do người dùng tự gửi nên không đáng tin.

## Các điểm bảo mật

- Schema zod chỉ khai báo 5 trường được sửa. Các trường khác như `role`, `isAdmin`, `email` bị bỏ qua, nên người dùng không thể tự nâng quyền qua route này.
- Câu lệnh SQL dùng tham số (`$1`, `$2`, ...) nên không bị SQL injection.
- `password_hash` không bao giờ nằm trong danh sách cột trả về.

## Hạn chế hiện tại

- `avatar_url` chưa sửa được qua API.
- Vai trò lấy từ token, nên nếu sau này có tính năng đổi vai trò (ví dụ học sinh tốt nghiệp thành cựu học sinh) thì token cũ vẫn mang vai trò cũ cho đến khi hết hạn (7 ngày). Lúc đó cần xét lại, ví dụ đọc vai trò từ database.

## Việc cần làm tiếp

1. Xem hồ sơ công khai của người khác: `GET /api/users/:id`. Chỉ trả các trường an toàn, không có `email`, `is_admin`.
2. Ảnh đại diện: upload bằng `uploadSingleImage`, cần chọn nơi lưu ảnh.
3. Tìm kiếm người dùng theo tên, niên khóa, lớp để gắn thẻ bạn cùng lớp.

## Liên quan đến module khác

- `auth`: dùng chung bảng `users`, middleware `requireAuth`, và danh sách niên khóa `utils/cohorts.js`.
- `memories`, `checkins`, `likes` (sau này): sẽ lấy thông tin người đăng từ module này để hiển thị tên và ảnh đại diện.