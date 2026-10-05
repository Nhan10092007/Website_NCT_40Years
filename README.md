# Website NCT 40 Years

Dự án website kỷ niệm 40 năm NCT, xây dựng theo kiến trúc tách biệt Frontend (Vite) và Backend (Node.js API) kết nối cơ sở dữ liệu SQL.

---

## Cấu trúc dự án (Project Structure)

```text
Website_NCT_40Years/
├── backend/                  # RESTful API Server (Node.js)
│   ├── db/
│   │   └── schema.sql       # Script khởi tạo cơ sở dữ liệu & bảng
│   ├── src/                 # Mã nguồn backend (Controllers, Routes, Models, Services)
│   ├── .env                 # Cấu hình môi trường backend (PORT, DB URI, Secret Keys, ...)
│   ├── .env.example         # Mẫu cấu hình môi trường backend
│   ├── package.json         # Danh sách thư viện và scripts backend
│   └── package-lock.json
│
├── frontend/                 # Client Web Application (Vite + React/Vue/Vanilla)
│   ├── public/              # Tài nguyên tĩnh (Favicon, Logo, Images)
│   ├── src/                 # Mã nguồn giao diện (Components, Pages, Assets, Styles)
│   ├── index.html           # File HTML gốc của Vite
│   ├── vite.config.js       # File cấu hình Vite build & dev server
│   ├── eslint.config.js     # Cấu hình kiểm tra cú pháp code (ESLint Flat Config)
│   ├── .env                 # Biến môi trường frontend (VITE_API_URL, ...)
│   ├── .env.example         # Mẫu biến môi trường frontend
│   ├── package.json         # Danh sách thư viện và scripts frontend
│   └── package-lock.json
│
├── .gitignore                # Danh sách file/thư mục bỏ qua khi commit Git
└── README.md                 # Tài liệu hướng dẫn dự án
```

---

## Yêu cầu hệ thống (Prerequisites)

* **Node.js**: Phiên bản 18.x hoặc 20.x LTS trở lên.
* **NPM**: Hoặc Yarn / PNPM.
* **Database**: Hệ quản trị CSDL tương ứng với `backend/db/schema.sql` (ví dụ: PostgreSQL hoặc MySQL) đang hoạt động.

---

## Hướng dẫn cài đặt & Khởi chạy cục bộ (Getting Started)

### 1. Khởi tạo Cơ sở dữ liệu (Database)
1. Mở CSDL của bạn (PostgreSQL qua pgAdmin / psql hoặc MySQL qua Workbench / DBeaver).
2. Tạo database mới (ví dụ: `nct_40years_db`).
3. Chạy toàn bộ lệnh từ file script để tạo schema và dữ liệu mẫu:
   ```bash
   # Nếu dùng PostgreSQL:
   psql -U postgres -d nct_40years_db -f backend/db/schema.sql
   ```

---

### 2. Thiết lập Backend

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các gói phụ thuộc (dependencies):
   ```bash
   npm install
   ```
3. Tạo file biến môi trường từ mẫu:
   ```bash
   cp .env.example .env
   ```
4. Mở file `.env` và cập nhật thông số kết nối CSDL cùng PORT:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:password@localhost:5432/nct_40years_db
   # Hoặc cấu hình riêng lẻ:
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_USER=postgres
   # DB_PASSWORD=your_password
   # DB_NAME=nct_40years_db
   ```
5. Khởi chạy Backend Server:
   ```bash
   npm run dev
   # hoặc: npm start
   ```
   > Backend sẽ chạy mặc định tại: `http://localhost:5000` (hoặc cổng cấu hình trong `.env`).

---

### 3. Thiết lập Frontend

1. Mở một terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file biến môi trường:
   ```bash
   cp .env.example .env
   ```
4. Cập nhật URL kết nối API trong `.env` (nếu có):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
5. Khởi chạy môi trường phát triển (Development):
   ```bash
   npm run dev
   ```
   > Truy cập trình duyệt theo đường dẫn hiển thị trên terminal (mặc định: `http://localhost:5173`).

---

## Kịch bản lệnh (Scripts)

| Vị trí | Lệnh | Mô tả |
| :--- | :--- | :--- |
| **Backend** | `npm run dev` | Khởi chạy server API chế độ theo dõi (nodemon/watch mode) |
| **Backend** | `npm start` | Chạy server chế độ Production |
| **Frontend** | `npm run dev` | Bật Vite Dev Server với tính năng Hot Module Replacement (HMR) |
| **Frontend** | `npm run build` | Đóng gói mã nguồn ra thư mục `dist/` để deploy |
| **Frontend** | `npm run lint` | Kiểm tra lỗi cú pháp bằng ESLint |