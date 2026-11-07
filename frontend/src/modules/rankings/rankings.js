/* ============================================================
 * modules/rankings — bảng xếp hạng: dấu mộc · kỷ niệm · cảm xúc nhận được · niên khoá
 * API: NCT.api.rankings (GET /rankings?type=)
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  var TABS = [{ id: 'stamps', label: 'Dấu mộc', unit: 'dấu' }, { id: 'memories', label: 'Kỷ niệm', unit: 'kỷ niệm' }, { id: 'reactions', label: 'Cảm xúc nhận được', unit: 'lượt' }, { id: 'cohort', label: 'Theo niên khoá', unit: '' }];
  NCT.modules.rankings = { render: function (el, ctx) {
    var tab = ctx.params.type || 'stamps';
    el.innerHTML = '<div class="page"><div class="page-head"><div><h1 style="font-family:\'League Spartan\',sans-serif;font-weight:900;letter-spacing:-0.01em">BẢNG XẾP HẠNG</h1><p>Ai đã đi khắp trường và để lại nhiều kỷ niệm nhất?</p></div>' +
      '<div class="chips" role="tablist">' + TABS.map(function (t) { return '<button type="button" class="chip" role="tab" data-t="' + t.id + '">' + t.label + '</button>'; }).join('') + '</div></div><div data-body></div></div>';
    var body = el.querySelector('[data-body]');
    function load() {
      el.querySelectorAll('[data-t]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === tab)); b.setAttribute('aria-selected', String(b.getAttribute('data-t') === tab)); });
      var unit = TABS.filter(function (t) { return t.id === tab; })[0].unit;
      NCT.api.rankings(tab).then(function (rows) {
        if (tab === 'cohort') {
          body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Niên khoá</th><th>Thành viên</th><th>Dấu mộc</th><th>Kỷ niệm</th></tr></thead><tbody>' +
            rows.map(function (r, i) { return '<tr><td class="rank-no" style="font-size:18px">' + (i + 1) + '</td><td><b>' + esc(r.cohort) + '</b></td><td>' + r.members + '</td><td>' + r.stamps + '</td><td>' + r.memories + '</td></tr>'; }).join('') + '</tbody></table></div>';
          return;
        }
        var top = rows.slice(0, 3), rest = rows.slice(3);
        var pod = function (r, cls, n) { return r ? '<a class="pod ' + cls + '" href="#/u/' + r.user.id + '" style="color:#2b2622;text-decoration:none"><div class="rank-no">' + n + '</div><span class="rank-av ' + NCT.ui.avClass(r.user) + '" style="display:block"></span><b class="pod-name">' + esc(r.user.name) + '</b><div class="pod-info muted">' + esc(NCT.ui.years(r.user)) + '</div><div class="rank-score">' + r.score + ' ' + unit + '</div></a>' : '<div></div>'; };
        body.innerHTML = '<div class="podium">' + pod(top[1], 'p2', 2) + pod(top[0], 'p1', 1) + pod(top[2], 'p3', 3) + '</div>' +
          '<div class="tbl-wrap">' + rest.map(function (r, i) {
            return '<a class="rank-row" href="#/u/' + r.user.id + '" style="color:#2b2622;text-decoration:none"><span class="rank-no">' + (i + 4) + '</span><span class="rank-av ' + NCT.ui.avClass(r.user) + '"></span>' +
              '<span><b>' + esc(r.user.name) + '</b><br><small class="muted">' + esc(NCT.ui.roleLabel(r.user.role)) + (r.user.className ? ' · ' + esc(r.user.className) : '') + ' · ' + esc(NCT.ui.years(r.user)) + '</small></span><span class="rank-score">' + r.score + '</span></a>';
          }).join('') + '</div>';
      });
    }
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { tab = b.getAttribute('data-t'); load(); } });
    load();
  } };
})();
