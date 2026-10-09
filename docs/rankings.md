# Phần Rankings: Bảng Xếp Hạng & Vinh Danh (NCT 40 Năm)

Tài liệu kỹ thuật giải thích toàn bộ logic backend của module **Bảng xếp hạng (Rankings)** (Express, ES Modules, PostgreSQL).

---

## 1. Mục đích module

Module Rankings phục vụ thống kê và tạo động lực tương tác cho người dùng:
1. **Xếp hạng địa điểm:** Thống kê các góc trường nhận được nhiều sự quan tâm nhất qua lượt check-in, lượt thích và bài viết kỷ niệm.
2. **Vinh danh nhà thám hiểm:** Xếp hạng người dùng đã check-in nhiều địa điểm nhất trong trường (tối đa 11 địa điểm).
3. **Đua top niên khóa:** Thống kê và xếp hạng các niên khóa có số lượng check-in nhiều nhất để tạo sự gắn kết giữa các thế hệ cựu học sinh.
4. **Tổng quan trang chủ:** Cung cấp dữ liệu tóm tắt (Top 5 mỗi bảng) cho trang chủ mà không cần gọi nhiều API rời rạc.

---

## 2. Cấu trúc thư mục & nhiệm vụ từng file

Mã nguồn nằm tại `backend/src/modules/rankings/`:

```
backend/src/
├── app.js                              # Đăng ký route /api/rankings
└── modules/
    └── rankings/
        ├── rankings.schema.js          # Kiểm tra tham số truy vấn (limit, sortBy) bằng Zod
        ├── rankings.service.js         # Truy vấn SQL tổng hợp từ view và các bảng liên quan
        ├── rankings.controller.js      # Nhận request, gọi service, trả response JSON
        ├── rankings.routes.js          # Định nghĩa endpoint công khai (Public)
        └── rankings.md                 # Tài liệu tóm tắt nội bộ module
```

### Phân công nhiệm vụ:
- **`rankings.routes.js`**: Khai báo các đường dẫn URL. Tất cả endpoint đều mở công khai (không bắt buộc đăng nhập).
- **`rankings.schema.js`**: Kiểm tra tham số `limit` (từ 1 đến 50) và `sortBy` (`checkins`, `likes`, `popular`).
- **`rankings.service.js`**: Tối ưu hóa truy vấn bằng cách đọc trực tiếp từ database view `v_locations_detailed` và câu lệnh gom nhóm (`GROUP BY`), tránh tính toán thủ công trên tầng ứng dụng.
- **`rankings.controller.js`**: Bọc `asyncHandler`, trả dữ liệu chuẩn HTTP 200.

---

## 3. Luồng tính toán & Quy tắc xếp hạng backend

### 3.1. Xếp hạng địa điểm (`getTopLocations`)
- Hỗ trợ các tiêu chí sắp xếp:
  - `checkins`: Ưu tiên số lượt check-in giảm dần.
  - `likes`: Ưu tiên số lượt thích giảm dần.
  - `popular`: Sắp xếp theo tổng `(checkin_count + like_count)` giảm dần.
- Dữ liệu được lấy trực tiếp từ database view `v_locations_detailed`, đảm bảo phản ánh số liệu tức thời.

### 3.2. Xếp hạng nhà thám hiểm (`getTopExplorers`)
- Đếm số lượng góc trường độc nhất mà mỗi người dùng đã check-in (`COUNT(c.location_id)`).
- Sắp xếp giảm dần theo số địa điểm đã ghé thăm. Trường hợp bằng điểm, tài khoản đăng ký sớm hơn (`u.id ASC`) được xếp trước.

### 3.3. Xếp hạng niên khóa (`getTopCohorts`)
- Gom nhóm theo trường `cohort` của bảng `users` (ví dụ: `2015-2018`, `2023-2026`).
- Chỉ tính các tài khoản có thông tin niên khóa hợp lệ (`cohort IS NOT NULL AND TRIM(cohort) != ''`).
- Tính tổng số thành viên tham gia (`member_count`) và tổng lượt check-in của cả khóa (`total_checkins`).

---

## 4. Dữ liệu Cơ sở dữ liệu & Views liên quan

Module sử dụng dữ liệu từ các bảng cốt lõi và view tổng hợp:

```sql
-- View tổng hợp số liệu địa điểm (backend/db/schema.sql)
CREATE OR REPLACE VIEW v_locations_detailed AS
SELECT 
    l.*,
    COALESCE(c.checkin_count, 0)::int AS checkin_count,
    COALESCE(lk.like_count, 0)::int AS like_count,
    COALESCE(p.photo_count, 0)::int AS photo_count,
    COALESCE(m.memory_count, 0)::int AS memory_count
FROM locations l
...
```

**Lợi ích:** Không cần join nhiều bảng lặp đi lặp lại khi người dùng truy cập bảng xếp hạng, giảm tải tối đa cho PostgreSQL.

---

## 5. Danh sách các API chi tiết

Tất cả các API đều dùng phương thức `GET`, không bắt buộc token xác thực.

Base URL: `/api/rankings`

### 5.1. Dữ liệu tổng quan (Overview)
- **Method:** `GET`
- **URL:** `/api/rankings/overview`
- **Response (200 OK):**
```json
{
  "topLocations": [
    {
      "id": 5,
      "slug": "phong-giam-thi",
      "name": "Phòng giám thị",
      "category": "admin",
      "thumbnail_url": "/thumbnails/phong-giam-thi.jpg",
      "checkin_count": 12,
      "like_count": 25,
      "photo_count": 2,
      "memory_count": 4
    }
  ],
  "topExplorers": [
    {
      "id": 1,
      "display_name": "Cựu học sinh NCT",
      "avatar_url": null,
      "role": "alumni",
      "cohort": "2015-2018",
      "class_name": "12A3",
      "visited_count": 11
    }
  ],
  "topCohorts": [
    {
      "cohort": "2015-2018",
      "member_count": 14,
      "total_checkins": 48
    }
  ]
}
```

### 5.2. Bảng xếp hạng Địa điểm
- **Method:** `GET`
- **URL:** `/api/rankings/locations`
- **Query Parameters:**
  - `sortBy` *(tuỳ chọn, string)*: `checkins` (mặc định), `likes`, `popular`.
  - `limit` *(tuỳ chọn, integer)*: 1 - 50 (mặc định 10).
- **Response (200 OK):**
```json
[
  {
    "id": 5,
    "slug": "phong-giam-thi",
    "name": "Phòng giám thị",
    "category": "admin",
    "thumbnail_url": "/thumbnails/phong-giam-thi.jpg",
    "checkin_count": 12,
    "like_count": 25,
    "photo_count": 2,
    "memory_count": 4
  }
]
```

### 5.3. Bảng xếp hạng Nhà thám hiểm
- **Method:** `GET`
- **URL:** `/api/rankings/explorers`
- **Query Parameters:**
  - `limit` *(tuỳ chọn, integer)*: 1 - 50 (mặc định 10).
- **Response (200 OK):**
```json
[
  {
    "id": 1,
    "display_name": "Cựu học sinh NCT",
    "avatar_url": null,
    "role": "alumni",
    "cohort": "2015-2018",
    "class_name": "12A3",
    "visited_count": 11
  }
]
```

### 5.4. Bảng xếp hạng Niên khóa
- **Method:** `GET`
- **URL:** `/api/rankings/cohorts`
- **Query Parameters:**
  - `limit` *(tuỳ chọn, integer)*: 1 - 50 (mặc định 10).
- **Response (200 OK):**
```json
[
  {
    "cohort": "2015-2018",
    "member_count": 14,
    "total_checkins": 48
  }
]
```

---

## 6. Hướng dẫn test nhanh bằng cURL

```bash
# 1. Lấy dữ liệu tổng quan cho trang chủ
curl http://localhost:3000/api/rankings/overview

# 2. Lấy top 5 địa điểm được yêu thích nhất
curl "http://localhost:3000/api/rankings/locations?sortBy=likes&limit=5"

# 3. Lấy top 10 người dùng check-in nhiều nhất
curl "http://localhost:3000/api/rankings/explorers?limit=10"

# 4. Lấy top niên khóa năng nổ nhất
curl "http://localhost:3000/api/rankings/cohorts?limit=10"
```

---

## 7. Gợi ý cho Frontend

### 7.1. Cấu hình API Client (`src/api/rankings.js`)
```javascript
import client from './client';

export const rankingsApi = {
  getOverview: () => client.get('/api/rankings/overview').then(res => res.data),
  getLocations: (params) => client.get('/api/rankings/locations', { params }).then(res => res.data),
  getExplorers: (params) => client.get('/api/rankings/explorers', { params }).then(res => res.data),
  getCohorts: (params) => client.get('/api/rankings/cohorts', { params }).then(res => res.data),
};
```

### 7.2. Xử lý giao diện (UI/UX)
- **Huy hiệu Top 3:** Dùng index mảng `[0, 1, 2]` để gán biểu tượng Huy chương Vàng 🥇, Bạc 🥈, Đồng 🥉.
- **Tiến độ khám phá:** Tính tỷ lệ phần trăm theo công thức:
  $$\text{Progress} = \min\left(100, \text{round}\left(\frac{\text{visited\_count}}{11} \times 100\right)\right)$$
- **Tối ưu hiển thị:** Dữ liệu rankings mang tính tổng hợp, nên cache phía client (hoặc dùng React Query với `staleTime: 60000`) để hạn chế gọi lại API liên tục.
