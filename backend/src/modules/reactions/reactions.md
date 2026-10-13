# Module Reactions: Thả Tim & Bày Tỏ Tình Cảm (Địa Điểm & Kỷ Niệm)

Tài liệu nội bộ module `reactions` — tóm tắt nhanh cho lập trình viên backend và frontend.

---

## 1. Mục đích module
1. Hỗ trợ thao tác Thả tim / Bỏ tim cho Địa điểm trường học và Bài viết kỷ niệm.
2. Cung cấp API Toggle "1 chạm" tiện lợi, tự động đảo trạng thái và trả về số tim mới nhất.
3. Chống gian lận bấm đúp bằng Khóa chính CSDL `(target_id, user_id)`.
4. Lấy danh sách người đã thả tim, bảng xếp hạng Top địa điểm yêu thích nhất và danh sách cá nhân.

---

## 2. Bảng CSDL (`backend/db/schema.sql`)
```sql
CREATE TABLE location_likes (
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (location_id, user_id)
);

CREATE TABLE memory_likes (
    memory_id INT REFERENCES memories(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (memory_id, user_id)
);
```

---

## 3. Danh sách Endpoints chính (`/api/reactions`)

| Method | Endpoint | Quyền (Auth) | Mô tả |
|:---:|---|:---:|---|
| `POST` | `/locations/:identifier/toggle` | `requireAuth` | **Toggle Like địa điểm (Khuyên dùng cho UI nút bấm)**: bấm lần 1 là thích, bấm lần 2 là bỏ thích. Trả về `liked` và `count` mới. |
| `GET` | `/locations/:identifier` | Tùy chọn | Xem tổng số like và trạng thái của mình (`hasLiked`). |
| `GET` | `/locations/:identifier/likers` | Công khai | Danh sách người đã thích địa điểm (phân trang). |
| `GET` | `/locations/leaderboard` | Công khai | Bảng xếp hạng các địa điểm nhiều tim nhất. |
| `POST` | `/memories/:id/toggle` | `requireAuth` | **Toggle Like bài viết kỷ niệm**. |
| `GET` | `/memories/:id` | Tùy chọn | Xem số like kỷ niệm và trạng thái của mình (`hasLiked`). |
| `GET` | `/me/locations` | `requireAuth` | Danh sách các địa điểm người dùng hiện tại đã thích. |
| `GET` | `/me/memories` | `requireAuth` | Danh sách các bài viết kỷ niệm người dùng hiện tại đã thích. |

Xem tài liệu đầy đủ tại file: [reactions.md](../../../../reactions.md) ở thư mục gốc.
