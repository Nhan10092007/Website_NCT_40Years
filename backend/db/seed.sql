INSERT INTO locations (slug, name, description, panorama_url) VALUES
  ('cong-truong', 'Cổng trường', 'Nơi đón học sinh mỗi sáng', '/panos/test.jpg'),
  ('san-truong',  'Sân trường',  'Nơi chào cờ và đá cầu',     '/panos/test.jpg'),
  ('can-tin',     'Căn tin',     'Giờ ra chơi đông nhất',      '/panos/test.jpg')
ON CONFLICT (slug) DO NOTHING;

-- yaw/pitch tính bằng RADIAN (1.57 ≈ 90 độ)
INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 0, 0 FROM locations a, locations b
WHERE a.slug = 'cong-truong' AND b.slug = 'san-truong'
ON CONFLICT DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 3.14, 0 FROM locations a, locations b
WHERE a.slug = 'san-truong' AND b.slug = 'cong-truong'
ON CONFLICT DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, 1.57, 0 FROM locations a, locations b
WHERE a.slug = 'san-truong' AND b.slug = 'can-tin'
ON CONFLICT DO NOTHING;

INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
SELECT a.id, b.id, -1.57, 0 FROM locations a, locations b
WHERE a.slug = 'can-tin' AND b.slug = 'san-truong'
ON CONFLICT DO NOTHING;