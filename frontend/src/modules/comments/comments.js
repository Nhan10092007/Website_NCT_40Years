/* ============================================================
 * modules/comments — bình luận dưới một kỷ niệm (mở dạng popup chi tiết)
 * API: NCT.api.comments (GET /memories/:id/comments) · NCT.api.addComment (POST)
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  NCT.comments = {
    open: function (memoryId, onChange) {
      var m = NCT.ui.modal('<div data-body style="padding:22px"></div>', { maxWidth: 640, label: 'Kỷ niệm và bình luận', onClose: onChange });
      var body = m.el.querySelector('[data-body]');
      function load() {
        Promise.all([NCT.api.memory(memoryId), NCT.api.comments(memoryId)]).then(function (r) {
          var mem = r[0], list = r[1]; if (!mem) { body.innerHTML = '<div class="empty">Kỷ niệm này không còn.</div>'; return; }
          var l = NCT.ui.loc(mem.locationId);
          body.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px"><div class="lbl" style="margin:0">' + (l ? esc(NCT.ui.locTitle(l)) : '') + '</div><button type="button" class="btn ghost sm" data-close>Đóng</button></div>' +
            '<div style="max-width:420px;margin:0 auto 18px">' + NCT.memories.cardHTML(mem).replace('<button type="button" class="react cmt-btn"', '<button type="button" hidden class="react cmt-btn"') + '</div>' +
            '<h3 style="margin:0 0 12px;font-size:16px">Bình luận (' + list.length + ')</h3>' +
            '<div class="cmts">' + (list.length ? list.map(function (c) {
              return '<div class="cmt"><span class="av ' + NCT.ui.avClass(c.author) + '" aria-hidden="true"></span><div class="bub"><b>' + esc(c.author.name) + '</b>' + esc(c.text) + '<br><small>' + NCT.ui.date(c.at) + '</small></div></div>';
            }).join('') : '<div class="empty">Chưa có bình luận.</div>') + '</div>' +
            '<form data-form style="display:flex;gap:8px;margin-top:14px"><label class="sr-only" for="cmt-in">Viết bình luận</label><input id="cmt-in" class="inp" maxlength="200" placeholder="Viết bình luận…" autocomplete="off"><button type="submit" class="btn">Gửi</button></form>';
          body.querySelector('[data-close]').addEventListener('click', m.close);
          NCT.reactions.bind(body, function () {
            load();
            if (onChange) onChange();
          });
          body.querySelector('[data-form]').addEventListener('submit', function (e) {
            e.preventDefault();
            var inp = body.querySelector('#cmt-in');
            var v = inp ? inp.value.trim() : '';
            if (!v) return;
            NCT.api.addComment(memoryId, v).then(function () {
              NCT.sound.sfx('save');
              if (inp) inp.value = '';
              load();
              if (onChange) onChange();
            }).catch(function (err) {
              NCT.ui.toast((err && err.message) || 'Lỗi gửi bình luận');
            });
          });
        });
      }
      load();
    }
  };
  NCT.modules.comments = { render: function (el) { el.innerHTML = ''; } };
})();
