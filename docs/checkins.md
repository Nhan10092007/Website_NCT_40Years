# Đặc Tả Kỹ Thuật Module Check-ins (Điểm Danh Khuôn Viên & Huy Hiệu Kỷ Niệm)

> **Dự án**: Website Kỷ niệm 40 năm THPT Nguyễn Công Trứ (`Website_NCT_40Years`)  
> **Module**: `checkins` | **Trạng thái**: Hoạt động ổn định  
> **Nền tảng**: Node.js (ES Modules) • Express 5 • PostgreSQL 16+

---

## 1. Mục Tiêu & Phạm Vi Nghiệp Vụ

Module `checkins` chịu trách nhiệm số hóa dấu ấn hành trình của các thế hệ học sinh và giáo viên tại khuôn viên trường:
1. **Ghi nhận dấu ấn tương tác (Campus Footprints)**: Cho phép người dùng đánh dấu check-in tại các địa điểm thuộc thư viện không gian trường học.
2. **Bộ lọc kết nối cộng đồng (Community Cohort Filtering)**: Trích xuất danh sách khách ghé thăm một địa điểm theo niên khóa (`cohort`) và lớp học (`className`).
3. **Tiến độ khám phá & Huy hiệu động (Dynamic Progress & Badges)**: Tự động tính toán tỷ lệ % hoàn thành lộ trình tham quan dựa trên số địa điểm thực tế đang kích hoạt (`is_active = TRUE`), cấp phát danh hiệu tương ứng.
4. **Bảng xếp hạng (Leaderboards)**: Thống kê địa điểm được ghé thăm nhiều nhất và xếp hạng người dùng tích cực khám phá nhất.

---

## 2. Kiến Trúc & Cấu Trúc Mã Nguồn

```text
backend/src/modules/checkins/
├── checkins.schema.js      # Khai báo Zod Schema xác thực params & query
├── checkins.service.js     # Tầng nghiệp vụ, truy vấn CSDL và tính toán huy hiệu
├── checkins.controller.js  # Tầng điều phối HTTP request/response
└── checkins.routes.js      # Định tuyến REST API và gắn middleware
```

### Phân công trách nhiệm:
- **`checkins.schema.js`**: Xác thực `locationIdentifierParamSchema` (hỗ trợ số nguyên dương hoặc chuỗi slug), `visitorsQuerySchema` (`cohort`, `className`, `page`, `limit`), và `leaderboardQuerySchema`.
- **`checkins.service.js`**: Thực thi hàm stored procedure nguyên tử `toggle_checkin(userId, locationId)`, tích hợp hàm tái sử dụng `resolveLocation()` từ module `locations`, tính toán tiến độ dựa trên `SELECT COUNT(*)::int FROM locations WHERE is_active = TRUE`.
- **`checkins.controller.js`**: Trích xuất dữ liệu xác thực từ `req.validated_query`, ánh xạ dữ liệu và trả JSON chuẩn hóa.
- **`checkins.routes.js`**: Quản lý đường dẫn, áp dụng middleware kiểm soát bảo mật `requireAuth` và `optionalAuth`.

---

## 3. Thiết Kế Cơ Sở Dữ Liệu

```sql
CREATE TABLE IF NOT EXISTS checkins (
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_location_id ON checkins (location_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins (created_at DESC);
```

### Ràng buộc kỹ thuật:
- **Khóa chính kết hợp (`PRIMARY KEY (user_id, location_id)`)**: Đảm bảo mỗi tài khoản chỉ tồn tại tối đa một lượt check-in tại mỗi địa điểm.
- **Xử lý xung đột đồng thời (Concurrency Control)**: Bắt mã lỗi PostgreSQL `23505` (Unique Violation) để phản hồi mã HTTP `409 Conflict` nếu có xung đột mạng hoặc thao tác gửi kép.
- **Cascade Deletion**: Tự động giải phóng bản ghi check-in khi xóa tài khoản hoặc địa điểm.

---

## 4. Bảng Quy Đổi Huy Hiệu Tiến Độ (Dynamic Badges)

Tiến độ khám phá được tính theo công thức:
$$\text{Tỷ lệ (\%)} = \left\lfloor \frac{\text{Số địa điểm đã check-in}}{\text{Tổng số địa điểm đang kích hoạt}} \times 100 \right\rfloor$$

| Số Điểm Check-in | Tỷ Lệ Hoàn Thành | Mã Danh Hiệu | Tên Huy Hiệu Hiển Thị |
|:---:|:---:|:---:|---|
| **0 điểm** | 0% | `NONE` | *Chưa bắt đầu hành trình* |
| **1 điểm - dưới 40%** | < 40% | `ROOKIE` | 🌱 **Tân binh khám phá** |
| **40% - dưới 80%** | 40% - 79% | `MEMORIES` | 🌿 **Dấu ấn tuổi xanh** |
| **80% - dưới 100%** | 80% - 99% | `VETERAN` | ⭐ **Kỷ niệm thân quen** |
| **100% toàn trường** | 100% | `EXPLORER` | 🏆 **NCT Explorer - Trọn Vẹn Thanh Xuân** |

---

## 5. Danh Sách API Endpoints

### 5.1. Thao Tác Toggle Check-in (Khuyên Dùng Cho Client)
* **Endpoint**: `POST /api/checkins/:identifier/toggle`
* **Xác thực**: Bắt buộc (`requireAuth`)
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Tham số URL (`:identifier`)**: Số nguyên ID (ví dụ `2`) hoặc slug (ví dụ `san-truong`).
* **Response (HTTP 200 OK)**:
  * Khi Check-in:
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
  * Khi Hủy Check-in:
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

### 5.2. Thống Kê Lượt Check-in Của Địa Điểm
* **Endpoint**: `GET /api/checkins/location/:identifier`
* **Xác thực**: Tùy chọn (`optionalAuth`)
* **Response (HTTP 200 OK)**:
  ```json
  {
    "locationId": 2,
    "locationName": "Sân trường",
    "locationSlug": "san-truong",
    "count": 42,
    "hasCheckedIn": true
  }
  ```

---

### 5.3. Danh Sách Khách Ghé Thăm (Lọc Theo Niên Khóa & Lớp)
* **Endpoint**: `GET /api/checkins/location/:identifier/visitors`
* **Xác thực**: Công khai
* **Query Parameters**:
  * `cohort` (string, tùy chọn): Niên khóa (ví dụ: `2015-2018`).
  * `className` (string, tùy chọn): Lớp học (ví dụ: `12A3`).
  * `page` (number, mặc định `1`): Số trang.
  * `limit` (number, mặc định `20`, tối đa `50`): Số bản ghi/trang.
* **Response (HTTP 200 OK)**:
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

### 5.4. Thống Kê Cơ Cấu Niên Khóa Tại Địa Điểm
* **Endpoint**: `GET /api/checkins/location/:identifier/cohorts`
* **Xác thực**: Công khai
* **Response (HTTP 200 OK)**:
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

### 5.5. Tiến Độ Khám Phá Cá Nhân & Huy Hiệu
* **Endpoint**: `GET /api/checkins/me/summary`
* **Xác thực**: Bắt buộc (`requireAuth`)
* **Response (HTTP 200 OK)**:
  ```json
  {
    "progress": {
      "checkedCount": 8,
      "totalLocations": 12,
      "percentage": 67,
      "badge": "Dấu ấn tuổi xanh 🌿"
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
        "name": "Bồn cây & Ghế đá",
        "description": "Không gian sinh hoạt ngoài trời..."
      }
    ]
  }
  ```

---

### 5.6. Bảng Xếp Hạng (Leaderboards)
* **Top địa điểm được check-in nhiều nhất**: `GET /api/checkins/leaderboard/locations?limit=5`
* **Top thành viên tích cực khám phá nhất**: `GET /api/checkins/leaderboard/explorers?limit=10`

---

## 6. Mẫu Lệnh Kiểm Thử Kỹ Thuật (cURL)

```bash
# 1. Thao tác toggle check-in địa điểm Sân trường
curl -X POST http://localhost:3000/api/checkins/san-truong/toggle \
  -H "Authorization: Bearer <TOKEN>"

# 2. Truy vấn thống kê check-in Sân trường
curl -X GET http://localhost:3000/api/checkins/location/san-truong

# 3. Lọc danh sách khách ghé thăm thuộc khóa 2015-2018
curl -X GET "http://localhost:3000/api/checkins/location/san-truong/visitors?cohort=2015-2018&page=1&limit=10"

# 4. Lấy tóm tắt tiến độ cá nhân và danh hiệu đạt được
curl -X GET http://localhost:3000/api/checkins/me/summary \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 7. Yêu Cầu Tích Hợp Giao Diện (Frontend Guidelines)

1. **Giao Diện Nút Điểm Danh**:
   - Sử dụng duy nhất endpoint `POST /api/checkins/:identifier/toggle` để điều khiển trạng thái nút.
   - Ứng dụng mô hình Optimistic UI: đổi màu nút và tăng/giảm counter tức thời, rollback khi có lỗi mạng.
2. **Khởi Tạo Tiến Độ Trên Trang Cá Nhân**:
   - Sử dụng trường `percentage` từ `GET /api/checkins/me/summary` để hiển thị thanh tiến độ `ProgressBar`.
   - Liệt kê mảng `unvisitedLocations` để gợi ý các địa điểm tiếp theo cần khám phá trong Virtual Tour.
