# Phần Locations: Không Gian Trường, Kho Ảnh Xưa & Nay & Tour Ảo 360°

Chào anh em! Đây là tài liệu hướng dẫn chi tiết về module **Địa điểm (Locations)** của backend website kỷ niệm 40 năm NCT (Express, ES Modules, PostgreSQL) do Khang Lê phụ trách.

Nếu bạn là thành viên mới vào nhóm cần sửa code, thêm tính năng, hoặc là người làm Frontend đang dựng giao diện Tham quan ảo 360° và các trang chi tiết góc trường, tài liệu này sẽ giải thích mọi thứ một cách dễ hiểu và trực quan nhất.

---

## 1. Mục đích module

Module Địa điểm là "linh hồn" không gian của trang web kỷ niệm 40 năm, phục vụ 3 trải nghiệm chính:

1. **Gợi nhớ 11 góc trường thân thương:** Cung cấp thông tin, ý nghĩa và cảm xúc về 11 địa điểm gắn liền với bao thế hệ học sinh NCT (từ Cổng trường, Sân trường, Căn tin, Ghế đá bồn cây, đến Phòng giám thị, Phòng y tế, Sân bóng rổ...).
2. **Tham quan trường ảo 360° (Virtual Tour):** Giúp các cựu học sinh đang ở xa (hoặc định cư nước ngoài) có thể "bước đi" trong khuôn viên trường bằng ảnh toàn cảnh 360°. Trên mỗi bức ảnh 360° có gắn sẵn các **điểm chuyển cảnh (Hotspots)**: người dùng chỉ cần bấm vào mũi tên là bước sang góc trường kế bên.
3. **So sánh ký ức Xưa & Nay:** Mỗi địa điểm lưu trữ kho ảnh tư liệu được chia rõ ràng thành 2 giai đoạn: **Ảnh xưa (`old`)** kèm năm chụp (ví dụ năm 1990, 1995...) và **Ảnh nay (`current`)** để người xem thấy được sự đổi thay và phát triển của trường qua 4 thập kỷ.

---

## 2. Cấu trúc thư mục & nhiệm vụ từng file

Toàn bộ mã nguồn nằm tại thư mục `backend/src/modules/locations/`:

```
backend/src/
├── app.js                                  # Đăng ký route /api/locations
├── modules/
│   └── locations/
│       ├── locations.schema.js             # Kiểm tra dữ liệu thêm/sửa địa điểm, ảnh, liên kết 360° (Zod)
│       ├── locations.service.js            # Truy vấn SQL: tổng hợp lượt thích/checkin, gom nhóm ảnh xưa-nay, lấy hotspots
│       ├── locations.controller.js         # Tiếp nhận request, gọi service, trả JSON về client
│       ├── locations.routes.js             # Khai báo đường dẫn URL và phân quyền (Admin)
│       └── locations.md                    # Bản tóm tắt nhanh của module
└── db/
    ├── schema.sql                          # Khởi tạo bảng locations, location_photos, location_links
    └── seed.sql                            # Dữ liệu mẫu 11 địa điểm & liên kết chuyển cảnh 360°
```

### Phân công trách nhiệm rõ ràng:
- **`locations.routes.js`**: Định nghĩa URL. Các route xem thông tin thì mở công khai cho tất cả mọi người; các route thêm/sửa/xóa địa điểm hay nạp ảnh thì bắt buộc phải có quyền Admin (`requireAdmin`).
- **`locations.schema.js`**: Kiểm tra dữ liệu đầu vào (tên không được rỗng, slug hợp lệ, loại ảnh phải là `old` hoặc `current`, tọa độ góc nhìn `yaw`, `pitch` hợp lệ).
- **`locations.service.js`**: Viết các câu lệnh SQL tối ưu. Thay vì gọi nhiều truy vấn con, service dùng câu lệnh tổng hợp để đếm cùng lúc số lượt check-in, số lượt thích, số ảnh và tự động phân loại ảnh xưa/nay thành 2 mảng riêng biệt cho Frontend dễ dùng.
- **`locations.controller.js`**: Nhận tham số từ URL (`id` hoặc `slug`), gọi service và trả mã HTTP tương ứng (200, 201, 404).

---

## 3. Danh sách 11 góc trường đã được nạp sẵn trong hệ thống

Dưới đây là 11 góc trường đặc trưng đã được định danh bằng mã `slug` chuẩn trong CSDL (`backend/db/seed.sql`):

| STT | Tên địa điểm | Mã định danh (`slug`) | Cảm xúc & Kỷ niệm gửi gắm |
|:---:|---|---|---|
| 1 | **Cổng trường** | `cong-truong` | Nơi mở đầu và khép lại bao kỷ niệm thanh xuân của học sinh NCT |
| 2 | **Sân trường** | `san-truong` | Nơi chào cờ trang nghiêm đầu tuần và những giờ ra chơi rộn rã tiếng cười |
| 3 | **Căn tin** | `can-tin` | Thiên đường ăn vặt, trà sữa và những bữa trưa rôm rả bạn bè |
| 4 | **Bồn cây** | `bon-cay` | Ghế đá bồn cây rợp bóng mát, nơi ôn bài và tâm tình tuổi học trò |
| 5 | **Phòng giám thị** | `phong-giam-thi` | Nơi rèn luyện nề nếp, kỷ luật và lưu giữ những kỷ niệm "thót tim" nhưng đầy yêu thương của tuổi học trò |
| 6 | **Lớp học** | `lop-hoc` | Bảng đen, phấn trắng, dãy bàn thân thương và những bài giảng tâm huyết |
| 7 | **Hành lang** | `hanh-lang` | Những bước chân vội vã trước giờ trống và ánh nhìn lướt qua lớp bên cạnh |
| 8 | **Phòng y tế** | `phong-y-te` | Nơi nghỉ ngơi ấm áp và sự chăm sóc ân cần của các cô y tế |
| 9 | **Sân bóng rổ** | `san-bong-ro` | Nơi cháy hết mình với đam mê thể thao và những tiếng reo hò cổ vũ |
| 10 | **Sân bóng chuyền** | `san-bong-chuyen` | Những trận giao lưu sôi nổi giữa các khóa lớp trong các hội thao trường |
| 11 | **Sân cầu lông** | `san-cau-long` | Tiếng cười và những đường cầu kịch tính sau giờ tan học |

---

## 4. Dữ liệu bảng CSDL & Mối liên kết

Hệ thống sử dụng 3 bảng liên kết chặt chẽ với nhau:

1. **`locations`**: Lưu thông tin cốt lõi (tên, slug URL, mô tả, đường dẫn ảnh toàn cảnh `panorama_url`).
2. **`location_photos`**: Lưu các ảnh tư liệu chụp góc trường đó:
   - Cột `kind`: Chỉ nhận `'old'` (ảnh ngày xưa) hoặc `'current'` (ảnh ngày nay).
   - Cột `year`: Năm chụp (ví dụ `1995`) để người xem biết bức ảnh này thuộc giai đoạn nào.
3. **`location_links`**: Lưu các điểm chuyển cảnh 360° (Hotspots):
   - `from_location_id` ➔ `to_location_id`.
   - `yaw`, `pitch`: Tọa độ góc xoay ngang và góc nghiêng trên quả cầu 360° để trình duyệt vẽ đúng vị trí mũi tên điều hướng.
   - Khi xóa 1 địa điểm, các ảnh và liên kết liên quan sẽ tự động bị xóa theo nhờ ràng buộc `ON DELETE CASCADE`.

---

## 5. Danh sách các API chi tiết

### 5.1. Lấy danh sách toàn bộ địa điểm (Trang chủ / Danh mục)
Dùng để vẽ danh sách các góc trường ở Trang chủ hoặc thanh chuyển nhanh địa điểm.
- **Method:** `GET`
- **URL:** `/api/locations`
- **Header:** Gửi kèm token nếu có (để biết mình đã like hay check-in chưa).
- **Kết quả trả về (`200 OK`):** Mảng 11 địa điểm kèm số liệu thống kê đầy đủ:
```json
[
  {
    "id": 2,
    "slug": "san-truong",
    "name": "Sân trường",
    "description": "Nơi diễn ra các buổi chào cờ trang nghiêm...",
    "panorama_url": "/panos/san-truong.jpg",
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

### 5.2. Lấy chi tiết 1 địa điểm & Dữ liệu Tour 360°
Dùng khi người dùng mở trang Tham quan ảo (`/tour/:slug`) hoặc xem bài viết về một góc trường.
- **Method:** `GET`
- **URL:** `/api/locations/:identifier` (ví dụ: `/api/locations/san-truong` hoặc `/api/locations/2`)
- **Kết quả trả về (`200 OK`):**
```json
{
  "id": 2,
  "slug": "san-truong",
  "name": "Sân trường",
  "description": "Nơi diễn ra các buổi chào cờ trang nghiêm và những giờ ra chơi rộn rã...",
  "panorama_url": "/panos/san-truong.jpg",
  "stats": {
    "checkin_count": 65,
    "like_count": 120,
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

### 5.3. Các API Quản trị dành cho Admin (Thêm / Sửa / Xóa)
Tất cả các API này đều yêu cầu đăng nhập bằng tài khoản có `is_admin = true`:

- **Thêm địa điểm mới:** `POST /api/locations`  
  *Body:* `{ "name": "...", "slug": "...", "description": "...", "panoramaUrl": "..." }`
- **Sửa thông tin địa điểm:** `PATCH /api/locations/:identifier`  
  *Body:* Gửi các trường cần sửa.
- **Xóa địa điểm:** `DELETE /api/locations/:identifier`  
  *Response 200:* `{ "message": "Xóa địa điểm thành công" }`
- **Thêm ảnh tư liệu:** `POST /api/locations/:identifier/photos`  
  *Body:* `{ "url": "https://...", "kind": "old", "year": 1995 }`
- **Xóa ảnh tư liệu:** `DELETE /api/locations/photos/:photoId`
- **Thêm điểm chuyển cảnh 360°:** `POST /api/locations/:identifier/links`  
  *Body:* `{ "toLocationId": 3, "yaw": 1.57, "pitch": 0.0 }`
- **Xóa điểm chuyển cảnh:** `DELETE /api/locations/links/:linkId`

---

## 6. Hướng dẫn test nhanh bằng cURL

Bạn mở Terminal và kiểm tra kết quả ngay lập tức:

```bash
# 1. Lấy danh sách 11 địa điểm kèm số liệu tương tác
curl http://localhost:3000/api/locations

# 2. Xem chi tiết Sân trường bằng slug (thấy cả ảnh xưa-nay và các hotspot 360°)
curl http://localhost:3000/api/locations/san-truong

# 3. Xem bằng ID số
curl http://localhost:3000/api/locations/2

# 4. Xem chi tiết có kèm Token (để kiểm tra trường has_checked_in và has_liked)
curl http://localhost:3000/api/locations/san-truong \
  -H "Authorization: Bearer TOKEN"
```

---

## 7. Gợi ý cho Frontend

1. **Dựng Trình xem ảnh 360° (`TourPage.jsx`):**
   - Bạn có thể dùng thư viện `@photo-sphere-viewer/core` kết hợp `@photo-sphere-viewer/markers-plugin` (hoặc Pannellum / Marzipano).
   - Khi vào trang `/tour/:slug`, gọi `GET /api/locations/:slug` để lấy `panorama_url` nạp vào viewer.
   - Duyệt qua mảng `links` để vẽ các nút bấm mũi tên chuyển cảnh dựa trên tọa độ `{ yaw: link.yaw, pitch: link.pitch }`. Khi người dùng click vào mũi tên, bạn chỉ việc gọi `navigate('/tour/' + link.to_slug)`.
2. **Hiển thị Kho ảnh Xưa & Nay:**
   - Dữ liệu trả về đã được gom nhóm sẵn thành `photos.old` và `photos.current`. Bạn chỉ việc làm 2 tab đơn giản hoặc thanh kéo so sánh (Before/After Slider) là giao diện sẽ cực kỳ ấn tượng.
3. **Thanh trạng thái & Nút tương tác:**
   - Dùng `userStatus.hasCheckedIn` để đổi màu nút Check-in và `userStatus.hasLiked` để đổi màu nút Trái tim ngay trên màn hình tham quan.
