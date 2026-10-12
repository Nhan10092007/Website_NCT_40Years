# Module Tìm kiếm (Search) - Website Kỷ niệm 40 năm NCT

Tài liệu hướng dẫn chi tiết về cấu trúc backend, nghiệp vụ và cách tích hợp API **Tìm kiếm (Search)** của website Kỷ niệm 40 năm THPT Nguyễn Công Trứ.

---

## 1. Mục đích module

Tính năng tìm kiếm phục vụ các nhu cầu tìm kiếm nhanh của cựu học sinh, học sinh và thầy cô:
1. **Tìm bạn bè / Thầy cô (`users`)**:
   - Lọc theo **Niên khóa (`cohort`)** (ví dụ: `K35`, `2015-2018`).
   - Lọc theo **Tên lớp (`className`)** (ví dụ: `12A1`, `12 Tin`).
   - Lọc theo **Vai trò (`role`)** (`student`, `alumni`, `teacher`).
   - Tìm kiếm theo từ khóa tên (`displayName`), nghề nghiệp (`job`), hoặc thành phố (`currentCity`).
2. **Tìm góc trường kỷ niệm (`locations`)**:
   - Tìm theo tên địa điểm (ví dụ: *Căn tin, Thư viện, Cột cờ, Bồn cây*).
   - Tìm theo mô tả góc trường trong Tour 360°.
3. **Tìm bài viết kỷ niệm (`memories`)**:
   - Tìm bài viết kỷ niệm đã được duyệt (`status = 'approved'`).
   - Lọc theo từ khóa nội dung, năm kỷ niệm (`year`), niên khóa hoặc lớp của tác giả.
4. **Tìm kiếm tổng hợp (Unified Search - `type=all`)**:
   - Một ô tìm kiếm chung trả về top kết quả phù hợp nhất từ cả 3 danh mục (Users, Locations, Memories).

---

## 2. Cấu trúc thư mục

```
backend/src/
├── app.js                          # Đăng ký route /api/search
└── modules/
    └── search/
        ├── search.schema.js        # Validate query parameters với Zod
        ├── search.service.js       # Các câu truy vấn PostgreSQL với ILIKE và phân trang
        ├── search.controller.js    # Điều hướng kết quả theo type (all, users, locations, memories)
        └── search.routes.js        # Endpoint GET /api/search
```

---

## 3. Danh sách API Endpoints

### 3.1. Tìm kiếm tổng hợp (Unified Search)

* **Endpoint**: `GET /api/search`
* **Quyền hạn**: Công khai (Không cần đăng nhập)
* **Query Parameters**:
  - `q` (string, tùy chọn): Từ khóa tìm kiếm (tối đa 100 ký tự).
  - `type` (string, mặc định `all`): `all` | `users` | `locations` | `memories`.
  - `cohort` (string, tùy chọn): Lọc theo niên khóa (ví dụ: `K35`).
  - `className` (string, tùy chọn): Lọc theo lớp (ví dụ: `12A1`).
  - `role` (string, tùy chọn): `student` | `alumni` | `teacher`.
  - `year` (number, tùy chọn): Năm kỷ niệm (1986 - 2030).
  - `page` (number, mặc định `1`): Số trang (áp dụng khi type khác `all`).
  - `limit` (number, mặc định `10`): Số lượng mỗi trang (tối đa 50).

#### Response mẫu khi `type=all`:
```json
{
  "query": "nguyen",
  "type": "all",
  "results": {
    "users": [
      {
        "id": 1,
        "display_name": "Nguyễn Văn A",
        "role": "alumni",
        "cohort": "K35",
        "class_name": "12A1",
        "current_city": "TP.HCM",
        "job": "Kỹ sư",
        "avatar_url": "https://res.cloudinary.com/...",
        "created_at": "2026-10-01T00:00:00.000Z"
      }
    ],
    "locations": [
      {
        "id": 1,
        "slug": "san-truong",
        "name": "Sân trường trung tâm",
        "description": "Nơi diễn ra lễ chào cờ thứ hai hàng tuần...",
        "panorama_url": "https://...",
        "checkin_count": 42,
        "like_count": 128
      }
    ],
    "memories": [
      {
        "id": 5,
        "content": "Nhớ những ngày ôn thi đại học cùng 12A1...",
        "year": 2018,
        "location_id": 1,
        "location_name": "Sân trường trung tâm",
        "location_slug": "san-truong",
        "author_id": 1,
        "author_name": "Nguyễn Văn A",
        "author_avatar": "https://...",
        "author_role": "alumni",
        "author_cohort": "K35",
        "author_class": "12A1",
        "images": ["https://..."]
      }
    ],
    "totals": {
      "users": 15,
      "locations": 1,
      "memories": 8
    }
  }
}
```

---

### 3.2. Tìm kiếm chuyên sâu từng mục (Có phân trang)

#### A. Tìm kiếm cựu học sinh & thầy cô
`GET /api/search?type=users&cohort=K35&className=12A1&page=1&limit=20`

Response:
```json
{
  "query": null,
  "type": "users",
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "totalPages": 2
  }
}
```

#### B. Tìm kiếm địa điểm trường
`GET /api/search?type=locations&q=can+tin`

Response:
```json
{
  "query": "can tin",
  "type": "locations",
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### C. Tìm kiếm bài viết kỷ niệm
`GET /api/search?type=memories&q=thay+co&year=2015&page=1&limit=10`

Response:
```json
{
  "query": "thay co",
  "type": "memories",
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
}
```

---

## 4. Bảo mật & Hiệu năng
- **Bảo mật**: Tuyệt đối không chọn trường `password_hash` hay `email` trong kết quả tìm kiếm public của người dùng.
- **Duyệt bài viết**: Chỉ những kỷ niệm có trạng thái `status = 'approved'` mới được xuất hiện trong kết quả tìm kiếm.
- **SQL Injection**: Toàn bộ tham số tìm kiếm được tham số hóa thông qua Parameterized Queries (`$1`, `$2`, ...) của thư viện `pg`.
