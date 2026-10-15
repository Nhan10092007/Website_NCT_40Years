# Đặc Tả Kỹ Thuật Module Locations (Khuôn Viên Trường & Virtual Tour 360°)

> **Dự án**: Website Kỷ niệm 40 năm THPT Nguyễn Công Trứ (`Website_NCT_40Years`)  
> **Module**: `locations` | **Trạng thái**: Hoạt động ổn định  
> **Nền tảng**: Node.js (ES Modules) • Express 5 • PostgreSQL 16+

---

## 1. Mục Tiêu & Phạm Vi Nghiệp Vụ

Module `locations` quản lý toàn bộ dữ liệu không gian, hình ảnh tư liệu và tọa độ điều hướng ảo của trường:
1. **Không gian trường học (Campus Spaces Library)**: Quản lý danh mục các địa điểm thuộc khuôn viên trường với siêu dữ liệu (tên, slug, phân loại danh mục, mô tả, trạng thái hoạt động).
2. **Tham quan thực tế ảo 360° (Virtual Tour)**: Cung cấp ảnh toàn cảnh equirectangular (`panorama_url`) và các điểm neo chuyển cảnh liên không gian (`location_links`) theo tọa độ radian (`yaw`, `pitch`).
3. **Kho tư liệu Xưa & Nay (Past vs. Present Photos)**: Quản lý bộ sưu tập ảnh phân kỳ lịch sử (`old` kèm năm chụp) và hiện đại (`current`).
4. **Tích hợp tương tác số**: Cung cấp thống kê tổng hợp số lượt check-in, lượt thích, bài viết kỷ niệm và trạng thái cá nhân của người dùng đang đăng nhập.

---

## 2. Cấu Trúc Mã Nguồn

```text
backend/src/modules/locations/
├── locations.schema.js      # Khai báo Zod Schema xác thực dữ liệu đầu vào
├── locations.service.js     # Tầng truy vấn cơ sở dữ liệu và xử lý nghiệp vụ
├── locations.controller.js  # Tầng xử lý HTTP request/response
└── locations.routes.js      # Định tuyến REST API và middleware phân quyền
```

### Phân công trách nhiệm:
- **`locations.schema.js`**: Kiểm tra định dạng `identifier` (số nguyên dương hoặc regex slug), các trường bắt buộc khi tạo/sửa địa điểm, schema ảnh (`kind in ('old', 'current')`, `year`), và schema liên kết hotspot (`yaw`, `pitch` dạng số thực).
- **`locations.service.js`**: Truy vấn từ view `v_locations_detailed`, xử lý hàm `resolveLocation()` hỗ trợ cả ID lẫn Slug, gom nhóm mảng ảnh `photos` (`old`, `current`, `all`), và trích xuất danh sách liên kết `links`.
- **`locations.controller.js`**: Đọc `req.validated_query`, `req.params`, kiểm tra quyền hạn và trả về dữ liệu chuẩn hóa.
- **`locations.routes.js`**: Phân tách rõ ràng giữa Public Endpoints (xem danh sách, xem chi tiết) và Admin Endpoints (`requireAuth`, `requireAdmin`).

---

## 3. Danh Mục Địa Điểm Chuẩn (Catalog Reference)

| ID | Slug Định Danh | Tên Địa Điểm | Danh Mục (`category`) | Mô Tả Ý Nghĩa |
|:---:|---|---|---|---|
| 1 | `cong-truong` | Cổng trường | `community` | Lối vào chính, không gian gắn liền với các thế hệ học sinh |
| 2 | `san-truong` | Sân trường | `community` | Khu vực trung tâm tổ chức lễ chào cờ và hoạt động tập thể |
| 3 | `can-tin` | Căn tin | `facility` | Khu dịch vụ ẩm thực và sinh hoạt ngoại khóa |
| 4 | `bon-cay` | Bồn cây & Ghế đá | `community` | Không gian sinh hoạt ngoài trời dưới tán cây râm mát |
| 5 | `phong-giam-thi` | Phòng giám thị | `admin` | Khu quản lý kỷ luật và nề nếp học sinh |
| 6 | `lop-hoc` | Lớp học | `academic` | Không gian học tập chính khóa |
| 7 | `hanh-lang` | Hành lang | `community` | Lối kết nối giữa các phòng học |
| 8 | `phong-y-te` | Phòng y tế | `facility` | Khu chăm sóc sức khỏe học đường |
| 9 | `san-bong-ro` | Sân bóng rổ | `sports` | Không gian thể thao rèn luyện thể chất |
| 10 | `san-bong-chuyen` | Sân bóng chuyền | `sports` | Khu thể thao phong trào |
| 11 | `san-cau-long` | Sân cầu lông | `sports` | Sân tập luyện sau giờ học |
| 12 | `thu-vien` | Thư viện | `facility` | Trung tâm học liệu, sách và nghiên cứu |

---

## 4. Thiết Kế Cơ Sở Dữ Liệu

```sql
CREATE TABLE IF NOT EXISTS locations (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  panorama_url  TEXT,
  category      TEXT NOT NULL DEFAULT 'general'
                CHECK (category IN ('academic', 'sports', 'facility', 'admin', 'community', 'general')),
  thumbnail_url TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_photos (
  id            SERIAL PRIMARY KEY,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('old', 'current')),
  year          INT
);

CREATE TABLE IF NOT EXISTS location_links (
  id               SERIAL PRIMARY KEY,
  from_location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  yaw              DOUBLE PRECISION NOT NULL,
  pitch            DOUBLE PRECISION NOT NULL,
  UNIQUE (from_location_id, to_location_id)
);

CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_active_sort ON locations(is_active, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_location_photos_location_kind ON location_photos(location_id, kind);
CREATE INDEX IF NOT EXISTS idx_location_links_from_location_id ON location_links(from_location_id);
```

---

## 5. Danh Sách API Endpoints

### 5.1. Danh Sách Toàn Bộ Địa Điểm
* **Endpoint**: `GET /api/locations`
* **Xác thực**: Tùy chọn (`optionalAuth`)
* **Headers**: `Authorization: Bearer <TOKEN>` (tùy chọn)
* **Response (HTTP 200 OK)**:
  ```json
  [
    {
      "id": 2,
      "slug": "san-truong",
      "name": "Sân trường",
      "description": "Nơi diễn ra các buổi chào cờ trang nghiêm...",
      "panorama_url": "/panos/san-truong.jpg",
      "category": "community",
      "thumbnail_url": "https://...",
      "is_active": true,
      "sort_order": 2,
      "checkin_count": 65,
      "like_count": 120,
      "photo_count": 8,
      "memory_count": 30,
      "has_checked_in": true,
      "has_liked": false
    }
  ]
  ```

---

### 5.2. Chi Tiết Địa Điểm & Dữ Liệu Virtual Tour 360°
* **Endpoint**: `GET /api/locations/:identifier`
* **Tham số URL (`:identifier`)**: Số nguyên ID hoặc chuỗi slug (ví dụ: `san-truong`, `2`).
* **Xác thực**: Tùy chọn (`optionalAuth`)
* **Response (HTTP 200 OK)**:
  ```json
  {
    "id": 2,
    "slug": "san-truong",
    "name": "Sân trường",
    "description": "Nơi diễn ra các buổi chào cờ trang nghiêm...",
    "panorama_url": "/panos/san-truong.jpg",
    "category": "community",
    "thumbnail_url": "https://...",
    "stats": {
      "checkin_count": 65,
      "like_count": 120,
      "photo_count": 8,
      "memory_count": 30
    },
    "userStatus": {
      "hasCheckedIn": true,
      "hasLiked": false
    },
    "photos": {
      "all": [...],
      "old": [
        { "id": 1, "url": "https://.../san-truong-1995.jpg", "kind": "old", "year": 1995 }
      ],
      "current": [
        { "id": 2, "url": "https://.../san-truong-2026.jpg", "kind": "current", "year": 2026 }
      ]
    },
    "links": [
      {
        "id": 1,
        "yaw": 3.14,
        "pitch": 0.0,
        "to_id": 1,
        "to_slug": "cong-truong",
        "to_name": "Cổng trường"
      },
      {
        "id": 3,
        "yaw": 1.57,
        "pitch": 0.0,
        "to_id": 3,
        "to_slug": "can-tin",
        "to_name": "Căn tin"
      }
    ]
  }
  ```

---

### 5.3. Nhóm Endpoint Quản Trị (Admin Only)

Tất cả các route yêu cầu Bearer Token với thuộc tính tài khoản `is_admin = TRUE`:

| Method | Endpoint | Yêu Cầu Payload | Mô Tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/locations` | `{ name, slug, description, panoramaUrl, category, thumbnailUrl }` | Khởi tạo địa điểm mới |
| `PATCH` | `/api/locations/:identifier` | Các trường cần cập nhật | Sửa đổi thông tin địa điểm |
| `DELETE`| `/api/locations/:identifier` | Không | Xóa địa điểm khỏi CSDL |
| `POST` | `/api/locations/:identifier/photos` | `{ url, kind, year }` | Bổ sung ảnh tư liệu xưa / nay |
| `DELETE`| `/api/locations/photos/:photoId` | Không | Xóa ảnh tư liệu |
| `POST` | `/api/locations/:identifier/links` | `{ toLocationId, yaw, pitch }` | Thêm điểm chuyển cảnh 360° |
| `DELETE`| `/api/locations/links/:linkId` | Không | Xóa điểm chuyển cảnh 360° |

---

## 6. Mẫu Lệnh Kiểm Thử Kỹ Thuật (cURL)

```bash
# 1. Truy vấn danh sách địa điểm công khai
curl -X GET http://localhost:3000/api/locations

# 2. Truy vấn chi tiết địa điểm theo slug kèm token xác thực
curl -X GET http://localhost:3000/api/locations/san-truong \
  -H "Authorization: Bearer <TOKEN>"

# 3. Tạo mới địa điểm (Quyền Admin)
curl -X POST http://localhost:3000/api/locations \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nhà Thi Đấu Đa Năng",
    "slug": "nha-thi-dau",
    "description": "Khu liên hợp thể thao hiện đại",
    "category": "sports",
    "panoramaUrl": "/panos/nha-thi-dau.jpg"
  }'
```

---

## 7. Tiêu Chuẩn Tích Hợp Frontend

1. **Khởi Tạo PhotoSphereViewer (`TourPage.jsx`)**:
   - Quản trị một instance duy nhất của `Viewer` qua `useRef`.
   - Khi chuyển đổi điểm tham quan, sử dụng phương thức `viewer.setPanorama(newUrl)` kết hợp hiệu ứng chuyển cảnh mượt thay vì hủy và tái tạo WebGL Canvas context.
2. **Vẽ Điểm Neo Chuyển Cảnh (Hotspots)**:
   - Ánh xạ mảng `links` vào `MarkersPlugin` với tọa độ radian `{ yaw: link.yaw, pitch: link.pitch }`.
3. **So Sánh Ảnh Xưa & Nay**:
   - Sử dụng dữ liệu phân nhóm sẵn `photos.old` và `photos.current` cho các component so sánh hình ảnh (Image Comparison Slider).
