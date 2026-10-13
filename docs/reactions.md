# Phần Reactions: Thả Tim & Bày Tỏ Tình Cảm (Địa Điểm & Kỷ Niệm)

Chào anh em! Đây là tài liệu hướng dẫn toàn bộ logic của module **Yêu thích / Thả tim (Reactions)** trong backend website kỷ niệm 40 năm NCT (Express, ES Modules, PostgreSQL) do Khang Lê phụ trách.

Tài liệu này được viết theo phong cách gần gũi, thực chiến để bất kỳ ai vào sau đọc là hiểu ngay cách nút Thả tim hoạt động ngầm dưới database và cách Frontend gọi API sao cho mượt mà nhất.

---

## 1. Tính năng này sinh ra để làm gì?

Trong một trang web kỷ niệm 40 năm trường, cảm xúc và sự hoài niệm là điều quan trọng nhất:
1. **Thả tim góc trường quen thuộc:** Học sinh, cựu học sinh hay thầy cô có thể thả tim vào những nơi mình yêu mến nhất (ví dụ: thả tim cho Căn tin, Ghế đá bồn cây hay Sân bóng rổ).
2. **Thả tim bài viết kỷ niệm (`memories`):** Khi đọc những câu chuyện xúc động hay ngắm những bức ảnh xưa của các cựu học sinh đăng lên, người xem có thể thả tim để bày tỏ sự đồng cảm.
3. **Xem lại những góc trường mình từng yêu thích:** Giúp người dùng có một trang lưu trữ danh sách những địa điểm và bài viết mà mình đã từng thả tim.
4. **Bảng xếp hạng góc trường được yêu thích nhất:** Thống kê xem trong 11 địa điểm thì nơi nào nhận được nhiều tình cảm của các thế hệ học sinh nhất.

---

## 2. Cấu trúc thư mục & nhiệm vụ từng file

Code của module nằm tại `backend/src/modules/reactions/`:

```
backend/src/
├── app.js                                  # Đăng ký route /api/reactions
├── modules/
│   └── reactions/
│       ├── reactions.schema.js             # Kiểm tra dữ liệu đầu vào (Zod)
│       ├── reactions.service.js            # Viết SQL xử lý toggle like, đếm số lượt thích, lập bảng xếp hạng
│       ├── reactions.controller.js         # Tiếp nhận request từ client, gọi service, trả JSON về
│       ├── reactions.routes.js             # Định nghĩa các URL và gắn middleware bảo vệ
│       └── reactions.md                    # Bản tóm tắt nhanh của module
└── db/
    └── schema.sql                          # Bảng location_likes và memory_likes
```

### Cách phân chia công việc:
- **`reactions.routes.js`**: Định nghĩa các endpoint. Các thao tác thả tim cần đăng nhập (`requireAuth`), còn việc xem số lượt thích hay bảng xếp hạng thì công khai cho mọi người.
- **`reactions.schema.js`**: Người gác cổng: Đảm bảo tham số `:identifier` hoặc `:id` đúng định dạng, các tham số phân trang `page` và `limit` không bị nhập số âm.
- **`reactions.service.js`**: Nơi xử lý logic thông minh: Tự động đảo trạng thái thích/bỏ thích, chống spam và đếm lại số lượng tim tức thì.
- **`reactions.controller.js`**: Lấy `req.user.id` từ token, chuyển cho service và trả response với thông điệp tiếng Việt thân thiện.

---

## 3. Luồng hoạt động của nút Like Toggle "1 chạm"

Để người làm Frontend không phải viết code rườm rà (kiểm tra xem đã like chưa rồi mới quyết định gọi POST hay DELETE), backend cung cấp sẵn API **Toggle**:

1. Người dùng bấm vào nút Trái tim trên web.
2. Request gửi lên `POST /api/reactions/locations/:identifier/toggle` kèm token.
3. Service kiểm tra xem trong database tài khoản này đã thả tim địa điểm đó chưa:
   - **Nếu ĐÃ THẢ TIM:** Service chạy lệnh `DELETE` để bỏ thích.
   - **Nếu CHƯA THẢ TIM:** Service chạy lệnh `INSERT` để ghi nhận lượt thích.
4. Ngay lập tức, service đếm lại tổng số tim mới nhất của địa điểm đó và trả về:
   ```json
   {
     "liked": true,
     "count": 43
   }
   ```
5. Phía giao diện chỉ cần nhận kết quả này để sáng đèn trái tim và cập nhật con số hiển thị. Mọi thứ diễn ra trong đúng 1 request duy nhất!

---

## 4. Dữ liệu bảng CSDL & Cơ chế chống gian lận

Hệ thống lưu trữ lượt thích trong 2 bảng riêng biệt ở `backend/db/schema.sql`:

```sql
-- Lượt thích địa điểm
CREATE TABLE location_likes (
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (location_id, user_id)
);

-- Lượt thích bài viết kỷ niệm
CREATE TABLE memory_likes (
    memory_id INT REFERENCES memories(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (memory_id, user_id)
);
```

### Tại sao thiết kế như thế này lại an toàn và tối ưu?
- **Không bao giờ bị thích 2 lần:** Cặp `(location_id, user_id)` được đặt làm **Khóa chính (PRIMARY KEY)**. Một người dùng dù có cố tình bấm nhanh hay mở nhiều tab cũng không thể tăng 2 tim cho cùng 1 mục.
- **Bắt mã lỗi Postgres `23505`:** Nếu xảy ra tình trạng bấm đồng thời (race condition), CSDL sẽ ném lỗi vi phạm khóa chính `23505`, service sẽ bắt lỗi này và trả về thông báo an toàn mà không làm sập server.
- **Dọn dẹp tự động:** Có `ON DELETE CASCADE`, nếu xóa bài viết hoặc xóa người dùng, toàn bộ lượt tim liên quan tự động được dọn dẹp sạch sẽ.

---

## 5. Danh sách các API chi tiết

Mọi thông báo lỗi đều có dạng thống nhất: `{ "message": "Nội dung lỗi bằng tiếng Việt" }`.

### 5.1. Thả tim / Bỏ tim Địa Điểm (Toggle Like)
- **Method:** `POST`
- **URL:** `/api/reactions/locations/:identifier/toggle`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Tham số `:identifier`:** Bạn gửi ID số (`2`) hay Slug chữ (`san-truong`, `can-tin`...) đều được.
- **Kết quả trả về (`200 OK` khi vừa Thích):**
```json
{
  "message": "Đã thích địa điểm",
  "locationId": 2,
  "locationSlug": "san-truong",
  "liked": true,
  "count": 43
}
```
- **Kết quả trả về (`200 OK` khi vừa Bỏ thích):**
```json
{
  "message": "Đã bỏ thích địa điểm",
  "locationId": 2,
  "locationSlug": "san-truong",
  "liked": false,
  "count": 42
}
```

---

### 5.2. Thả tim / Bỏ tim Bài viết kỷ niệm (Toggle Like)
- **Method:** `POST`
- **URL:** `/api/reactions/memories/:id/toggle`
- **Header:** `Authorization: Bearer <TOKEN>`
- **Kết quả trả về (`200 OK`):**
```json
{
  "message": "Đã thích bài viết",
  "memoryId": 1,
  "liked": true,
  "count": 15
}
```

---

### 5.3. Xem số lượt thích & Trạng thái cá nhân
Dùng khi người dùng mở trang địa điểm hoặc xem thẻ bài viết để biết đã có bao nhiêu tim và mình đã thả tim chưa.
- **Địa điểm:** `GET /api/reactions/locations/:identifier` (Gửi kèm token nếu có)
- **Bài viết:** `GET /api/reactions/memories/:id` (Gửi kèm token nếu có)
- **Kết quả trả về (`200 OK`):**
```json
{
  "locationId": 2,
  "locationSlug": "san-truong",
  "likeCount": 42,
  "hasLiked": true
}
```

---

### 5.4. Xem danh sách những ai đã thích một địa điểm
- **Method:** `GET`
- **URL:** `/api/reactions/locations/:identifier/likers?page=1&limit=20`
- **Kết quả trả về (`200 OK`):**
```json
{
  "locationId": 2,
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
  "likers": [
    {
      "id": 1,
      "displayName": "Nguyễn Văn An",
      "role": "alumni",
      "cohort": "2015-2018",
      "className": "12A3",
      "avatarUrl": null,
      "likedAt": "2026-10-06T15:20:00.000Z"
    }
  ]
}
```

---

### 5.5. Bảng xếp hạng góc trường được yêu thích nhất (Leaderboard)
- **Method:** `GET`
- **URL:** `/api/reactions/locations/leaderboard?limit=5`
- **Kết quả trả về (`200 OK`):**
```json
[
  { "id": 2, "slug": "san-truong", "name": "Sân trường", "like_count": 85 },
  { "id": 3, "slug": "can-tin", "name": "Căn tin", "like_count": 64 },
  { "id": 4, "slug": "bon-cay", "name": "Bồn cây", "like_count": 52 }
]
```

---

### 5.6. Danh sách cá nhân: Những mục tôi đã từng thả tim
Dùng để hiển thị trong trang cá nhân (`ProfilePage`) mục "Góc trường tôi yêu thích" và "Kỷ niệm tôi đã lưu":
- **Địa điểm tôi đã thích:** `GET /api/reactions/me/locations` (Cần đăng nhập)
- **Kỷ niệm tôi đã thích:** `GET /api/reactions/me/memories` (Cần đăng nhập)

---

## 6. Hướng dẫn test nhanh bằng cURL

Bạn mở Terminal và chạy thử các lệnh sau:

```bash
# 1. Thử bấm Like Sân trường bằng slug (thay TOKEN)
curl -X POST http://localhost:3000/api/reactions/locations/san-truong/toggle \
  -H "Authorization: Bearer TOKEN"

# 2. Xem số like Sân trường và kiểm tra hasLiked
curl http://localhost:3000/api/reactions/locations/san-truong \
  -H "Authorization: Bearer TOKEN"

# 3. Xem danh sách những người đã thả tim Sân trường
curl http://localhost:3000/api/reactions/locations/san-truong/likers

# 4. Xem bảng xếp hạng các góc trường nhiều tim nhất
curl http://localhost:3000/api/reactions/locations/leaderboard

# 5. Xem danh sách các địa điểm cá nhân tôi đã thích
curl http://localhost:3000/api/reactions/me/locations \
  -H "Authorization: Bearer TOKEN"
```

---

## 7. Gợi ý kinh nghiệm cho bạn làm Frontend (Rất quan trọng!)

1. **Dùng cơ chế Optimistic UI (Bấm là ăn ngay):**
   - Khi người dùng click vào nút Trái tim (`LikeButton.jsx`), đừng bắt họ chờ mạng quay tròn.
   - Hãy đổi màu trái tim sang màu đỏ ngay lập tức và tăng con số lên +1 (hoặc đổi xám và -1 nếu bỏ tim).
   - Sau đó gửi request gọi API ngầm phía dưới. Nếu chẳng may mạng đứt hoặc token hết hạn, bạn chỉ cần rollback lại trạng thái cũ và hiện thông báo lỗi nhẹ. Người dùng sẽ cảm thấy trang web cực kỳ nhanh và mượt mà.
2. **Xử lý khi chưa đăng nhập:**
   - Khi người dùng chưa đăng nhập bấm vào nút Like, hãy kiểm tra token ở `localStorage`. Nếu chưa có, bật popup đăng nhập hoặc chuyển hướng sang `/login` thay vì để server báo lỗi `401`.
3. **Chống spam click (Debounce/Throttle):**
   - Mặc dù backend đã có khóa chính CSDL chống gian lận, ở Frontend bạn vẫn nên vô hiệu hóa nút bấm trong khoảng 300ms sau khi bấm để tránh gửi quá nhiều request thừa thãi lên server.
