/* ============================================================
 * modules/admin — tổng quan, duyệt kỷ niệm, người dùng, địa điểm
 * API: adminStats (GET /admin/stats) · adminMemories / moderate (GET, PATCH /admin/memories)
 *      adminUsers / setRole (GET, PATCH /admin/users) · locations (GET /locations)
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  var TABS = [{ id: 'overview', label: 'Tổng quan' }, { id: 'moderation', label: 'Duyệt kỷ niệm' }, { id: 'users', label: 'Người dùng' }, { id: 'locations', label: 'Địa điểm' }];
  NCT.modules.admin = { render: function (el, ctx) {
    var tab = ctx.params.tab || 'overview';
    el.innerHTML = '<div class="page"><div class="page-head"><div><h1>Quản trị</h1><p>Dành cho Ban tổ chức 40 năm.</p></div></div><div class="admin">' +
      '<nav class="admin-nav card" aria-label="Mục quản trị">' + TABS.map(function (t) { return '<button type="button" class="btn ghost sm" data-t="' + t.id + '">' + t.label + '</button>'; }).join('') + '</nav>' +
      '<div data-body style="min-width:0"></div></div></div>';
    var body = el.querySelector('[data-body]');
    var pill = function (s) { return s === 'published' ? '<span class="pill ok">Đã đăng</span>' : s === 'pending' ? '<span class="pill wait">Chờ duyệt</span>' : '<span class="pill off">Đã ẩn</span>'; };
    function load() {
      el.querySelectorAll('[data-t]').forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-t') === tab)); });
      if (tab === 'overview') NCT.api.adminStats().then(function (s) {
        body.innerHTML = '<div class="grid-3" style="margin-bottom:18px">' + [['Người tham gia', s.users], ['Lượt check-in', s.checkins], ['Kỷ niệm đã đăng', s.memories], ['Chờ duyệt', s.pending], ['Bình luận', s.comments], ['Cảm xúc', s.reactions]].map(function (x) { return '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Địa điểm</th><th>Check-in</th><th>Kỷ niệm</th></tr></thead><tbody>' +
          s.perLocation.map(function (p) { var l = NCT.ui.loc(p.id); return '<tr><td style="display:flex;gap:8px;align-items:center">' + NCT.ui.ico(l.icon, 22) + esc(NCT.ui.locTitle(l)) + '</td><td>' + p.checkins + '</td><td>' + p.memories + '</td></tr>'; }).join('') + '</tbody></table></div>';
      });
      if (tab === 'moderation') NCT.api.adminMemories().then(function (list) {
        list.sort(function (a, b) { return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1); });
        body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Trạng thái</th><th>Nội dung</th><th>Người viết</th><th>Địa điểm</th><th>Ngày</th><th>Thao tác</th></tr></thead><tbody>' +
          list.map(function (m) { var l = NCT.ui.loc(m.locationId); return '<tr><td>' + pill(m.status) + '</td><td style="max-width:320px">' + esc(m.text) + (m.img ? ' <small class="muted">[có ảnh]</small>' : '') + '</td><td>' + esc(m.author.name) + '</td><td>' + esc(l ? l.name : '') + '</td><td>' + NCT.ui.date(m.at) + '</td><td style="white-space:nowrap">' +
            (m.status !== 'published' ? '<button type="button" class="btn mint sm" data-mod="published" data-id="' + m.id + '">Duyệt</button> ' : '') +
            (m.status !== 'hidden' ? '<button type="button" class="btn red sm" data-mod="hidden" data-id="' + m.id + '">Ẩn</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      });
      if (tab === 'users') NCT.api.adminUsers().then(function (us) {
        body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Họ tên</th><th>Email</th><th>Lớp</th><th>Niên khoá</th><th>Vai trò</th></tr></thead><tbody>' +
          us.map(function (u) { return '<tr><td><a href="#/u/' + u.id + '">' + esc(u.name) + '</a></td><td>' + esc(u.email || '') + '</td><td>' + esc(u.className || '—') + '</td><td>' + esc(NCT.ui.years(u)) + '</td><td><label class="sr-only" for="role-' + u.id + '">Vai trò của ' + esc(u.name) + '</label><select id="role-' + u.id + '" class="inp" data-role="' + u.id + '" style="min-height:36px;padding:4px 8px;font-size:14px">' +
            [['hs', 'Học sinh'], ['chs', 'Cựu học sinh'], ['gv', 'Giáo viên'], ['admin', 'Ban tổ chức']].map(function (r) { return '<option value="' + r[0] + '"' + (u.role === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>';
      });
      if (tab === 'locations') NCT.api.locations().then(function (ls) {
        body.innerHTML = '<div class="grid-2">' + ls.map(function (l) {
          return '<div class="card" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;gap:10px;align-items:center">' + NCT.ui.ico(l.icon, 32) + '<b style="font-size:16px">' + esc(NCT.ui.locTitle(l)) + '</b><span class="muted" style="margin-left:auto;font-size:12px">' + (l.floor === 'both' ? 'Cả 2 tầng' : NCT.C.FLOORS[l.floor].name) + '</span></div>' +
            '<video src="' + l.video + '" muted playsinline preload="metadata" style="width:100%;aspect-ratio:16/9;object-fit:cover;border:2px solid #2b2622;border-radius:4px;background:#3d4a3a"></video>' +
            '<p style="margin:0;font-size:13px;line-height:1.6;text-align:justify" class="muted">' + esc(l.desc) + '</p>' +
            '<div style="display:flex;gap:8px"><button type="button" class="btn ghost sm" disabled title="Kết nối PATCH /admin/locations/:id">Sửa mô tả</button><button type="button" class="btn ghost sm" disabled title="Kết nối upload video">Đổi video</button></div></div>';
        }).join('') + '</div>';
      });
    }
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-t]'); if (t) { tab = t.getAttribute('data-t'); load(); return; }
      var m = e.target.closest('[data-mod]'); if (m) NCT.api.moderate(m.getAttribute('data-id'), m.getAttribute('data-mod')).then(load);
    });
    el.addEventListener('change', function (e) { var r = e.target.closest('[data-role]'); if (r) NCT.api.setRole(r.getAttribute('data-role'), r.value).then(function () { NCT.ui.toast('Đã cập nhật vai trò.'); }); });
    load();
  } };
})();
