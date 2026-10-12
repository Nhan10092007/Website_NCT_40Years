# Module Comments: Bình luận cho bài kỷ niệm

Tài liệu nội bộ module `comments` — tóm tắt nhanh cho backend và frontend.

---

## 1. Mục đích module
1. Cho phép người dùng bình luận vào từng bài viết kỷ niệm.
2. Hiển thị danh sách bình luận theo từng bài, có phân trang.
3. Cho phép chủ bình luận hoặc admin sửa/xóa bình luận.
4. Cung cấp danh sách bình luận của riêng người dùng để làm trang cá nhân hoặc quản trị sau này.

---

## 2. Bảng CSDL (`backend/db/schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS comments (
  id            SERIAL PRIMARY KEY,
  memory_id     INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_memory ON comments (memory_id);
```

---

## 3. Danh sách Endpoints chính (`/api/comments`)

| Method | Endpoint | Quyền (Auth) | Mô tả |
|:---:|---|:---:|---|
| `GET` | `/memories/:memoryId` | Tùy chọn | Lấy danh sách bình luận của một bài kỷ niệm, hỗ trợ `?page=...&limit=...`. |
| `POST` | `/memories/:memoryId` | `requireAuth` | Tạo bình luận mới cho bài kỷ niệm. |
| `PATCH` | `/:id` | `requireAuth` | Sửa nội dung bình luận của chính mình, hoặc admin có thể sửa mọi bình luận. |
| `DELETE` | `/:id` | `requireAuth` | Xóa bình luận của chính mình, hoặc admin có thể xóa mọi bình luận. |
| `GET` | `/me` | `requireAuth` | Danh sách các bình luận mà người dùng hiện tại đã viết. |

---

## 4. Dữ liệu trả về chính
1. `listComments` trả về `memory`, `items`, `pagination`.
2. `createComment` trả về bản ghi bình luận vừa tạo.
3. `updateComment` trả về bản ghi đã cập nhật.
4. `deleteComment` trả về bản ghi vừa bị xóa để UI có thể cập nhật ngay.
5. `mine` trả về danh sách bình luận cá nhân kèm tên và slug của địa điểm thuộc bài viết.

---

## 5. Quy tắc kỹ thuật
1. Bình luận luôn gắn với `memories.id` và `users.id` bằng khóa ngoại.
2. Xóa bài viết `memory` sẽ xóa cascade toàn bộ bình luận liên quan.
3. Chỉ chủ bình luận hoặc admin mới được sửa/xóa.
4. Nội dung bình luận được trim và giới hạn tối đa 2000 ký tự.
5. API dùng tham số hóa SQL, không ghép chuỗi trực tiếp.

---

## 6. Ghi chú cho frontend
1. UI nên gọi `GET /api/comments/memories/:memoryId` khi mở phần bình luận của một bài.
2. Sau khi `POST`, chỉ cần append comment mới vào danh sách hiện tại hoặc refetch trang đầu.
3. Nếu người dùng không có quyền sửa/xóa, backend sẽ trả `403`.
4. Nếu bình luận hoặc bài viết không tồn tại, backend sẽ trả `404`.
