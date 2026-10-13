# Module Checkins: Điểm danh góc trường & Huy hiệu kỷ niệm 40 năm NCT

Tài liệu nội bộ module `checkins` — tóm tắt nhanh cho lập trình viên backend và frontend.

---

## 1. Mục đích module
1. Ghi nhận lượt check-in của người dùng tại 11 địa điểm trường học.
2. Lọc danh sách bạn bè cựu học sinh theo **niên khóa (`cohort`)** và **lớp (`className`)**.
3. Tính toán tiến độ tham quan toàn trường (% hoàn thành) và trao các huy hiệu kỷ niệm.
4. Xếp hạng Top góc trường hot nhất và Top người dùng khám phá nhiều nhất.

---

## 2. Bảng CSDL (`backend/db/schema.sql`)
```sql
CREATE TABLE checkins (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_location_id ON checkins(location_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
```

---

## 3. Danh sách Endpoints chính (`/api/checkins`)

| Method | Endpoint | Quyền (Auth) | Mô tả |
|:---:|---|:---:|---|
| `POST` | `/:identifier/toggle` | `requireAuth` | **Toggle Check-in (Khuyên dùng cho UI nút bấm)**: bấm lần 1 là check-in, bấm lần 2 là hủy. Trả về `checkedIn` và `count` mới. |
| `GET` | `/location/:identifier` | Tùy chọn | Lấy tổng số người đã check-in và trạng thái của mình (`hasCheckedIn`). |
| `GET` | `/location/:identifier/visitors` | Công khai | Danh sách người đã check-in, hỗ trợ lọc theo `?cohort=...&className=...&page=...&limit=...`. |
| `GET` | `/location/:identifier/cohorts` | Công khai | Thống kê số lượng người check-in theo từng niên khóa. |
| `GET` | `/me/summary` | `requireAuth` | Tiến độ khám phá cá nhân (% hoàn thành, huy hiệu đạt được, danh sách các điểm chưa ghé thăm). |
| `GET` | `/leaderboard/locations` | Công khai | Bảng xếp hạng các góc trường được check-in nhiều nhất. |
| `GET` | `/leaderboard/explorers` | Công khai | Bảng xếp hạng những người check-in nhiều góc trường nhất. |
| `POST` | `/:identifier` | `requireAuth` | Check-in tường minh (trả `409` nếu đã check-in rồi). |
| `DELETE`| `/:identifier` | `requireAuth` | Hủy check-in tường minh (trả `404` nếu chưa check-in). |
| `GET` | `/me` | `requireAuth` | Lịch sử các địa điểm tôi đã check-in (có phân trang). |

> **Mẹo:** Tham số `:identifier` hỗ trợ cả ID số (ví dụ `2`) hoặc Slug chữ (ví dụ `san-truong`, `can-tin`, `bon-cay`).

---

## 4. Các bẫy kỹ thuật đã xử lý
1. **Lỗi trùng lặp:** Bắt mã lỗi Postgres `23505` trả về `409 Conflict`.
2. **Khóa ngoại không hợp lệ:** Bắt mã lỗi Postgres `23503` trả về `404 Not Found`.
3. **Express 5 req.query:** Dùng `Object.assign` thay vì gán đè `req.query` để tránh lỗi getter.
4. **Huy hiệu:** Tính theo mốc 0 điểm (chưa bắt đầu), 1-3 điểm (Tân binh), 4-7 điểm (Dấu ấn tuổi xanh), 8-10 điểm (Ký ức thân thương), 11 điểm (Đại sứ thanh xuân NCT 🏆).

Xem tài liệu đầy đủ kèm kịch bản test tại file: [checkins.md](../../../../checkins.md) ở thư mục gốc.
