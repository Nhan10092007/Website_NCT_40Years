# Đặc Tả Kỹ Thuật Module Auth & Users (Xác Thực, Phân Quyền & Quản Lý Tài Khoản)

> **Dự án**: Website Kỷ niệm 40 năm THPT Nguyễn Công Trứ (`Website_NCT_40Years`)  
> **Module**: `auth`, `users` | **Trạng thái**: Hoạt động ổn định  
> **Nền tảng**: Node.js (ES Modules) • Express 5 • PostgreSQL 16+

---

## 1. Mục Tiêu & Phạm Vi Nghiệp Vụ

Hệ thống cung cấp giải pháp nhận thực phân tán không trạng thái (Stateless JWT Authentication) và kiểm soát truy cập dựa trên vai trò (RBAC):
1. **Quản lý danh tính (Authentication)**: Đăng ký thành viên mới, mã hóa mật khẩu một chiều, đăng nhập phát hành JWT Bearer Token, kiểm tra trạng thái phiên làm việc (`/me`).
2. **Kiểm soát quyền truy cập (Authorization & RBAC)**:
   - `Guest`: Quyền xem các dữ liệu công khai (danh sách địa điểm, virtual tour, bài viết đã duyệt).
   - `Authenticated User` (`student`, `alumni`, `teacher`): Quyền đăng bài viết kỷ niệm, bình luận, điểm danh check-in, thả tim.
   - `Admin` (`is_admin = TRUE`): Quyền duyệt bài viết, kiểm duyệt nội dung, quản trị thư viện địa điểm.
3. **Quản lý hồ sơ (User Profiles)**: Cập nhật thông tin cá nhân, cập nhật/xóa avatar, xem hồ sơ công khai của thành viên (ẩn email và hash mật khẩu).
4. **Tự động hóa danh mục niên khóa (Dynamic Cohorts)**: Sinh danh mục niên khóa 3 năm chuẩn theo chu kỳ từ năm 1986 đến nay.

---

## 2. Cấu Trúc Mã Nguồn

```text
backend/src/
├── config/
│   ├── db.js                    # Kết nối cơ sở dữ liệu PostgreSQL (Pool)
│   └── env.js                   # Trích xuất và kiểm tra biến môi trường
├── middlewares/
│   ├── auth.js                  # requireAuth, optionalAuth, requireAdmin
│   ├── rateLimit.js             # Giới hạn tần suất loginLimiter, registerLimiter
│   ├── requireRole.js           # Kiểm tra phân quyền theo vai trò người dùng
│   └── validate.js              # Xác thực schema dữ liệu đầu vào với Zod
├── modules/
│   ├── auth/                    # Module đăng ký, đăng nhập, cấp token
│   │   ├── auth.schema.js
│   │   ├── auth.service.js
│   │   ├── auth.controller.js
│   │   └── auth.routes.js
│   └── users/                   # Module quản lý hồ sơ người dùng
│       ├── users.schema.js
│       ├── users.service.js
│       ├── users.controller.js
│       └── users.routes.js
└── utils/
    ├── appError.js              # Định nghĩa lỗi nghiệp vụ AppError
    └── cohorts.js               # Logic sinh và xác thực niên khóa
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'alumni', 'teacher')),
  cohort        TEXT,
  class_name    TEXT,
  current_city  TEXT,
  job           TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_cohort_class ON users (cohort, class_name);
```

### Ràng buộc & Tiêu chuẩn bảo mật:
- **Băm mật khẩu**: Sử dụng `bcryptjs` với hệ số làm tròn 10 rounds. Giới hạn độ dài mật khẩu đầu vào tối đa 72 ký tự theo đặc tả kỹ thuật của thuật toán Blowfish.
- **Bảo mật truy vấn**: Tuyệt đối không chọn cột `password_hash` trong các truy vấn trả về Client.
- **Quyền Quản trị viên (`is_admin`)**: Mặc định `FALSE`, không cho phép gán đè qua request body.

---

## 4. Danh Sách API Endpoints

### 4.1. Nhóm API Xác Thực (`/api/auth`)

#### A. Danh Mục Niên Khóa
* **Endpoint**: `GET /api/auth/cohorts`
* **Xác thực**: Công khai
* **Response (HTTP 200 OK)**:
  ```json
  ["2026-2029", "2025-2028", "2024-2027", "...", "1986-1989"]
  ```

#### B. Đăng Ký Tài Khoản
* **Endpoint**: `POST /api/auth/register`
* **Xác thực**: Công khai (Giới hạn: 20 request/giờ qua `registerLimiter`)
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123",
    "displayName": "Nguyễn Văn An",
    "role": "alumni",
    "cohort": "2015-2018",
    "className": "12A3",
    "currentCity": "TP.HCM",
    "job": "Kỹ sư phần mềm"
  }
  ```
* **Response (HTTP 201 Created)**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "display_name": "Nguyễn Văn An",
      "role": "alumni",
      "cohort": "2015-2018",
      "class_name": "12A3",
      "is_admin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### C. Đăng Nhập
* **Endpoint**: `POST /api/auth/login`
* **Xác thực**: Công khai (Giới hạn: 10 lần thất bại/15 phút qua `loginLimiter`)
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
* **Response (HTTP 200 OK)**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "display_name": "Nguyễn Văn An",
      "role": "alumni",
      "is_admin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Lỗi Thất Bại (HTTP 401 Unauthorized)**:
  ```json
  { "message": "Email hoặc mật khẩu không chính xác" }
  ```

#### D. Kiểm Tra Trạng Thái Phiên Đăng Nhập
* **Endpoint**: `GET /api/auth/me`
* **Xác thực**: Bắt buộc (`requireAuth`)
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Response (HTTP 200 OK)**: Toàn bộ thông tin hồ sơ của tài khoản đang đăng nhập.

---

### 4.2. Nhóm API Hồ Sơ Người Dùng (`/api/users`)

#### A. Xem Hồ Sơ Cá Nhân
* **Endpoint**: `GET /api/users/me`
* **Xác thực**: Bắt buộc (`requireAuth`)

#### B. Cập Nhật Hồ Sơ Cá Nhân
* **Endpoint**: `PATCH /api/users/me`
* **Xác thực**: Bắt buộc (`requireAuth`)
* **Request Body**:
  ```json
  {
    "displayName": "Nguyễn Văn An",
    "avatarURL": "https://res.cloudinary.com/.../avatar.jpg",
    "currentCity": "Hà Nội",
    "job": "Kiến trúc sư"
  }
  ```
* **Response (HTTP 200 OK)**: Dữ liệu hồ sơ sau khi cập nhật.

#### C. Xem Hồ Sơ Công Khai Thành Viên Khác
* **Endpoint**: `GET /api/users/:id`
* **Xác thực**: Bắt buộc (`requireAuth`)
* **Response (HTTP 200 OK)**:
  ```json
  {
    "id": 2,
    "display_name": "Trần Thị B",
    "role": "alumni",
    "cohort": "2010-2013",
    "class_name": "12 Văn",
    "current_city": "Đà Nẵng",
    "job": "Nhà báo",
    "avatar_url": "https://...",
    "created_at": "2026-10-01T00:00:00.000Z",
    "checkinCount": 9
  }
  ```
  *(Lưu ý: Không bao giờ trả về trường `email` hoặc `password_hash`).*

---

## 5. Mẫu Lệnh Kiểm Thử Kỹ Thuật (cURL)

```bash
# 1. Lấy danh sách niên khóa
curl -X GET http://localhost:3000/api/auth/cohorts

# 2. Đăng ký tài khoản mới
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "displayName": "Người Dùng Thử Nghiệm",
    "role": "student",
    "cohort": "2023-2026",
    "className": "12A1"
  }'

# 3. Đăng nhập hệ thống
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# 4. Kiểm tra phiên đăng nhập
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# 5. Xem hồ sơ công khai thành viên ID 1
curl -X GET http://localhost:3000/api/users/1 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 6. Tiêu Chuẩn Triển Khai Phía Client (Frontend Guidelines)

1. **Quản Lý Token & Axios Interceptor**:
   - Lưu trữ Bearer Token tại `localStorage`.
   - Cấu hình Axios request interceptor tự động gán `Authorization: Bearer <token>` nếu token tồn tại.
   - Cấu hình Axios response interceptor bắt mã lỗi `401 Unauthorized`: thực hiện xóa token và chuyển hướng về `/login`.
2. **Quy Tắc Form Đăng Ký**:
   - Khởi tạo danh sách niên khóa bằng cách gọi `GET /api/auth/cohorts`.
   - Đối với vai trò Giáo viên (`role = 'teacher'`), không gửi trường `cohort` và `className` lên server.