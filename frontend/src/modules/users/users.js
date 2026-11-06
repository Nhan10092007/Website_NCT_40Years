/* ============================================================
 * modules/users — hồ sơ: vé/bảng tên, thống kê, sổ dấu mộc, kỷ niệm đã viết, sửa thông tin
 * API: NCT.api.getUser · userStats · updateUser · memories?userId · myCheckins
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  NCT.modules.users = { render: function (el, ctx) {
    var id = ctx.id || ctx.me.id, mine = id === ctx.me.id;
    function load() {
      Promise.all([NCT.api.getUser(id), NCT.api.userStats(id), NCT.api.memories({ userId: id })]).then(function (r) {
        var u = r[0], s = r[1], mems = r[2];
        if (!u) { el.innerHTML = '<div class="page"><div class="empty">Không tìm thấy hành khách này.</div></div>'; return; }
        var got = {}; if (mine) NCT.api.myCheckinsSync().forEach(function (c) { got[c.locationId] = c.at; });
        el.innerHTML = '<div class="page"><div class="profile">' +
          '<aside class="card" style="display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center">' +
          '<span class="big-av ' + NCT.ui.avClass(u) + '"></span>' + NCT.ui.nametag(u) +
          '<div class="muted" style="font-size:14px">' + esc(NCT.ui.roleLabel(u.role)) + (u.className ? ' · Lớp ' + esc(u.className) : '') + ' · ' + (u.role === 'gv' ? 'Công tác ' : 'Niên khoá ') + esc(NCT.ui.years(u)) + '</div>' +
          '<div class="grid-2" style="width:100%"><div class="stat"><b>' + s.stamps + '</b><span>Dấu mộc</span></div><div class="stat"><b>' + s.memories + '</b><span>Kỷ niệm</span></div><div class="stat"><b>' + s.reactionsReceived + '</b><span>Cảm xúc</span></div><div class="stat"><b>' + s.comments + '</b><span>Bình luận</span></div></div>' +
          (mine ? '<button type="button" class="btn ghost" data-edit style="width:100%">Sửa thông tin</button>' : '') + '</aside>' +
          '<div style="display:flex;flex-direction:column;gap:20px;min-width:0">' +
          (mine ? '<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px"><h2 style="margin:0;font-size:22px">Sổ dấu mộc</h2><span class="pix" style="background:#f2c94c;border:2px solid #2b2622;padding:2px 10px;font-size:16px">' + Object.keys(got).length + '/' + NCT.C.LOCS.length + '</span></div>' +
            '<div class="grid-4">' + NCT.C.LOCS.map(function (l, i) {
              var open = !!got[l.id];
              var rots = [-7, 5, -3, 8, -5, 3, -8, 6, -4, 5, -6];
              var rot = rots[i % rots.length];
              var icoStamp = '';
              if (l.iconSvg) {
                icoStamp = '<span class="ico-custom" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;' + (open ? '' : 'filter:grayscale(1) opacity(.55)') + '">' + l.iconSvg + '</span>';
              } else if (l.iconImg) {
                icoStamp = '<span class="ico" style="width:38px;height:38px;background-image:url(' + l.iconImg + ');background-size:100% 100%;filter:' + (open ? 'none' : 'grayscale(1) opacity(.55)') + '"></span>';
              } else {
                icoStamp = '<span class="ico" style="width:38px;height:38px;background-position:' + (l.icon * 100 / 9) + '% 0;filter:' + (open ? 'none' : 'grayscale(1) opacity(.55)') + '"></span>';
              }
              return '<div style="border:2px dashed #b9ad92;border-radius:6px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;background:' + (open ? '#fff' : '#f6f0e1') + '">' +
                '<div class="stamp" style="width:96px;height:96px;color:' + (open ? l.ink : '#9a8f80') + ';transform:rotate(' + rot + 'deg);opacity:' + (open ? 1 : 0.55) + '"><span class="pix" style="font-size:9px;font-weight:700">NCT · ' + l.no + '</span>' +
                icoStamp + '<span class="pix" style="font-size:9px;font-weight:700">' + (open ? NCT.ui.date(got[l.id], true) : 'CHƯA MỞ') + '</span></div>' +
                '<div style="font-size:14px;font-weight:900;line-height:1.3;min-height:36px;display:flex;align-items:center">' + esc(NCT.ui.locTitle(l)) + '</div><div style="flex:1"></div>' +
                (open ? '<button type="button" class="btn sm" style="width:100%" data-open="' + l.id + '">Xem kỉ niệm</button>' : '<div style="font-size:12px;font-weight:700;color:#5c5247;min-height:44px;display:flex;align-items:center">Đi đến nơi này trên bản đồ để mở khóa</div>') + '</div>';
            }).join('') + '</div></section>' : '') +
          '<section><h2 style="margin:0 0 12px;font-size:22px">' + (mine ? 'Kỷ niệm của bạn' : 'Kỷ niệm của ' + esc(u.name)) + '</h2><div data-wall></div></section></div></div></div>';
        NCT.memories.renderWall(el.querySelector('[data-wall]'), mems, load, { showLoc: true });
        el.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { NCT.checkins.open(NCT.ui.loc(b.getAttribute('data-open'))); }); });
        var ed = el.querySelector('[data-edit]'); if (ed) ed.addEventListener('click', function () { edit(u); });
      });
    }
    function edit(u) {
      var m = NCT.ui.modal('<form style="padding:22px;display:flex;flex-direction:column;gap:14px"><h2 style="margin:0;font-size:22px">Sửa thông tin</h2>' +
        '<div><label class="lbl" for="e-n">Họ tên</label><input id="e-n" class="inp" name="name" maxlength="40" value="' + esc(u.name) + '"></div>' +
        '<div><label class="lbl" for="e-c">Lớp</label><input id="e-c" class="inp" name="className" maxlength="10" value="' + esc(u.className || '') + '"></div>' +
        '<div class="grid-2"><div><label class="lbl" for="e-g">Giới tính</label><select id="e-g" class="inp" name="gender"><option value="m">Nam</option><option value="f">Nữ</option></select></div>' +
        '<div><label class="lbl" for="e-s">Sọc đồng phục</label><select id="e-s" class="inp" name="stripe"><option value="y">Vàng</option><option value="w">Trắng</option><option value="b">Xanh dương</option></select></div></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn ghost" data-close>Huỷ</button><button type="submit" class="btn">Lưu</button></div></form>', { maxWidth: 480, center: true, label: 'Sửa thông tin' });
      var f = m.el.querySelector('form'); f.gender.value = u.gender; f.stripe.value = u.stripe;
      f.addEventListener('submit', function (e) { e.preventDefault(); NCT.api.updateUser(u.id, { name: f.name.value.trim() || u.name, className: f.className.value.trim(), gender: f.gender.value, stripe: f.stripe.value }).then(function () { m.close(); NCT.router.render(); }); });
    }
    load();
  } };
})();
