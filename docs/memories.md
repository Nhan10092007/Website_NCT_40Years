# Phần Memories & Comments: Góc Kỷ Niệm & Bình Luận (NCT 40 Năm)

Tài liệu kỹ thuật giải thích toàn bộ logic backend của module **Kỷ niệm (Memories)** và **Bình luận (Comments)** (Express, ES Modules, PostgreSQL).

---

## 1. Mục đích module

Module Kỷ niệm phục vụ lưu trữ và lan tỏa các câu chuyện, hình ảnh giữa các thế hệ học sinh và thầy cô:
1. **Chia sẻ bài viết & hình ảnh:** Người dùng đăng tải câu chuyện kèm tối đa 5 hình ảnh gắn liền với từng góc trường cụ thể.
2. **Dòng thời gian (Newsfeed):** Hiển thị danh sách kỷ niệm đã được phê duyệt (`approved`), hỗ trợ lọc theo địa điểm, năm, niên khóa và tìm kiếm nội dung.
3. **Tương tác bình luận:** Cho phép trao đổi, thảo luận trực tiếp dưới từng bài viết kỷ niệm.
4. **Thả tim đồng cảm:** Tích hợp nút Thả tim 1-chạm (Toggle like) để bày tỏ cảm xúc với câu chuyện.

---

## 2. Cấu trúc thư mục & nhiệm vụ từng file

Mã nguồn được tổ chức thành 2 module chức năng tại `backend/src/modules/`:

```
backend/src/
├── app.js                          # Đăng ký route /api/memories và /api/comments
└── modules/
    ├── memories/
    │   ├── memories.schema.js      # Kiểm tra dữ liệu bài viết và tham số lọc bằng Zod
    │   ├── memories.service.js     # Xử lý CSDL: Transaction tạo bài + ảnh, truy vấn feed, xóa bài
    │   ├── memories.controller.js  # Nhận request, gọi service, trả response JSON
    │   ├── memories.routes.js      # Khai báo routes kỷ niệm và sub-routes bình luận
    │   └── memories.md             # Bản tóm tắt nhanh của module
    └── comments/
        ├── comments.schema.js      # Kiểm tra nội dung bình luận bằng Zod
        ├── comments.service.js     # Thêm, phân trang và xóa bình luận trong CSDL
        ├── comments.controller.js  # Tiếp nhận request và trả response bình luận
        └── comments.routes.js      # Route riêng cho thao tác DELETE /api/comments/:id
```

### Phân công nhiệm vụ:
- **`routes.js`**: Định tuyến URL, gắn middleware kiểm tra quyền đăng nhập (`requireAuth`) hoặc nhận diện danh tính tùy chọn (`optionalAuth`).
- **`schema.js`**: Xác thực tính hợp lệ của dữ liệu đầu vào (độ dài ký tự, định dạng URL ảnh, số nguyên ID).
- **`service.js`**: Thực thi các truy vấn SQL an toàn bằng Transaction (`BEGIN ... COMMIT`), tính toán đếm like, comment và tìm kiếm từ khóa.
- **`controller.js`**: Trả mã HTTP tương ứng (`201 Created` cho thêm mới, `200 OK` cho đọc/xóa).

---

## 3. Luồng chạy thực tế dưới backend

### 3.1. Luồng tạo bài viết kỷ niệm kèm nhiều ảnh
1. Request gửi lên `POST /api/memories` kèm token xác thực.
2. Middleware kiểm tra đăng nhập và Zod schema kiểm tra dữ liệu (`content` 1-3000 ký tự, `imageUrls` tối đa 5 ảnh).
3. Service mở **Database Transaction**:
   - Thao tác 1: `INSERT INTO memories` để lấy `memory_id` mới.
   - Thao tác 2: Chạy vòng lặp hoặc truy vấn ghép nối để `INSERT INTO memory_images` cho tất cả URL ảnh gửi lên.
   - Hoàn tất: `COMMIT`. Nếu có bất kỳ lỗi nào xảy ra trong quá trình lưu ảnh, toàn bộ thao tác được `ROLLBACK` để tránh dữ liệu rác.

### 3.2. Luồng lấy danh sách bài viết (Newsfeed)
1. Request gửi lên `GET /api/memories` kèm các tham số lọc tùy chọn (`locationId`, `cohort`, `year`, `page`, `limit`).
2. Service thực hiện truy vấn kết hợp:
   - Gom nhóm mảng ảnh bằng `ARRAY_REMOVE(ARRAY_AGG(mi.url), NULL)`.
   - Đếm số lượt thích từ bảng `memory_likes`.
   - Đếm số bình luận từ bảng `comments`.
   - Nếu client gửi kèm token, câu truy vấn tự động kiểm tra `EXISTS(SELECT 1 FROM memory_likes WHERE user_id = $userId)` để trả về cờ `has_liked: true/false`.

### 3.3. Luồng xóa bài viết và bình luận
- Kiểm tra quyền sở hữu: Người thực hiện thao tác xóa phải là tác giả (`user_id === req.user.id`) hoặc tài khoản có quyền quản trị viên (`req.user.role === 'admin'`).
- Bảng CSDL có ràng buộc `ON DELETE CASCADE`: Khi xóa bài viết, toàn bộ hình ảnh, lượt thích và bình luận thuộc bài viết đó sẽ được dọn dẹp tự động.

---

## 4. Dữ liệu trong Cơ sở dữ liệu

Cấu trúc các bảng liên quan trong `backend/db/schema.sql`:

```sql
-- Bảng bài viết kỷ niệm
CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    title VARCHAR(150),
    content TEXT NOT NULL,
    year INT,
    privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'unlisted', 'private')),
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bảng hình ảnh đính kèm (Quan hệ 1-N)
CREATE TABLE memory_images (
    id SERIAL PRIMARY KEY,
    memory_id INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bảng bình luận
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    memory_id INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chỉ mục hỗ trợ tìm kiếm nhanh theo nội dung
CREATE INDEX IF NOT EXISTS idx_memories_content_trgm ON memories USING gin (content gin_trgm_ops);
```

---

## 5. Danh sách các API chi tiết

Tất cả các thông báo lỗi trả về có định dạng chuẩn: `{ "message": "Thông báo lỗi" }`.

Base URL:
- Kỷ niệm: `/api/memories`
- Bình luận: `/api/comments`
- Thả tim: `/api/reactions`

---

### 5.1. Lấy danh sách bài viết kỷ niệm (Newsfeed)
- **Method:** `GET`
- **URL:** `/api/memories`
- **Header:** `Authorization: Bearer <token>` *(tùy chọn, gửi để lấy trạng thái `has_liked`)*
- **Query Parameters:**
  - `page` *(integer, mặc định: 1)*
  - `limit` *(integer, 1 - 50, mặc định: 10)*
  - `locationId` *(integer, tùy chọn)*
  - `locationSlug` *(string, tùy chọn)*
  - `cohort` *(string, tùy chọn)*
  - `year` *(integer, tùy chọn)*
- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "content": "Kỷ niệm những buổi chiều ôn thi tại thư viện trường năm 2017...",
      "year": 2017,
      "created_at": "2026-10-08T13:28:45.533Z",
      "author": {
        "id": 1,
        "display_name": "Cựu học sinh NCT",
        "avatar_url": null,
        "role": "alumni",
        "cohort": "2015-2018",
        "class_name": "12A3"
      },
      "location": {
        "id": 19,
        "name": "Thư viện",
        "slug": "thu-vien"
      },
      "images": [
        "https://res.cloudinary.com/demo/image/upload/sample.jpg"
      ],
      "like_count": 1,
      "comment_count": 1,
      "has_liked": false
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 5.2. Đăng bài viết kỷ niệm mới
- **Method:** `POST`
- **URL:** `/api/memories`
- **Header:** `Authorization: Bearer <token>` *(bắt buộc)*
- **Request Body:**
```json
{
  "content": "Kỷ niệm những buổi chiều ôn thi tại thư viện trường...",
  "locationId": 19,
  "year": 2017,
  "privacy": "public",
  "imageUrls": [
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  ]
}
```
*Lưu ý:* `locationId`, `year`, và `imageUrls` là các trường không bắt buộc.
- **Response (201 Created):**
```json
{
  "message": "Đăng bài viết kỷ niệm thành công",
  "memory": {
    "id": 2,
    "user_id": 1,
    "location_id": 19,
    "title": null,
    "content": "Kỷ niệm những buổi chiều ôn thi tại thư viện trường...",
    "privacy": "public",
    "status": "approved",
    "created_at": "2026-10-08T13:45:00.000Z",
    "images": [
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    ]
  }
}
```

---

### 5.3. Xem chi tiết bài viết
- **Method:** `GET`
- **URL:** `/api/memories/:id`
- **Header:** `Authorization: Bearer <token>` *(tùy chọn)*
- **Response (200 OK):** Trả về đối tượng bài viết tương tự phần tử trong danh sách newsfeed.

---

### 5.4. Xóa bài viết
- **Method:** `DELETE`
- **URL:** `/api/memories/:id`
- **Header:** `Authorization: Bearer <token>` *(bắt buộc, chính chủ hoặc admin)*
- **Response (200 OK):**
```json
{
  "message": "Đã xóa bài viết kỷ niệm thành công"
}
```

---

### 5.5. Lấy danh sách bình luận của bài viết
- **Method:** `GET`
- **URL:** `/api/memories/:id/comments`
- **Query Parameters:**
  - `page` *(integer, mặc định: 1)*
  - `limit` *(integer, 1 - 100, mặc định: 20)*
- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "content": "Nhìn ảnh nhớ thời cấp 3 quá!",
      "created_at": "2026-10-08T13:30:00.000Z",
      "author": {
        "id": 2,
        "display_name": "Người dùng mẫu",
        "avatar_url": null
      }
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

### 5.6. Thêm bình luận
- **Method:** `POST`
- **URL:** `/api/memories/:id/comments`
- **Header:** `Authorization: Bearer <token>` *(bắt buộc)*
- **Request Body:**
```json
{
  "content": "Bài viết xúc động quá!"
}
```
- **Response (201 Created):**
```json
{
  "message": "Đã thêm bình luận",
  "comment": {
    "id": 2,
    "content": "Bài viết xúc động quá!",
    "created_at": "2026-10-08T13:35:00.000Z",
    "author": {
      "id": 1,
      "display_name": "Cựu học sinh NCT",
      "avatar_url": null
    }
  }
}
```

---

### 5.7. Xóa bình luận
- **Method:** `DELETE`
- **URL:** `/api/comments/:id`
- **Header:** `Authorization: Bearer <token>` *(bắt buộc, chính chủ hoặc admin)*
- **Response (200 OK):**
```json
{
  "message": "Đã xóa bình luận thành công"
}
```

---

### 5.8. Thả tim / Bỏ tim bài viết (Toggle Like)
- **Method:** `POST`
- **URL:** `/api/reactions/memories/:id/toggle`
- **Header:** `Authorization: Bearer <token>` *(bắt buộc)*
- **Response (200 OK):**
```json
{
  "liked": true,
  "count": 25
}
```

---

## 6. Hướng dẫn test nhanh bằng cURL

```bash
# 1. Lấy danh sách newsfeed kỷ niệm
curl http://localhost:3000/api/memories

# 2. Lọc bài viết theo slug địa điểm
curl "http://localhost:3000/api/memories?locationSlug=thu-vien"

# 3. Đăng bài viết kỷ niệm mới (yêu cầu Token)
curl -X POST http://localhost:3000/api/memories \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Kỷ niệm xưa gắn bó","locationId":19,"imageUrls":["https://res.cloudinary.com/demo/image/upload/sample.jpg"]}'

# 4. Thả tim hoặc bỏ tim bài viết
curl -X POST http://localhost:3000/api/reactions/memories/1/toggle \
  -H "Authorization: Bearer <TOKEN>"

# 5. Thêm bình luận vào bài viết
curl -X POST http://localhost:3000/api/memories/1/comments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bình luận thử nghiệm"}'
```

---

## 7. Gợi ý cho Frontend

### 7.1. Cấu hình API Client (`src/api/memories.js`)
```javascript
import client from './client';

export const memoriesApi = {
  list: (params) => client.get('/api/memories', { params }).then(res => res.data),
  getById: (id) => client.get(`/api/memories/${id}`).then(res => res.data),
  create: (payload) => client.post('/api/memories', payload).then(res => res.data),
  delete: (id) => client.delete(`/api/memories/${id}`).then(res => res.data),
  listComments: (memoryId, params) => client.get(`/api/memories/${memoryId}/comments`, { params }).then(res => res.data),
  addComment: (memoryId, content) => client.post(`/api/memories/${memoryId}/comments`, { content }).then(res => res.data),
  deleteComment: (commentId) => client.delete(`/api/comments/${commentId}`).then(res => res.data),
  toggleLike: (memoryId) => client.post(`/api/reactions/memories/${memoryId}/toggle`).then(res => res.data),
};
```

### 7.2. Tối ưu UX & Giao diện
1. **Optimistic UI cho nút Thả tim:**
   - Khi người dùng click, giao diện tự động đảo trạng thái icon và tăng/giảm `like_count` ngay lập tức.
   - Gửi request ngầm lên `POST /api/reactions/memories/:id/toggle`.
   - Nếu lỗi xảy ra, hoàn tác lại trạng thái cũ và hiển thị thông báo nhẹ.
2. **Quy trình tải ảnh:**
   - Upload ảnh lên Cloudinary qua unsigned hoặc signed preset để lấy trực tiếp URL ảnh an toàn.
   - Tập hợp các URL thành một mảng và truyền vào body `imageUrls` khi gửi `POST /api/memories`.
3. **Hiển thị lưới ảnh (Photo Grid):**
   - 1 ảnh: Tỉ lệ 16:9 hoặc tự nhiên.
   - 2 ảnh: Chia đôi 2 cột.
   - 3-4 ảnh: Bố cục lưới 2x2.
   - Hơn 4 ảnh: Ảnh thứ 4 phủ mờ overlay số lượng ảnh còn lại (ví dụ: `+2 ảnh`).
