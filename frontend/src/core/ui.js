/* ============================================================
 * core/ui.js — shared view helpers (escape, avatar, icon, modal, toast, name tag)
 * ============================================================ */
window.NCT = window.NCT || {};
NCT.modules = NCT.modules || {};
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  NCT.esc = esc;
  var ROLE = { hs: 'Học sinh', chs: 'Cựu học sinh', gv: 'Giáo viên', admin: 'Ban tổ chức' };

  NCT.ui = {
    roleLabel: function (r) { return ROLE[r] || ''; },
    avClass: function (u) { return 'avatar av-' + ((u && u.gender) || 'm') + '-' + ((u && u.stripe) || 'y'); },
    avatar: function (u, cls) { return '<span class="' + NCT.ui.avClass(u) + ' ' + (cls || '') + '" aria-hidden="true"></span>'; },
    ico: function (idx, size) {
      if (typeof idx === 'string') return '<span class="ico" aria-hidden="true" style="width:' + (size || 24) + 'px;height:' + (size || 24) + 'px;background-image:url(' + idx + ');background-size:100% 100%"></span>';
      return '<span class="ico" aria-hidden="true" style="width:' + (size || 24) + 'px;height:' + (size || 24) + 'px;background-position:' + (idx * 100 / 9).toFixed(4) + '% 0"></span>';
    },
    loc: function (id) {
      var all = NCT.C.LOCS.concat(NCT.C.PREVIEW_LOCS || []);
      return all.filter(function (l) { return l.id === id; })[0] || null;
    },
    locTitle: function (l) {
      if (!l) return '';
      return (l.no ? Number(l.no) + ' - ' : '') + l.name;
    },
    date: function (iso, short) {
      if (!iso) return ''; var d = new Date(iso), dd = ('0' + d.getDate()).slice(-2), mm = ('0' + (d.getMonth() + 1)).slice(-2);
      return short ? dd + '.' + mm + '.' + String(d.getFullYear()).slice(-2) : dd + '.' + mm + '.' + d.getFullYear();
    },
    years: function (u) { return u ? u.sy + '–' + u.ey : ''; },
    nametag: function (u) {
      return '<div class="nametag" role="group" aria-label="Bảng tên">' +
        '<div class="nt-top"><span class="nt-s">TRƯỜNG TRUNG HỌC PHỔ THÔNG</span><span class="nt-b">NGUYỄN CÔNG TRỨ</span></div>' +
        '<div class="nt-row"><span class="nt-name">' + esc(u ? u.name : 'Hành khách') + '</span><span class="nt-cls">' + esc(NCT.ui.roleLabel(u && u.role)) +
        (u && u.className ? ' · ' + esc(u.className) : '') + '<br>' + esc(NCT.ui.years(u)) + '</span></div></div>';
    },
    toast: function (msg) {
      var host = document.querySelector('.toast-host');
      if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
      var t = document.createElement('div'); t.className = 'toast pop'; t.textContent = msg; host.appendChild(t);
      setTimeout(function () { t.remove(); }, 2600);
    },
    /* modal(html, { maxWidth, center, label, onClose }) → { el, close } */
    modal: function (html, o) {
      o = o || {};
      var back = document.createElement('div');
      back.className = 'modal-back' + (o.center ? ' center' : '');
      back.innerHTML = '<div class="modal pop" role="dialog" aria-modal="true" aria-label="' + esc(o.label || '') + '" style="max-width:' + (o.maxWidth || 880) + 'px">' + html + '</div>';
      document.body.appendChild(back);
      var prev = document.activeElement;
      var close = function () {
        if (!back.parentNode) return;
        back.remove(); document.removeEventListener('keydown', onKey);
        if (o.onClose) o.onClose();
        NCT.bus.emit('modal:closed');
        if (prev && prev.focus && document.body.contains(prev)) { try { prev.focus({ preventScroll: true }); } catch (e) {} }
      };
      var onKey = function (e) { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
      back.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
      var first = back.querySelector('button,[href],input,textarea,select');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
      NCT.bus.emit('modal:open');
      return { el: back, close: close };
    },
    openModals: function () { return document.querySelectorAll('.modal-back').length; }
  };

  /* tiny event bus */
  var subs = {};
  NCT.bus = {
    on: function (ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return function () { subs[ev] = subs[ev].filter(function (f) { return f !== fn; }); }; },
    emit: function (ev, data) { (subs[ev] || []).slice().forEach(function (f) { f(data); }); }
  };

  /* pixel icons used by the shell (inline stroke SVG, never emoji) */
  NCT.svg = {
    map: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 4l4-2 6 2 4-2v12l-4 2-6-2-4 2z M6 2v12 M12 4v12" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    wall: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="2" width="6" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="2" width="6" height="5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="12" width="6" height="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="9" width="6" height="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    trophy: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 2h8v4a4 4 0 0 1-8 0z M5 4H2v1a3 3 0 0 0 3 3 M13 4h3v1a3 3 0 0 1-3 3 M9 10v4 M5 16h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 17c1-4 4-6 7-6s6 2 7 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V4z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#2b2622" stroke-width="2"/><path d="M11 11l4 4" stroke="#2b2622" stroke-width="2"/></svg>',
    chat: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v8H7l-3 3v-3H2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    love: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12L2 7a3 3 0 0 1 5-4 3 3 0 0 1 5 4z" fill="#d9433b" stroke="#2b2622" stroke-width="1.5"/></svg>',
    miss: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="#7fd1b9" stroke="#2b2622" stroke-width="1.5"/><path d="M4.5 6h1.5M8 6h1.5M5 9.5q2 -1.5 4 0" stroke="#2b2622" stroke-width="1.2" fill="none"/></svg>',
    laugh: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="#f2c94c" stroke="#2b2622" stroke-width="1.5"/><path d="M4.5 5.5h1.5M8 5.5h1.5M4.5 8q2.5 3 5 0z" stroke="#2b2622" stroke-width="1.2" fill="#2b2622"/></svg>',
    proud: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l1.8 3.8 4 .5-3 2.8.8 4L7 10.2 3.4 12.1l.8-4-3-2.8 4-.5z" fill="#f2c94c" stroke="#2b2622" stroke-width="1.3"/></svg>'
  };
})();
