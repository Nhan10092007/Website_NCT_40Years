# Phần Check-in: Điểm danh góc trường & Huy hiệu kỷ niệm 40 năm NCT

Tài liệu này giải thích toàn bộ logic backend của tính năng **Check-in góc trường** (Express, ES Modules, PostgreSQL) do Khang Lê phụ trách. 

Nếu bạn là người vào sau cần sửa code, thêm tính năng, hoặc bạn đang làm giao diện Frontend cần nối API, tài liệu này sẽ giúp bạn hiểu ngay từ đầu đến cuối mà không cần phải đọc từng dòng code.

---

## 1. Mục đích module

Ý tưởng chính gồm 3 việc:
1. **Ghi lại dấu chân:** Cựu học sinh, học sinh hay thầy cô khi ghé thăm một góc trường (trong số 11 địa điểm như Sân trường, Căn tin, Bồn cây, Phòng giám thị...) có thể bấm một nút để "check-in" xác nhận mình đã đến đây.
2. **Tìm lại bạn bè xưa:** Khi bấm vào một góc trường (ví dụ Căn tin), người dùng có thể lọc xem có bạn nào **cùng niên khóa** (ví dụ `2015-2018`) hay **cùng lớp** (`12A3`) đã từng check-in ở đây không.
3. **Thử thách khám phá toàn trường:** Đếm xem người dùng đã check-in được bao nhiêu trên tổng số 11 địa điểm, tính phần trăm tiến độ và trao các huy hiệu vui kỷ niệm 40 năm (ví dụ: *Tân binh ghé thăm*, *Người yêu trường*, *Đại sứ thanh xuân*).

---

## 2. Cấu trúc thư mục & nhiệm vụ từng file

Code của phần check-in nằm gọn gàng trong thư mục `backend/src/modules/checkins/`:

```
backend/src/
├── app.js                                  # Đăng ký route /api/checkins
├── modules/
│   └── checkins/
│       ├── checkins.schema.js              # Kiểm tra dữ liệu đầu vào (Zod)
│       ├── checkins.service.js             # Làm việc với Database (viết SQL, xử lý logic)
│       ├── checkins.controller.js          # Nhận request từ client, gọi service, trả kết quả
│       ├── checkins.routes.js              # Khai báo đường dẫn URL và gắn middleware
│       └── checkins.md                     # Bản tóm tắt nhanh của module
└── db/
    └── schema.sql                          # Bảng checkins và các index tăng tốc
```

Cách phân chia trách nhiệm giống hệt các module khác trong nhóm:
- **`routes.js`**: Chỉ làm nhiệm vụ chỉ đường: URL nào thì gọi hàm nào, cần đăng nhập (`requireAuth`) hay không.
- **`schema.js`**: Người gác cổng: Chặn dữ liệu sai ngay từ ngoài cửa (ví dụ ID không phải số/slug, trang âm, tham số lạ...).
- **`controller.js`**: Chỉ lấy dữ liệu từ `req`, đưa cho `service`, rồi nhận kết quả trả về `res`. Controller không bao giờ viết câu lệnh SQL.
- **`service.js`**: Nơi làm việc thật sự: Chạy câu lệnh SQL, tính toán tỷ lệ %, lọc bạn bè, xử lý lỗi trùng lặp. Service không quan tâm đến `req` hay `res`.

---

## 3. Luồng chạy thực tế dưới backend

### 3.1. Luồng bấm nút Check-in (Toggle)
Đây là API bạn làm Frontend sẽ dùng nhiều nhất:
1. Người dùng bấm vào nút Check-in trên web.
2. Request gửi lên `POST /api/checkins/:identifier/toggle` kèm token đăng nhập.
3. Middleware `requireAuth` kiểm tra xem token còn hạn không. Nếu chưa đăng nhập thì trả `401` ngay.
4. Service tìm xem địa điểm này có tồn tại không:
   - Bạn gửi lên số `2` hay chữ `san-truong` đều được, hàm `resolveLocation` sẽ tự đổi ra `location_id`.
   - Nếu tìm không thấy địa điểm -> báo lỗi `404: Địa điểm không tồn tại`.
5. Service kiểm tra người dùng này đã từng check-in ở đây chưa:
   - **Nếu ĐÃ check-in:** Backend tự động chạy lệnh `DELETE` để hủy check-in.
   - **Nếu CHƯA check-in:** Backend tự động chạy lệnh `INSERT` để ghi nhận check-in mới.
6. Backend đếm lại ngay tổng số người check-in tại địa điểm đó và trả về:
   `{ checkedIn: true/false, count: 42 }`. Giao diện chỉ việc cập nhật số và đổi màu nút mà không cần gọi thêm request nào khác.

### 3.2. Chống bấm đúp (Spam click)
Nếu mạng bị lag và người dùng bấm liên tục 2-3 lần:
- Bảng `checkins` có khóa chính là cặp `(user_id, location_id)`.
- Postgres sẽ tự chặn lần bấm thứ hai và ném mã lỗi `23505` (Unique Violation).
- Service đã bắt sẵn mã lỗi này và trả về `409: Bạn đã check-in tại địa điểm này rồi`, hệ thống không bao giờ bị tăng số ảo.

---

## 4. Dữ liệu trong Cơ sở dữ liệu

Bảng `checkins` trong file `backend/db/schema.sql` rất đơn giản và gọn gàng:

```sql
CREATE TABLE checkins (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, location_id)
);

-- Hai index giúp tăng tốc độ tìm kiếm và đếm:
CREATE INDEX IF NOT EXISTS idx_checkins_location_id ON checkins(location_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
```

**Tại sao lại thiết kế như vậy?**
- Khóa chính `(user_id, location_id)`: Đảm bảo 1 tài khoản chỉ check-in đúng 1 lần tại 1 góc trường.
- `ON DELETE CASCADE`: Khi xóa tài khoản người dùng hoặc xóa địa điểm, các dòng check-in liên quan tự động biến mất, không để lại rác trong DB.
- Chỉ mục `idx_checkins_location_id`: Khi trường có hàng nghìn cựu học sinh check-in, câu lệnh đếm hoặc lọc theo địa điểm vẫn chạy cực nhanh.

---

## 5. Danh sách các API chi tiết

Tất cả các phản hồi lỗi từ hệ thống đều theo định dạng thống nhất:
```json
{ "message": "Nội dung thông báo lỗi rõ ràng bằng tiếng Việt" }
```

### 5.1. Nút bấm Toggle Check-in (Khuyên dùng cho Frontend)
- **Method:** `POST`
- **URL:** `/api/checkins/:identifier/toggle`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Tham số `:identifier`:** Truyền ID số (ví dụ `2`) hoặc Slug (ví dụ `san-truong`, `can-tin`, `bon-cay`).
- **Kết quả trả về (`200 OK` khi check-in thành công):**
```json
{
  "message": "Check-in thành công",
  "locationId": 2,
  "locationSlug": "san-truong",
  "locationName": "Sân trường",
  "checkedIn": true,
  "count": 43
}
```
- **Kết quả trả về (`200 OK` khi bấm hủy check-in):**
```json
{
  "message": "Đã hủy check-in",
  "locationId": 2,
  "locationSlug": "san-truong",
  "locationName": "Sân trường",
  "checkedIn": false,
  "count": 42
}
```

---

### 5.2. Xem số người đã check-in tại một địa điểm
Dùng khi vừa vào trang chi tiết một góc trường để biết có bao nhiêu người đã check-in, và mình đã check-in ở đây chưa.
- **Method:** `GET`
- **URL:** `/api/checkins/location/:identifier`
- **Header:** Gửi kèm token nếu đã đăng nhập (không bắt buộc).
- **Kết quả trả về (`200 OK`):**
```json
{
  "locationId": 2,
  "locationName": "Sân trường",
  "locationSlug": "san-truong",
  "count": 42,
  "hasCheckedIn": true
}
```
*(Nếu chưa đăng nhập hoặc chưa check-in thì `hasCheckedIn` sẽ là `false`).*

---

### 5.3. Xem danh sách những ai đã check-in (Lọc theo Niên khóa & Lớp)
Dùng cho tính năng "Tìm bạn cùng trường / cùng khóa đã ghé thăm nơi này".
- **Method:** `GET`
- **URL:** `/api/checkins/location/:identifier/visitors`
- **Query params (tùy chọn):**
  - `cohort`: Lọc theo niên khóa (ví dụ `2015-2018`).
  - `className`: Lọc theo tên lớp (ví dụ `12A3`).
  - `page`: Số trang (mặc định: `1`).
  - `limit`: Số người mỗi trang (mặc định: `20`, tối đa `50`).
- **Ví dụ gọi:** `/api/checkins/location/san-truong/visitors?cohort=2015-2018&className=12A3`
- **Kết quả trả về (`200 OK`):**
```json
{
  "location": {
    "id": 2,
    "name": "Sân trường",
    "slug": "san-truong"
  },
  "items": [
    {
      "user_id": 5,
      "display_name": "Nguyễn Văn An",
      "avatar_url": null,
      "role": "alumni",
      "cohort": "2015-2018",
      "class_name": "12A3",
      "checked_in_at": "2026-10-06T14:20:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 5.4. Thống kê tỷ lệ cựu học sinh các khóa tại một góc trường
Biết được góc trường này là "tụ điểm" quen thuộc của những khóa nào nhất.
- **Method:** `GET`
- **URL:** `/api/checkins/location/:identifier/cohorts`
- **Kết quả trả về (`200 OK`):**
```json
{
  "locationId": 2,
  "locationName": "Sân trường",
  "cohorts": [
    { "cohort": "2015-2018", "count": 25 },
    { "cohort": "2018-2021", "count": 18 },
    { "cohort": "2022-2025", "count": 12 }
  ]
}
```

---

### 5.5. Xem tiến độ khám phá & Huy hiệu của bản thân
Dùng để hiển thị trong trang cá nhân (`ProfilePage`) hoặc một widget góc màn hình: "Bạn đã khám phá 8/11 góc trường (73%)".
- **Method:** `GET`
- **URL:** `/api/checkins/me/summary`
- **Header:** `Authorization: Bearer <TOKEN>` (bắt buộc)
- **Kết quả trả về (`200 OK`):**
```json
{
  "progress": {
    "checkedCount": 8,
    "totalLocations": 11,
    "percentage": 73,
    "badge": "Dấu ấn tuổi xanh ⭐"
  },
  "checkedLocations": [
    {
      "id": 1,
      "slug": "cong-truong",
      "name": "Cổng trường",
      "checked_in_at": "2026-10-06T10:00:00.000Z"
    }
  ],
  "unvisitedLocations": [
    {
      "id": 4,
      "slug": "bon-cay",
      "name": "Bồn cây",
      "description": "Nơi ghế đá bóng mát..."
    }
  ]
}
```

---

### 5.6. Bảng xếp hạng (Leaderboards)
- **Top địa điểm được check-in nhiều nhất trường:**
  - `GET /api/checkins/leaderboard/locations?limit=5`
  - Trả về danh sách góc trường hot nhất.
- **Top những "nhà thám hiểm" chăm đi khắp trường nhất:**
  - `GET /api/checkins/leaderboard/explorers?limit=10`
  - Trả về danh sách những người check-in được nhiều góc trường nhất kèm tên, niên khóa, ảnh đại diện.

---

### 5.7. Các API tường minh (Explicit - nếu không muốn dùng Toggle)
- Check-in: `POST /api/checkins/:identifier` (Trả về `201`, nếu đã check-in rồi sẽ báo lỗi `409`).
- Hủy check-in: `DELETE /api/checkins/:identifier` (Trả về `200`, nếu chưa từng check-in sẽ báo lỗi `404`).
- Xem lịch sử check-in của tôi: `GET /api/checkins/me?page=1&limit=10`.

---

## 6. Bảng danh hiệu & Huy hiệu tự động

Backend tự động tính danh hiệu dựa trên số địa điểm người dùng đã ghé thăm:

| Số điểm đã check-in | Tỷ lệ hoàn thành | Tên danh hiệu hiển thị |
|:---:|:---:|---|
| **0 điểm** | 0% | *Chưa bắt đầu hành trình* |
| **1 - 3 điểm** | < 40% | 🌱 **Tân binh khám phá** |
| **4 - 7 điểm** | 40% - 79% | 🌿 **Dấu ấn tuổi xanh** |
| **8 - 10 điểm** | 80% - 99% | ⭐ **Ký ức thân thương** |
| **Đủ 11 điểm** | 100% | 🏆 **Đại sứ thanh xuân NCT (Hoàn thành trọn vẹn)** |

---

## 7. Những bẫy kỹ thuật cần lưu ý (Dành cho người fix code sau này)

1. **Lỗi `req.query` trong Express 5:**
   - Trong Express 5, `req.query` chỉ là thuộc tính getter, không được gán đè `req.query = ...` trong middleware validate. Nếu gán đè sẽ bị lỗi crash server: `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`.
   - Cách làm đúng đã xử lý trong `middlewares/validate.js`: Dùng `Object.assign(req[source], result.data)`.
2. **Khóa định danh mềm (`resolveLocation`):**
   - Đừng ép người dùng phải gửi số ID. Hàm `resolveLocation` trong `checkins.service.js` kiểm tra nếu tham số là chuỗi số thuần túy (`/^\d+$/`) thì tìm theo `id`, ngược lại tìm theo `slug`. Điều này giúp Frontend có thể truyền trực tiếp `slug` từ thanh địa chỉ URL xuống API mà không cần query ID trước.
3. **Mã lỗi Postgres:**
   - Lỗi trùng lặp: `23505` -> Phải trả về `409 Conflict`.
   - Lỗi khóa ngoại không tồn tại (địa điểm bị xóa): `23503` -> Phải trả về `404 Not Found`.

---

## 8. Hướng dẫn test nhanh bằng cURL

Bạn mở Terminal lên và chạy thử các lệnh sau để kiểm tra:

```bash
# 1. Xem thống kê Sân trường (không cần đăng nhập)
curl http://localhost:3000/api/checkins/location/san-truong

# 2. Thử toggle check-in Sân trường (thay TOKEN bằng token thật sau khi login)
curl -X POST http://localhost:3000/api/checkins/san-truong/toggle \
  -H "Authorization: Bearer TOKEN"

# 3. Xem danh sách cựu học sinh khóa 2015-2018 đã ghé Sân trường
curl "http://localhost:3000/api/checkins/location/san-truong/visitors?cohort=2015-2018"

# 4. Xem thống kê tiến độ và danh hiệu của chính mình
curl http://localhost:3000/api/checkins/me/summary \
  -H "Authorization: Bearer TOKEN"

# 5. Xem bảng xếp hạng địa điểm
curl http://localhost:3000/api/checkins/leaderboard/locations
```

---

## 9. Gợi ý cho Frontend

- **Nút Check-in trên giao diện:** Chỉ cần gọi duy nhất `POST /api/checkins/:identifier/toggle`. Không cần tự viết logic `if (đã_checkin) gọi DELETE else gọi POST`.
- **Cơ chế Optimistic UI (Bấm là ăn ngay):** Khi người dùng click chuột vào nút, hãy đổi màu nút và tăng/giảm số ngay trên màn hình để tạo cảm giác mượt mà tức thì. Sau đó gọi API ngầm phía dưới. Nếu API trả lỗi (mạng đứt, token hết hạn), bạn hãy rollback trạng thái lại và hiển thị thông báo nhẹ.
- **Khi người dùng chưa đăng nhập:** Nếu trong `localStorage` chưa có token, khi họ bấm vào nút check-in, hãy hiển thị Modal nhắc đăng nhập hoặc chuyển hướng sang `/login` thay vì để server bắn về lỗi `401`.
- **Hiển thị tiến độ ở Profile:** Gọi API `GET /api/checkins/me/summary` để vẽ thanh Progress Bar (ví dụ `73%`) và hiển thị các địa điểm chưa ghé thăm để gợi ý người dùng bấm vào tham quan tiếp.
