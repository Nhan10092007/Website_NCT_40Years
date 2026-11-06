/* ============================================================
 * modules/reactions — 4 cảm xúc cho mỗi kỷ niệm (mỗi người chọn 1, bấm lại để bỏ)
 * API: NCT.api.react (PUT /memories/:id/reactions { type })
 * ============================================================ */
(function () {
  var TYPES = [
    { id: 'love', label: 'Thương' },
    { id: 'miss', label: 'Nhớ quá' },
    { id: 'laugh', label: 'Vui ghê' },
    { id: 'proud', label: 'Tự hào' }
  ];
  NCT.reactions = {
    TYPES: TYPES,
    barHTML: function (m) {
      return TYPES.map(function (t) {
        var n = (m.reactions && m.reactions[t.id]) || 0, on = m.myReaction === t.id;
        return '<button type="button" class="react" data-react="' + t.id + '" data-mid="' + m.id + '" aria-pressed="' + on + '" aria-label="' + t.label + ' (' + n + ')" title="' + t.label + '">' + NCT.svg[t.id] + n + '</button>';
      }).join('');
    },
    bind: function (root, after) {
      root.querySelectorAll('[data-react]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var mid = b.getAttribute('data-mid');
          var rType = b.getAttribute('data-react');
          b.disabled = true;
          NCT.api.react(mid, rType).then(function () {
            NCT.sound.sfx('click');
            if (after) after();
          }).catch(function (err) {
            NCT.ui.toast((err && err.message) || 'Không thể thực hiện cảm xúc');
          }).finally(function () {
            b.disabled = false;
          });
        });
      });
    }
  };
  NCT.modules.reactions = { render: function (el) { el.innerHTML = ''; } };
})();
