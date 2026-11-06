# Chuyến tàu tiếp nối – 40 năm NCT · Frontend handoff

Bản HTML/CSS/JS thuần (không framework, không build) của prototype đã duyệt, **sắp xếp theo đúng các module backend**:
`admin · auth · checkins · comments · locations · memories · rankings · reactions · search · users`.

Mở `index.html` trực tiếp bằng trình duyệt là chạy được (kể cả `file://`). Dữ liệu hiện chạy bằng **mock trong `src/core/api.js` + `src/core/mock-data.js`** (lưu localStorage) — trên giao diện có nhãn “Dữ liệu mẫu”.

Tài khoản mẫu (mật khẩu bất kỳ): `a@nct.demo` (cựu học sinh) · `admin@nct.demo` (Ban tổ chức, thấy mục Quản trị).

---

## 1. Cấu trúc thư mục

```
index.html                    ← nạp core rồi từng module, router nạp cuối
assets/
  fonts/                      Tiny5 Duo (tiêu đề) · League Spartan 300–900 (nội dung), woff2
  img/                        bản đồ 2 tầng + lớp tán cây, sprite nhân vật (2 giới tính × 3 màu sọc), icon 8 địa điểm, logo
  video/                      train-window.mp4 (cửa sổ tàu trang chủ) · loc-<id>.mp4 (clip từng điểm check-in)
src/core/
  base.css, app.css           design tokens + style dùng chung
  config.js                   lưới bản đồ 15×15, 2 tầng, cầu thang, 8 địa điểm (id, tên, mô tả, video, vùng ô)
  api.js                      ★ lớp dữ liệu duy nhất — mỗi hàm = 1 endpoint (xem mục 3)
  mock-data.js                dữ liệu mẫu — xoá khi nối backend
  ui.js, sound.js, router.js  helper giao diện, âm thanh 8-bit, router + thanh điều hướng
src/modules/
  auth/        Trang chủ (cửa sổ tàu) · Vé thông hành: Đăng ký / Đăng nhập · Chuyển cảnh lên tàu
  users/       Hồ sơ: bảng tên, thống kê, Sổ dấu mộc, kỷ niệm đã viết, sửa thông tin
  locations/   Bản đồ game (WASD/mũi tên/D-pad), 2 tầng, cầu thang, trời sáng/chiều/tối theo giờ thật
  checkins/    Popup nhận dấu mộc · Màn check-in (clip, câu chuyện, ô viết, tường kỷ niệm của điểm)
  memories/    Ô viết kỷ niệm (≤300 ký tự + ảnh) · Tường kỷ niệm 4 cột · Trang tổng hợp lọc theo địa điểm
  comments/    Popup chi tiết kỷ niệm + bình luận
  reactions/   4 cảm xúc: Thương · Nhớ quá · Vui ghê · Tự hào (1 người 1 cảm xúc / kỷ niệm)
  rankings/    Xếp hạng: Dấu mộc · Kỷ niệm · Cảm xúc nhận được · Theo niên khoá
  search/      Thanh tìm kiếm ở header + trang kết quả (họ tên, niên khoá, lớp, hồ sơ, địa điểm)
  admin/       Tổng quan · Duyệt kỷ niệm · Người dùng (đổi vai trò) · Địa điểm
figma/<module>/               ảnh chụp từng màn (desktop 1440 + mobile 390, @2x) để dựng file Figma
```

Route: `#/` (auth) · `#/journey` · `#/map` · `#/memories` · `#/rankings` · `#/search?q=` · `#/me`, `#/u/:id` · `#/admin`.

## 2. Cách nối backend

Chỉ cần sửa **`src/core/api.js`**: thay thân mỗi hàm bằng `fetch()` tới endpoint ghi ở comment, giữ nguyên dữ liệu trả về. Các module chỉ gọi `NCT.api.*`, không đụng localStorage.
Hai hàm đồng bộ dùng cho vòng lặp game — `meSync()` và `myCheckinsSync()` — nên đọc từ cache phía client (lấy sau đăng nhập / sau mỗi `POST /checkins`).

## 3. API contract (đề xuất — khớp với các hàm trong api.js)

| Module | Method & path | Body / query | Trả về |
|---|---|---|---|
| auth | `POST /auth/register` | `name, email, password, role(hs/chs/gv), gender(m/f), stripe(y/w/b), className, sy, ey` | `{ user, token }` |
| auth | `POST /auth/login` | `email, password` | `{ user, token }` |
| auth | `POST /auth/logout` · `GET /auth/me` | | `User` |
| users | `GET /users/:id` · `PATCH /users/:id` | `name, className, gender, stripe` | `User` |
| users | `GET /users/:id/stats` | | `{ stamps, memories, reactionsReceived, comments }` |
| locations | `GET /locations` · `GET /locations/:id` | | `Location[]` (id, no, name, floor, desc, video) |
| checkins | `GET /checkins?userId=me` | | `Checkin[]` |
| checkins | `POST /checkins` | `locationId` (idempotent theo user + địa điểm) | `Checkin` |
| memories | `GET /memories` | `locationId, userId, status, sort=new\|top` | `Memory[]` kèm `author, reactions{love,miss,laugh,proud}, myReaction, commentCount` |
| memories | `POST /memories` (multipart) | `locationId, text ≤300, img?` | `Memory` |
| memories | `DELETE /memories/:id` | | |
| comments | `GET /memories/:id/comments` · `POST /memories/:id/comments` | `text ≤200` | `Comment[]` / `Comment` |
| reactions | `PUT /memories/:id/reactions` | `type: love\|miss\|laugh\|proud` (gửi lại cùng type = bỏ) | `Memory` |
| rankings | `GET /rankings?type=stamps\|memories\|reactions\|cohort&limit=20` | | `{ user, score }[]` hoặc `{ cohort, members, stamps, memories }[]` |
| search | `GET /search` | `q, cohort, className, role, locationId` | `{ users, memories }` |
| admin | `GET /admin/stats` | | tổng số + theo địa điểm |
| admin | `GET /admin/memories?status=` · `PATCH /admin/memories/:id` | `status: published\|pending\|hidden` | |
| admin | `GET /admin/users` · `PATCH /admin/users/:id` | `role` | |
| admin | `PATCH /admin/locations/:id` | `desc, video` (nút đã có, đang tắt) | |

Quy tắc đã chốt trên prototype: năm ra trường = năm vào + 3 với học sinh/cựu học sinh (giáo viên tự chọn) · kỷ niệm tối đa 300 ký tự · bước vào vùng địa điểm lần đầu = nhận dấu mộc, các lần sau tự mở màn check-in (trừ cầu thang).

## 4. Figma

Thư mục `figma/` có ảnh chụp mọi màn theo từng module (desktop + mobile, @2x) — kéo thả vào Figma để làm bảng tham chiếu.
Để có **layer chỉnh sửa được** trong Figma: đưa thư mục này lên một host tĩnh bất kỳ (VD Netlify/Vercel/GitHub Pages), rồi dùng plugin **html.to.design** (Figma Community) nhập từng URL route (`…/#/map`, `#/memories`, `#/rankings`, …). Plugin dựng lại khung, chữ, màu, ảnh thành layer Figma; màn cần đăng nhập thì dùng extension Chrome của plugin để chụp đúng trạng thái đang mở.
