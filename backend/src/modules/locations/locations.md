# Module Locations: Không Gian Trường, Kho Ảnh Xưa & Nay & Tour Ảo 360°

Tài liệu nội bộ module `locations` — tóm tắt nhanh cho lập trình viên backend và frontend.

---

## 1. Mục đích module
1. Quản lý thông tin và cảm xúc gắn liền với 11 góc trường THPT Nguyễn Công Trứ.
2. Lưu trữ dữ liệu ảnh toàn cảnh 360° (`panorama_url`) và các điểm chuyển cảnh liên kết giữa các địa điểm (`yaw`, `pitch`).
3. Lưu trữ kho ảnh tư liệu phân theo 2 giai đoạn: Ảnh xưa (`old`) có kèm năm chụp và Ảnh nay (`current`).
4. Tổng hợp các số liệu tương tác (số check-in, số lượt thích, số kỷ niệm) và trạng thái cá nhân của người xem.

---

## 2. Bảng CSDL (`backend/db/schema.sql`)
```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    panorama_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE location_photos (
    id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('old', 'current')),
    year INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE location_links (
    id SERIAL PRIMARY KEY,
    from_location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    to_location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    yaw NUMERIC(5, 2) NOT NULL,
    pitch NUMERIC(5, 2) NOT NULL
);
```

---

## 3. Danh sách Endpoints chính (`/api/locations`)

| Method | Endpoint | Quyền (Auth) | Mô tả |
|:---:|---|:---:|---|
| `GET` | `/` | Công khai | Lấy danh sách 11 địa điểm kèm số lượt check-in, like, photo, memory. |
| `GET` | `/:identifier` | Công khai | Lấy chi tiết 1 địa điểm theo Slug hoặc ID: gồm ảnh xưa/nay và liên kết 360°. |
| `POST` | `/` | `requireAdmin` | Thêm địa điểm mới. |
| `PATCH` | `/:identifier` | `requireAdmin` | Cập nhật thông tin địa điểm. |
| `DELETE`| `/:identifier` | `requireAdmin` | Xóa địa điểm (tự động xóa cả ảnh và liên kết 360°). |
| `POST` | `/:identifier/photos` | `requireAdmin` | Thêm ảnh tư liệu (`old` / `current`). |
| `DELETE`| `/photos/:photoId` | `requireAdmin` | Xóa ảnh tư liệu. |
| `POST` | `/:identifier/links` | `requireAdmin` | Thêm điểm chuyển cảnh 360° (Hotspot). |
| `DELETE`| `/links/:linkId` | `requireAdmin` | Xóa điểm chuyển cảnh. |

Xem tài liệu đầy đủ tại file: [locations.md](../../../../locations.md) ở thư mục gốc.
