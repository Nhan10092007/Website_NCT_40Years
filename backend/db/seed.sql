-- Danh sách các địa điểm đặc trưng kỷ niệm 40 năm trường
INSERT INTO locations (slug, name, description, panorama_url) VALUES
  ('cong-truong',      'Cổng trường',        'Nơi đón học sinh mỗi sáng, chứng kiến bao thế hệ bước vào trường.',               '/panos/test.jpg'),
  ('phong-giam-thi',    'Phòng giám thị',     'Nơi rèn luyện nề nếp, kỷ luật và lưu giữ những kỷ niệm "thót tim" nhưng đầy yêu thương của tuổi học trò.', '/panos/test.jpg'),
  ('san-truong',       'Sân trường',         'Nơi diễn ra các buổi chào cờ trang nghiêm, hội trại và các hoạt động lớn.',       '/panos/test.jpg'),
  ('bon-cay',          'Bồn cây',            'Tán cây râm mát cùng những dãy ghế đá thân thương ghi dấu bao câu chuyện học trò.','/panos/test.jpg'),
  ('can-tin',          'Căn tin',            'Góc ẩm thực náo nhiệt nhất trường mỗi giờ giải lao với bao món ăn tuổi thơ.',      '/panos/test.jpg'),
  ('hanh-lang',        'Hành lang',          'Nơi ngắm mưa rơi, hóng gió và tụ tập bạn bè tâm sự sau mỗi tiết học.',            '/panos/test.jpg'),
  ('lop-hoc',          'Lớp học',            'Nơi phấn trắng bảng đen, những chiếc bàn gỗ lưu giữ biết bao kiến thức và kỷ niệm.','/panos/test.jpg'),
  ('phong-y-te',       'Phòng y tế',         'Góc chăm sóc sức khỏe ân cần của trường, nơi nghỉ ngơi quen thuộc mỗi khi mệt.',  '/panos/test.jpg'),
  ('san-bong-ro',      'Sân bóng rổ',        'Nơi bùng cháy đam mê với những cú ném rổ đẹp mắt và tiếng cổ vũ cuồng nhiệt.',    '/panos/test.jpg'),
  ('san-bong-chuyen',  'Sân bóng chuyền',    'Khu vực thể thao sôi động, nơi rèn luyện thể lực và tinh thần đồng đội.',          '/panos/test.jpg'),
  ('san-cau-long',     'Sân cầu lông',       'Góc sân sôi nổi với những pha cầu kịch tính sau giờ tan học.',                   '/panos/test.jpg')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  panorama_url = EXCLUDED.panorama_url;

-- Tạo các liên kết di chuyển (Hotspots) giữa các địa điểm
-- yaw/pitch tính bằng RADIAN (1.57 ≈ 90 độ, 3.14 ≈ 180 độ)

-- Cổng trường <-> Sân trường
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 0, 0 FROM locations a, locations b WHERE a.slug = 'cong-truong' AND b.slug = 'san-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 3.14, 0 FROM locations a, locations b WHERE a.slug = 'san-truong' AND b.slug = 'cong-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Cổng trường <-> Phòng giám thị
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -1.2, 0 FROM locations a, locations b WHERE a.slug = 'cong-truong' AND b.slug = 'phong-giam-thi'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 1.8, 0 FROM locations a, locations b WHERE a.slug = 'phong-giam-thi' AND b.slug = 'cong-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân trường <-> Bồn cây
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -0.8, 0 FROM locations a, locations b WHERE a.slug = 'san-truong' AND b.slug = 'bon-cay'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 2.3, 0 FROM locations a, locations b WHERE a.slug = 'bon-cay' AND b.slug = 'san-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân trường <-> Căn tin
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 1.57, 0 FROM locations a, locations b WHERE a.slug = 'san-truong' AND b.slug = 'can-tin'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -1.57, 0 FROM locations a, locations b WHERE a.slug = 'can-tin' AND b.slug = 'san-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân trường <-> Hành lang
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 0.5, 0 FROM locations a, locations b WHERE a.slug = 'san-truong' AND b.slug = 'hanh-lang'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -2.6, 0 FROM locations a, locations b WHERE a.slug = 'hanh-lang' AND b.slug = 'san-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Hành lang <-> Lớp học
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 0, 0 FROM locations a, locations b WHERE a.slug = 'hanh-lang' AND b.slug = 'lop-hoc'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 3.14, 0 FROM locations a, locations b WHERE a.slug = 'lop-hoc' AND b.slug = 'hanh-lang'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Hành lang <-> Phòng y tế
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 1.2, 0 FROM locations a, locations b WHERE a.slug = 'hanh-lang' AND b.slug = 'phong-y-te'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -1.9, 0 FROM locations a, locations b WHERE a.slug = 'phong-y-te' AND b.slug = 'hanh-lang'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân trường <-> Sân bóng rổ
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 2.5, 0 FROM locations a, locations b WHERE a.slug = 'san-truong' AND b.slug = 'san-bong-ro'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -0.6, 0 FROM locations a, locations b WHERE a.slug = 'san-bong-ro' AND b.slug = 'san-truong'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân bóng rổ <-> Sân bóng chuyền
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 0.8, 0 FROM locations a, locations b WHERE a.slug = 'san-bong-ro' AND b.slug = 'san-bong-chuyen'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -2.3, 0 FROM locations a, locations b WHERE a.slug = 'san-bong-chuyen' AND b.slug = 'san-bong-ro'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

-- Sân bóng chuyền <-> Sân cầu lông
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 1.2, 0 FROM locations a, locations b WHERE a.slug = 'san-bong-chuyen' AND b.slug = 'san-cau-long'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -1.9, 0 FROM locations a, locations b WHERE a.slug = 'san-cau-long' AND b.slug = 'san-bong-chuyen'
ON CONFLICT (from_location_id, to_location_id) DO NOTHING;