/* ============================================================
 * modules/memories — ô viết kỷ niệm + tường kỷ niệm (4 cột) + trang tổng hợp
 * API: NCT.api.memories (GET /memories) · NCT.api.createMemory (POST /memories)
 * Cards embed modules/reactions and open modules/comments.
 * ============================================================ */
(function () {
  var esc = NCT.esc;

  function cardHTML(m, opts) {
    opts = opts || {};
    var l = NCT.ui.loc(m.locationId), a = m.author || {};
    return '<article class="mcard" role="listitem" data-mem="' + m.id + '">' +
      (opts.showLoc && l ? '<a class="loc" href="#/memories?loc=' + l.id + '">' + NCT.ui.ico(l.icon, 18) + esc(NCT.ui.locTitle(l)) + '</a>' : '') +
      (m.img ? '<img class="ph" src="' + esc(m.img) + '" alt="Ảnh kỷ niệm của ' + esc(a.name) + '">' : '') +
      (m.text ? '<p class="txt">' + esc(m.text) + '</p>' : '') +
      '<div class="by"><a href="#/u/' + esc(m.userId) + '" style="color:#2b2622;font-weight:800;font-size:13px;text-decoration:none">' + esc(a.name) + '</a><span>' + esc(NCT.ui.roleLabel(a.role)) + (a.className ? ' · ' + esc(a.className) : '') + ' · ' + esc(NCT.ui.years(a)) + ' · ' + NCT.ui.date(m.at) + '</span></div>' +
      '<div class="acts">' + NCT.reactions.barHTML(m) +
      '<button type="button" class="react cmt-btn" data-comments="' + m.id + '" aria-label="Bình luận (' + m.commentCount + ')">' + NCT.svg.chat + m.commentCount + '</button></div></article>';
  }

  function renderWall(el, list, refresh, opts) {
    el.innerHTML = list.length ? '<div class="wall" role="list">' + list.map(function (m) { return cardHTML(m, opts); }).join('') + '</div>'
      : '<div class="empty">Chưa có kỷ niệm nào ở đây. Hãy là người đầu tiên ghi lại.</div>';
    NCT.reactions.bind(el, refresh);
    el.querySelectorAll('[data-comments]').forEach(function (b) { b.addEventListener('click', function () { NCT.comments.open(b.getAttribute('data-comments'), refresh); }); });
  }

  function composer(el, l, onSaved) {
    var s = { text: '', img: '' };
    function paint() {
      el.innerHTML = '<form style="border:3px solid #2b2622;border-radius:4px;background:#fff;padding:18px;display:flex;flex-direction:column;gap:12px" novalidate>' +
        '<label class="lbl" for="mem-t" style="margin:0">Kỷ niệm của bạn tại ' + esc(l.name) + '</label>' +
        '<textarea id="mem-t" class="inp" rows="5" maxlength="300" placeholder="Bạn nhớ điều gì ở nơi này? Một người bạn, một buổi học, một câu chuyện…" style="resize:vertical;min-height:140px;line-height:1.6;font-weight:500">' + esc(s.text) + '</textarea>' +
        (s.img ? '<div style="position:relative;align-self:flex-start"><img src="' + s.img + '" alt="Ảnh kỷ niệm đã chọn" style="display:block;max-width:240px;max-height:180px;border:3px solid #2b2622;border-radius:3px"><button type="button" class="btn red sm" data-clear style="position:absolute;top:6px;right:6px;min-height:32px;padding:2px 8px" aria-label="Bỏ ảnh">Bỏ</button></div>' : '') +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">' +
        '<label class="btn ghost sm upl"><input type="file" accept="image/*" class="sr-only" data-file><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="4" width="14" height="11" fill="none" stroke="#2b2622" stroke-width="2"/><circle cx="9" cy="9.5" r="2.6" fill="none" stroke="#2b2622" stroke-width="2"/><path d="M6 4 L7 2 L11 2 L12 4" fill="none" stroke="#2b2622" stroke-width="2"/></svg>Thêm ảnh kỷ niệm</label>' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="pix muted" style="font-size:12px" data-len>' + s.text.length + '/300</span>' +
        '<button type="submit" class="btn"' + (!s.text.trim() && !s.img ? ' disabled' : '') + '>Lưu kỷ niệm</button></div></div></form>';
      var f = el.querySelector('form'), ta = el.querySelector('textarea');
      ta.addEventListener('input', function () { s.text = ta.value; el.querySelector('[data-len]').textContent = s.text.length + '/300'; f.querySelector('[type=submit]').disabled = !s.text.trim() && !s.img; });
      var c = el.querySelector('[data-clear]'); if (c) c.addEventListener('click', function () { s.img = ''; paint(); });
      el.querySelector('[data-file]').addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        var r = new FileReader();
        r.onload = function () { var img = new Image(); img.onload = function () {
          var sc = Math.min(1, 900 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
          cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          s.img = cv.toDataURL('image/jpeg', 0.8); paint();
        }; img.src = String(r.result); };
        r.readAsDataURL(file);
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var txt = s.text.trim();
        if (!txt && !s.img) return;
        if (txt.length > 0 && txt.length < 5) {
          NCT.ui.toast('Nội dung kỷ niệm tối thiểu 5 ký tự.');
          return;
        }
        var btn = f.querySelector('[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

        NCT.api.createMemory({ locationId: l.id, text: txt, img: s.img }).then(function (res) {
          NCT.sound.sfx('save');
          s.text = '';
          s.img = '';
          paint();
          NCT.ui.toast('Kỷ niệm của bạn đã được lưu thành công!');
          if (onSaved) onSaved();
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = 'Lưu kỷ niệm'; }
          var msg = (err && (err.message || (err.data && err.data.message))) || 'Không thể lưu kỷ niệm. Vui lòng thử lại.';
          NCT.ui.toast(msg);
        });
      });
    }
    paint();
  }

  NCT.memories = { cardHTML: cardHTML, renderWall: renderWall, composer: composer };

  /* ---- page #/memories ---- */
  NCT.modules.memories = { render: function (el, ctx) {
    var f = { loc: ctx.params.loc || '', sort: ctx.params.sort || 'new' };
    el.innerHTML = '<div class="page"><div class="page-head"><div><h1 style="font-family:\'League Spartan\',sans-serif;font-weight:900;letter-spacing:-0.01em">TƯỜNG KỶ NIỆM</h1><p>Những câu chuyện các thế hệ NCT-er để lại ở từng góc trường.</p></div>' +
      '<div class="chips" role="group" aria-label="Sắp xếp"><button type="button" class="chip" data-sort="new">Mới nhất</button><button type="button" class="chip" data-sort="top">Nhiều cảm xúc</button></div></div>' +
      '<div class="chips" role="group" aria-label="Lọc theo địa điểm" style="margin-bottom:16px"><button type="button" class="chip" data-loc="">Tất cả</button>' +
      NCT.C.LOCS.map(function (l) { return '<button type="button" class="chip" data-loc="' + l.id + '">' + NCT.ui.ico(l.icon, 18) + esc(l.name) + '</button>'; }).join('') + '</div>' +
      '<div data-wall></div></div>';
    var wall = el.querySelector('[data-wall]');
    function load() {
      el.querySelectorAll('[data-loc]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-loc') === f.loc)); });
      el.querySelectorAll('[data-sort]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sort') === f.sort)); });
      NCT.api.memories({ locationId: f.loc || undefined, sort: f.sort }).then(function (list) { renderWall(wall, list, load, { showLoc: true }); });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      if (b.hasAttribute('data-loc')) f.loc = b.getAttribute('data-loc'); else f.sort = b.getAttribute('data-sort'); load();
    });
    load();
    if (ctx.id) NCT.comments.open(ctx.id, load);
  } };
})();
