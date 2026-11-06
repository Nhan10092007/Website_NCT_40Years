/* ============================================================
 * core/mock-data.js — SAMPLE data so every screen has something to show.
 * Placeholder names/texts only (labelled "Dữ liệu mẫu" in the UI).
 * Delete this file once api.js points at the real backend.
 * Demo logins (any password): admin@nct.demo · a@nct.demo
 * ============================================================ */
window.NCT = window.NCT || {};
NCT.seed = function () {
  var t = function (d) { return new Date(Date.now() - d * 86400000).toISOString(); };
  var users = [
    { id: 'u_admin', name: 'Ban tổ chức 40 năm', role: 'admin', gender: 'm', stripe: 'y', sy: 2026, ey: 2026, className: '', email: 'admin@nct.demo', createdAt: t(30) },
    { id: 'u_a', name: 'Nguyễn Văn A', role: 'chs', gender: 'm', stripe: 'y', sy: 2008, ey: 2011, className: '12A1', email: 'a@nct.demo', createdAt: t(20) },
    { id: 'u_b', name: 'Trần Thị B', role: 'chs', gender: 'f', stripe: 'w', sy: 2015, ey: 2018, className: '12A3', email: 'b@nct.demo', createdAt: t(18) },
    { id: 'u_c', name: 'Lê Văn C', role: 'hs', gender: 'm', stripe: 'b', sy: 2024, ey: 2027, className: '11A2', email: 'c@nct.demo', createdAt: t(12) },
    { id: 'u_d', name: 'Phạm Thị D', role: 'gv', gender: 'f', stripe: 'y', sy: 1998, ey: 2026, className: '', email: 'd@nct.demo', createdAt: t(9) },
    { id: 'u_e', name: 'Hoàng Văn E', role: 'chs', gender: 'm', stripe: 'w', sy: 1995, ey: 1998, className: '12A5', email: 'e@nct.demo', createdAt: t(7) },
    { id: 'u_f', name: 'Võ Thị F', role: 'hs', gender: 'f', stripe: 'b', sy: 2025, ey: 2028, className: '10A4', email: 'f@nct.demo', createdAt: t(4) }
  ];
  var checkins = [];
  var stampsOf = { u_a: ['gate', 'hsts', 'statue', 'yard', 'stairs', 'corridor'], u_b: ['gate', 'yard', 'classA', 'lab', 'stairs'], u_c: ['gate', 'yard', 'stairs'],
    u_d: ['gate', 'statue', 'yard', 'stairs', 'corridor', 'classA', 'lab', 'hsts'], u_e: ['gate', 'statue'], u_f: ['gate', 'yard', 'corridor', 'stairs'] };
  Object.keys(stampsOf).forEach(function (u, i) { stampsOf[u].forEach(function (l, j) { checkins.push({ id: 'c_' + u + '_' + l, userId: u, locationId: l, at: t(10 - i - j * 0.1) }); }); });
  var memories = [
    { id: 'm1', userId: 'u_a', locationId: 'gate', text: '[Dữ liệu mẫu] Sáng nào cũng chạy vào cổng đúng lúc trống đánh.', at: t(6) },
    { id: 'm2', userId: 'u_b', locationId: 'yard', text: '[Dữ liệu mẫu] Giờ ra chơi cả lớp ngồi quanh bồn cây đỏ, chia nhau gói bánh.', at: t(5) },
    { id: 'm3', userId: 'u_d', locationId: 'statue', text: '[Dữ liệu mẫu] Mùa thi nào cũng có học trò ghé qua tượng Cụ trước giờ vào phòng thi.', at: t(5) },
    { id: 'm4', userId: 'u_c', locationId: 'stairs', text: '[Dữ liệu mẫu] Cầu thang góc trái là chỗ hẹn quen thuộc sau giờ học.', at: t(4) },
    { id: 'm5', userId: 'u_f', locationId: 'corridor', text: '[Dữ liệu mẫu] Đứng hành lang lầu 1 nhìn xuống sân, chờ chuông vào lớp.', at: t(3) },
    { id: 'm6', userId: 'u_b', locationId: 'lab', text: '[Dữ liệu mẫu] Lần đầu thấy dung dịch đổi màu trong giờ thực hành Hoá.', at: t(3) },
    { id: 'm7', userId: 'u_e', locationId: 'gate', text: '[Dữ liệu mẫu] Ba mươi năm rồi, cổng trường vẫn là nơi hẹn gặp lại bạn cũ.', at: t(2) },
    { id: 'm8', userId: 'u_a', locationId: 'hsts', text: '[Dữ liệu mẫu] Buổi chào cờ đầu tuần bên cột mốc.', at: t(1) },
    { id: 'm9', userId: 'u_c', locationId: 'classA', text: '[Dữ liệu mẫu — đang chờ duyệt] Chỗ ngồi cạnh cửa sổ rèm xanh.', at: t(0.5), status: 'pending' }
  ].map(function (m) { return Object.assign({ img: '', status: 'published' }, m); });
  var reactions = [
    { memoryId: 'm1', userId: 'u_b', type: 'love' }, { memoryId: 'm1', userId: 'u_c', type: 'miss' }, { memoryId: 'm1', userId: 'u_e', type: 'love' },
    { memoryId: 'm2', userId: 'u_a', type: 'laugh' }, { memoryId: 'm3', userId: 'u_a', type: 'proud' }, { memoryId: 'm3', userId: 'u_f', type: 'proud' },
    { memoryId: 'm7', userId: 'u_a', type: 'miss' }, { memoryId: 'm7', userId: 'u_d', type: 'love' }, { memoryId: 'm6', userId: 'u_d', type: 'proud' }
  ];
  var comments = [
    { id: 'cm1', memoryId: 'm1', userId: 'u_b', text: '[Mẫu] Y chang mình hồi đó!', at: t(5.5) },
    { id: 'cm2', memoryId: 'm1', userId: 'u_e', text: '[Mẫu] Trống trường vẫn đúng giờ như xưa.', at: t(5) },
    { id: 'cm3', memoryId: 'm7', userId: 'u_a', text: '[Mẫu] Hẹn anh ở cổng dịp lễ 40 năm nha.', at: t(1.5) }
  ];
  return { users: users, checkins: checkins, memories: memories, reactions: reactions, comments: comments, session: null };
};
