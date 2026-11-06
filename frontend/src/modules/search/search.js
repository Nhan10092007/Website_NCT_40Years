/* ============================================================
 * modules/search — thanh tìm kiếm (header) + trang kết quả: họ tên, niên khoá, lớp, hồ sơ, địa điểm
 * API: NCT.api.search (GET /search?q=&cohort=&className=&role=&locationId=)
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  function years(cur) { var o = '<option value="">Mọi niên khoá</option>'; for (var y = 2029; y >= 1986; y--) o += '<option value="' + y + '"' + (String(y) === String(cur) ? ' selected' : '') + '>' + y + '</option>'; return o; }
  NCT.modules.search = { render: function (el, ctx) {
    var f = { q: ctx.params.q || '', cohort: ctx.params.cohort || '', className: ctx.params.className || '', role: ctx.params.role || '', locationId: ctx.params.loc || '' };
    el.innerHTML = '<div class="page"><div class="page-head"><div><h1>Tìm kiếm</h1><p>Tìm bạn cũ theo họ tên, niên khoá, lớp — hoặc kỷ niệm ở một góc trường.</p></div></div>' +
      '<form class="card" data-f style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:18px">' +
      '<div><label class="lbl" for="s-q">Từ khoá</label><input id="s-q" class="inp" name="q" type="search" placeholder="Họ tên, lớp, nội dung…" value="' + esc(f.q) + '"></div>' +
      '<div><label class="lbl" for="s-y">Niên khoá</label><select id="s-y" class="inp" name="cohort">' + years(f.cohort) + '</select></div>' +
      '<div><label class="lbl" for="s-c">Lớp</label><input id="s-c" class="inp" name="className" placeholder="VD: 12A1" value="' + esc(f.className) + '"></div>' +
      '<div><label class="lbl" for="s-r">Hồ sơ</label><select id="s-r" class="inp" name="role"><option value="">Tất cả</option><option value="hs">Học sinh</option><option value="chs">Cựu học sinh</option><option value="gv">Giáo viên</option></select></div>' +
      '<div><label class="lbl" for="s-l">Địa điểm</label><select id="s-l" class="inp" name="locationId"><option value="">Mọi nơi</option>' + NCT.C.LOCS.map(function (l) { return '<option value="' + l.id + '">' + esc(NCT.ui.locTitle(l)) + '</option>'; }).join('') + '</select></div>' +
      '<button type="submit" class="btn">Tìm</button></form>' +
      '<section aria-labelledby="r-u"><h2 id="r-u" class="lbl">Người</h2><div data-users class="grid-4" style="margin-bottom:22px"></div></section>' +
      '<section aria-labelledby="r-m"><h2 id="r-m" class="lbl">Kỷ niệm</h2><div data-mems></div></section></div>';
    var form = el.querySelector('[data-f]');
    form.role.value = f.role; form.locationId.value = f.locationId;
    if (window.matchMedia('(max-width:980px)').matches) form.style.gridTemplateColumns = 'minmax(0,1fr)';
    function run() {
      NCT.api.search(f).then(function (r) {
        el.querySelector('[data-users]').innerHTML = r.users.length ? r.users.map(function (u) {
          return '<a class="card" href="#/u/' + u.id + '" style="display:flex;gap:12px;align-items:center;color:#2b2622;text-decoration:none;padding:12px"><span class="rank-av ' + NCT.ui.avClass(u) + '"></span><span><b>' + esc(u.name) + '</b><br><small class="muted">' + esc(NCT.ui.roleLabel(u.role)) + (u.className ? ' · ' + esc(u.className) : '') + ' · ' + esc(NCT.ui.years(u)) + '</small></span></a>';
        }).join('') : '<div class="empty" style="grid-column:1/-1">Không tìm thấy ai khớp.</div>';
        NCT.memories.renderWall(el.querySelector('[data-mems]'), r.memories, run, { showLoc: true });
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); f = { q: form.q.value.trim(), cohort: form.cohort.value, className: form.className.value.trim(), role: form.role.value, locationId: form.locationId.value };
      run();
    });
    run();
  } };
})();
