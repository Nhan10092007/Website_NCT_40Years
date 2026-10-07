# Phần Auth: Đăng Ký, Đăng Nhập, Phân Quyền & Hồ Sơ Cá Nhân

Chào anh em! Đây là tài liệu giải thích toàn bộ phần **Xác thực (Authentication)**, **Phân quyền (Authorization)** và **Quản lý tài khoản (Users)** của backend web kỷ niệm 40 năm NCT (viết bằng Express, ES Modules và PostgreSQL) do Thiện Nhân phụ trách.

Nếu bạn là thành viên mới vào team, người vào sau cần sửa lỗi/thêm tính năng, hoặc đang làm Frontend cần kết nối API, bạn chỉ cần đọc file này là sẽ nắm được toàn bộ cách hoạt động của hệ thống tài khoản.

---

## 1. Tóm tắt nhanh: Phần này giải quyết những việc gì?

Về cơ bản, phần này trả lời 2 câu hỏi lớn của hệ thống:
1. **Bạn là ai?** (Authentication): Cho phép học sinh, cựu học sinh và thầy cô đăng ký tài khoản, đăng nhập, nhận mã token JWT và xem thông tin cá nhân của mình.
2. **Bạn được phép làm gì?** (Authorization): Kiểm tra xem ai là khách vãng lai (chỉ được xem), ai là thành viên đã đăng nhập (được đăng bài, bình luận, check-in, thả tim), và ai là **Admin** (được duyệt bài, gỡ nội dung xấu, quản lý địa điểm).

---

## 2. Cấu trúc thư mục & nhiệm vụ từng tầng

Code được chia tách thành 2 module chính trong `backend/src/modules/`: `auth` (chuyên việc đăng nhập/đăng ký) và `users` (chuyên việc xem và sửa thông tin cá nhân).

```
backend/src/
├── app.js                       # Gắn các route /api/auth và /api/users, errorHandler đặt cuối
├── config/
│   ├── db.js                    # Kết nối database PostgreSQL
│   └── env.js                   # Đọc các biến môi trường (.env: JWT_SECRET, PORT...)
├── modules/
│   ├── auth/
│   │   ├── auth.schema.js       # Kiểm tra dữ liệu đăng ký/đăng nhập gửi lên (bằng Zod)
│   │   ├── auth.service.js      # Băm mật khẩu (bcrypt), truy vấn SQL, tạo mã JWT
│   │   ├── auth.controller.js   # Nhận request, gọi service, trả response về cho client
│   │   └── auth.routes.js       # Khai báo URL và gắn các middleware kiểm tra
│   └── users/
│       ├── users.schema.js      # Kiểm tra dữ liệu khi người dùng sửa hồ sơ
│       ├── users.service.js     # Lấy thông tin cá nhân, cập nhật thông tin trong DB
│       ├── users.controller.js  # Điều phối dữ liệu hồ sơ
│       └── users.routes.js      # Khai báo các route xem/sửa thông tin
├── middlewares/
│   ├── auth.js                  # requireAuth (bắt buộc đăng nhập), requireAdmin (bắt buộc admin)
│   ├── validate.js              # Chạy schema Zod trước khi dữ liệu vào controller
│   ├── errorHandler.js          # Bắt lỗi và trả về JSON thống nhất cho toàn app
│   ├── rateLimit.js             # Giới hạn số lần gọi API (chống spam đăng nhập/đăng ký)
│   ├── requireRole.js           # Kiểm tra vai trò (học sinh, cựu học sinh, giáo viên)
│   └── upload.js                # Xử lý nhận file ảnh tải lên (Multer)
└── utils/
    ├── cohorts.js               # Tự động sinh danh sách niên khóa hợp lệ (từ 1986 đến nay)
    └── appError.js              # Class tạo lỗi có sẵn mã HTTP (400, 401, 403, 404...)
```

### Quy tắc làm việc giữa các tầng (Anh em lưu ý để không làm rối code):
- **Routes:** Chỉ làm nhiệm vụ dẫn đường và chọn middleware bảo vệ.
- **Schema:** Chỉ kiểm tra dữ liệu gửi lên đúng hay sai. Sai là chặn ngay từ cửa, trả lỗi `400`.
- **Controller:** Chỉ bóc tách `req.body`, `req.user`, gọi xuống Service và trả kết quả về `res`. Controller không bao giờ viết câu lệnh SQL.
- **Service:** Làm việc nặng thật sự (băm mật khẩu, chạy SQL, tạo token). Service không được đụng vào đối tượng `req` hay `res`.

---

## 3. Luồng hoạt động thực tế

### 3.1. Đăng ký tài khoản mới (`POST /api/auth/register`)
1. Client gửi thông tin tài khoản lên.
2. Request chạy qua `registerLimiter` (chống spam tạo tài khoản hàng loạt).
3. `validate(registerSchema)` kiểm tra định dạng email, độ dài mật khẩu, niên khóa hợp lệ... Nếu sai báo lỗi `400` ngay.
4. Service băm mật khẩu bằng **bcrypt** (10 vòng băm an toàn), sau đó chạy câu lệnh `INSERT` vào bảng `users`.
5. Tạo token JWT chứa thông tin cơ bản `{ id, role, isAdmin }`.
6. Trả về `201 Created` kèm thông tin người dùng (`user`) và `token`.

### 3.2. Đăng nhập (`POST /api/auth/login`)
1. Client gửi `email` và `password`.
2. Chạy qua `loginLimiter` (giới hạn số lần thử, tránh bị dò mật khẩu).
3. Service tìm người dùng theo email:
   - Dù email không tồn tại hay mật khẩu bị sai, backend đều trả về **cùng một thông báo** `401: Email hoặc mật khẩu không chính xác`. Điều này để tránh kẻ xấu dò biết email nào đã đăng ký trong hệ thống.
4. Nếu đúng mật khẩu -> tạo mã JWT và trả về `200 OK` kèm `token`.

### 3.3. Khi gọi các API cần đăng nhập
1. Frontend đính kèm header: `Authorization: Bearer <token>`.
2. Middleware `requireAuth` đọc token, kiểm tra chữ ký và hạn dùng. Nếu hợp lệ, nó sẽ gắn `req.user = { id, role, isAdmin }`.
3. Các controller phía sau chỉ việc đọc `req.user.id` là biết ai đang gọi API.

---

## 4. Dữ liệu tài khoản người dùng

Bảng `users` trong cơ sở dữ liệu:

| Trường gửi lên | Cột trong CSDL | Bắt buộc? | Ý nghĩa & Quy tắc |
|---|---|:---:|---|
| `email` | `email` | Có | Tự động chuyển về chữ thường, cắt khoảng trắng, không được trùng |
| `password` | `password_hash` | Có | Từ 8 đến 72 ký tự, được băm an toàn trước khi lưu |
| `displayName` | `display_name` | Có | Tên hiển thị của người dùng (ví dụ: "Nguyễn Văn An") |
| `role` | `role` | Có | Nhận 1 trong 3 giá trị: `student` (học sinh), `alumni` (cựu học sinh), `teacher` (thầy cô) |
| `cohort` | `cohort` | Bắt buộc với học sinh/cựu học sinh | Niên khóa học 3 năm (ví dụ: `2015-2018`). Thầy cô có thể để trống. |
| `className` | `class_name` | Bắt buộc với học sinh/cựu học sinh | Lớp học (ví dụ: `12A3`). Thầy cô có thể để trống. |
| `currentCity` | `current_city` | Không | Thành phố đang sinh sống hiện tại |
| `job` | `job` | Không | Nghề nghiệp / công việc hiện tại |
| `avatarURL` | `avatar_url` | Không | Đường link ảnh đại diện |

> **Lưu ý quan trọng:** Cột `is_admin` **không bao giờ** nhận từ phía client gửi lên. Mặc định khi tạo tài khoản luôn là `false`. Muốn cấp quyền admin thì phải sửa trực tiếp trong CSDL.

### Quy tắc niên khóa của trường THPT Nguyễn Công Trứ:
- Một khóa học cấp 3 kéo dài **3 năm**, định dạng: `năm_bắt_đầu-năm_kết_thúc` (ví dụ `2022-2025`).
- Khóa đầu tiên của trường là `1986-1989` (năm thành lập trường).
- Khóa mới nhất được tính tự động dựa trên năm hiện tại của hệ thống.
- Hàm `generateCohorts()` trong `utils/cohorts.js` tự động sinh ra danh sách này và sắp xếp khóa mới nhất lên đầu.

---

## 5. Danh sách các API chi tiết

Mọi phản hồi báo lỗi từ hệ thống đều có dạng chuẩn:
```json
{ "message": "Nội dung thông báo lỗi bằng tiếng Việt" }
```

### 5.1. Lấy danh sách niên khóa để hiển thị ô chọn (`<select>`)
- **Method:** `GET`
- **URL:** `/api/auth/cohorts`
- **Quyền:** Công khai (ai cũng gọi được)
- **Response `200 OK`:** Mảng danh sách các khóa từ mới nhất đến năm 1986:
  `["2026-2029", "2025-2028", ..., "1986-1989"]`

### 5.2. Đăng ký tài khoản
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Body mẫu:**
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
- **Response `201 Created`:**
```json
{
  "user": {
    "id": 1,
    "email": "an@example.com",
    "display_name": "Nguyễn Văn An",
    "role": "alumni",
    "cohort": "2015-2018",
    "class_name": "12A3",
    "is_admin": false
  },
  "token": "eyJhbGciOiJIUzI1Ni..."
}
```
- **Các lỗi thường gặp:**
  - `400`: Dữ liệu không hợp lệ (mật khẩu quá ngắn, niên khóa không đúng format...).
  - `409`: Email này đã được đăng ký trước đó.
  - `429`: Bấm đăng ký quá nhiều lần liên tục (bị chặn tạm thời).

### 5.3. Đăng nhập
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Body:** `{ "email": "an@example.com", "password": "matkhau123" }`
- **Response `200 OK`:** Trả về `{ "user": {...}, "token": "..." }`.
- **Response `401 Unauthorized`:** Sai email hoặc sai mật khẩu.

### 5.4. Xem thông tin của chính mình (`/me`)
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Response `200 OK`:** Trả về đầy đủ thông tin cá nhân của người đang đăng nhập.

### 5.5. Đổi mật khẩu
- **Method:** `PATCH`
- **URL:** `/api/auth/password`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Body:** `{ "currentPassword": "matkhaucu", "newPassword": "matkhaumoi123" }`
- **Response `200 OK`:** `{ "message": "Đã đổi mật khẩu" }`
- **Lưu ý:** Nếu người dùng gõ sai mật khẩu hiện tại, API cố ý trả về `400` (thay vì `401`) để Frontend không tự động đăng xuất người dùng ra màn hình login.

### 5.6. Xem hồ sơ công khai của người khác
- **Method:** `GET`
- **URL:** `/api/users/:id`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Response `200 OK`:** Trả về thông tin công khai (tên, khóa, lớp, công việc...) và **không bao giờ trả về email hay password_hash** để bảo vệ quyền riêng tư.

### 5.7. Cập nhật hồ sơ cá nhân
- **Method:** `PATCH`
- **URL:** `/api/users/me`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Body:** Chỉ gửi những trường muốn cập nhật (`displayName`, `cohort`, `className`, `currentCity`, `job`, `avatarURL`).
- **Response `200 OK`:** Trả về đối tượng `user` mới nhất sau khi sửa.

---

## 6. Bảo mật hệ thống đã được cài cắm những gì?

1. **Băm mật khẩu:** Sử dụng `bcrypt` với 10 vòng mã hóa. Mật khẩu gốc không bao giờ được lưu trong cơ sở dữ liệu. Giới hạn mật khẩu tối đa 72 ký tự vì bcrypt chỉ xử lý 72 bytes đầu.
2. **Chống SQL Injection:** 100% các câu lệnh SQL trong `service` đều dùng tham số hóa dạng `$1, $2, $3...`, tuyệt đối không cộng chuỗi SQL.
3. **Chống lộ thông tin đăng nhập:** Đăng nhập sai email hay sai mật khẩu đều báo chung một thông điệp lỗi `401`.
4. **Bảo vệ tài nguyên:** Giới hạn số lần gọi (`express-rate-limit`) tại các route nhạy cảm như đăng nhập và đăng ký để chống tấn công brute-force.
5. **Không bao giờ lộ mật khẩu:** Mọi câu query và response trả về client đều loại trừ cột `password_hash`.

---

## 7. Hướng dẫn test nhanh bằng cURL

Bạn mở Terminal và có thể chạy thử các lệnh này để kiểm tra backend:

```bash
# 1. Lấy danh sách niên khóa
curl http://localhost:3000/api/auth/cohorts

# 2. Đăng ký tài khoản thử nghiệm
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"an@example.com","password":"matkhau123","displayName":"Nguyễn Văn An","role":"alumni","cohort":"2015-2018","className":"12A3"}'

# 3. Đăng nhập để lấy Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"an@example.com","password":"matkhau123"}'

# 4. Xem thông tin của tôi (thay TOKEN bằng chuỗi nhận được ở bước 3)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 8. Gợi ý dành cho anh em làm Frontend

- **Ô chọn niên khóa:** Gọi `GET /api/auth/cohorts` lúc tải trang để đổ danh sách vào thẻ `<select>`.
- **Giáo viên không có niên khóa:** Nếu là thầy cô, form đăng ký **không được gửi trường `cohort` lên** (đừng gửi chuỗi rỗng `""` vì Zod sẽ báo lỗi niên khóa không hợp lệ).
- **Lưu trữ phiên đăng nhập:** Sau khi đăng nhập thành công, lưu `token` vào `localStorage`. Cấu hình Axios (`client.js`) tự động đính kèm `Authorization: Bearer <token>` cho mọi request tiếp theo.
- **Xử lý hết hạn phiên:** Khi bất kỳ API nào trả về mã lỗi `401`, hãy xóa token trong `localStorage` và chuyển hướng người dùng về trang Đăng nhập.
- **Trang Quản trị (`/admin`):** Chỉ hiển thị menu hoặc link vào trang quản trị khi `user.is_admin === true`. Tuy nhiên ở backend, các API nhạy cảm đều đã có middleware `requireAdmin` chặn cổng an toàn.