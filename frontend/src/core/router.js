/* ============================================================
 * core/router.js — hash router + app shell (top bar with nav + search)
 *   #/              auth      (vé thông hành: đăng ký / đăng nhập)
 *   #/journey       auth      (chuyển cảnh lên tàu)
 *   #/map           locations (bản đồ game + checkins)
 *   #/memories      memories  (tường kỷ niệm; comments + reactions bên trong)
 *   #/rankings      rankings
 *   #/search?q=     search
 *   #/me, #/u/:id   users
 *   #/admin         admin
 * ============================================================ */
window.NCT = window.NCT || {};
(function () {
  var current = null;
  var NAV = [
    { href: '#/map', label: 'Bản đồ', icon: 'map', mod: 'locations' },
    { href: '#/memories', label: 'Kỷ niệm', icon: 'wall', mod: 'memories' },
    { href: '#/rankings', label: 'Xếp hạng', icon: 'trophy', mod: 'rankings' },
    { href: '#/me', label: 'Hồ sơ', icon: 'user', mod: 'users' }
  ];
  function parse() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qs = h.indexOf('?') >= 0 ? h.slice(h.indexOf('?') + 1) : '';
    var path = h.split('?')[0];
    var params = {}; qs.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    var parts = path.split('/').filter(Boolean);
    return { path: path, parts: parts, params: params };
  }
  function route(r) {
    var p = r.parts[0] || '';
    if (p === '' ) return { mod: 'auth', view: 'ticket' };
    if (p === 'journey') return { mod: 'auth', view: 'journey' };
    if (p === 'map') return { mod: 'locations' };
    if (p === 'memories') return { mod: 'memories', id: r.parts[1] };
    if (p === 'rankings') return { mod: 'rankings' };
    if (p === 'search') return { mod: 'search' };
    if (p === 'me') return { mod: 'users' };
    if (p === 'u') return { mod: 'users', id: r.parts[1] };
    if (p === 'admin') return { mod: 'admin' };
    return { mod: 'auth', view: 'ticket' };
  }
  function shell(me, mod, params) {
    var nav = NAV.slice();
    if (me && me.role === 'admin') nav.push({ href: '#/admin', label: 'Quản trị', icon: 'shield', mod: 'admin' });
    return '<header class="topbar"><div class="wrap"><div class="pbox hdr bar-in">' +
      NCT.ui.nametag(me) +
      '<nav class="nav" aria-label="Điều hướng chính">' + nav.map(function (n) {
        return '<a href="' + n.href + '"' + (n.mod === mod ? ' aria-current="page"' : '') + '>' + NCT.svg[n.icon] + n.label + '</a>';
      }).join('') + '</nav>' +
      '<form class="search-box" role="search" data-search><label class="sr-only" for="q-top">Tìm kiếm</label>' + NCT.svg.search +
      '<input id="q-top" class="inp" name="q" type="search" placeholder="Tìm họ tên, niên khoá, lớp…" value="' + NCT.esc(mod === 'search' ? params.q || '' : '') + '"></form>' +
      '<button type="button" class="btn ghost sm iconbtn" data-sound aria-pressed="' + NCT.sound.pref.sound + '" aria-label="' + (NCT.sound.pref.sound ? 'Tắt âm thanh' : 'Bật âm thanh') + '">' +
      '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8 H7 L11 4 V16 L7 12 H3 Z" fill="#2b2622"/>' +
      (NCT.sound.pref.sound ? '<path d="M14 7 Q16 10 14 13 M16 5 Q19.5 10 16 15" stroke="#2b2622" stroke-width="2" fill="none"/>' : '<path d="M14 7 L19 13 M19 7 L14 13" stroke="#d9433b" stroke-width="2"/>') + '</svg></button>' +
      '<button type="button" class="btn ghost sm" data-music aria-pressed="' + NCT.sound.pref.music + '">' + (NCT.sound.pref.music ? 'Nhạc: Bật' : 'Nhạc: Tắt') + '</button>' +
      '<button type="button" class="btn ghost sm" data-logout>Đăng xuất</button>' +
      '<span class="mock-badge" style="background:#2f6b5c;color:#fffaf0" title="Đã kết nối Backend API Express / PostgreSQL">API Online</span>' +
      '</div></div></header><main id="view" class="wrap"></main>';
  }
  function bindShell(root) {
    var f = root.querySelector('[data-search]');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var q = f.q.value.trim(); location.hash = '#/search?q=' + encodeURIComponent(q); });
    var s = root.querySelector('[data-sound]');
    if (s) s.addEventListener('click', function () { NCT.sound.pref.sound = !NCT.sound.pref.sound; NCT.sound.save(); NCT.sound.unlock(); NCT.sound.bgm(current && current.mod === 'locations'); render(); });
    var m = root.querySelector('[data-music]');
    if (m) m.addEventListener('click', function () { NCT.sound.pref.music = !NCT.sound.pref.music; NCT.sound.save(); NCT.sound.unlock(); NCT.sound.bgm(current && current.mod === 'locations'); render(); });
    var lo = root.querySelector('[data-logout]');
    if (lo) lo.addEventListener('click', function () { NCT.api.logout().then(function () { location.hash = '#/'; }); });
  }
  function render() {
    var r = parse(), rt = route(r), me = NCT.api.meSync(), app = document.getElementById('app');
    if (!me && rt.mod !== 'auth') { location.hash = '#/'; return; }
    if (rt.mod === 'admin' && me.role !== 'admin') { location.hash = '#/map'; return; }
    if (current && current.destroy) current.destroy();
    document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
    var mod = NCT.modules[rt.mod];
    if (rt.mod === 'auth') { app.innerHTML = '<main id="view"></main>'; }
    else { app.innerHTML = shell(me, rt.mod, r.params); bindShell(app); }
    var view = document.getElementById('view');
    current = { mod: rt.mod, destroy: null };
    var res = mod.render(view, Object.assign({}, rt, { params: r.params, me: me }));
    if (res && res.destroy) current.destroy = res.destroy;
    NCT.sound.bgm(rt.mod === 'locations');
    document.title = 'Chuyến tàu tiếp nối – 40 năm NCT';
  }
  NCT.router = { render: render, go: function (h) { location.hash = h; } };
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);
})();
