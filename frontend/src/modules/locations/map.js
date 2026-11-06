/* ============================================================
 * modules/locations — Bản đồ pixel 15×15, 2 tầng, 4 cầu thang, 8 điểm check-in
 * API: NCT.api.locations (GET /locations) · NCT.api.myCheckins (GET /checkins?userId=me)
 * Hands off to modules/checkins when the player reaches a location.
 * ============================================================ */
(function () {
  var C = NCT.C, esc = NCT.esc, T = 100 / 15;

  NCT.modules.locations = { render: function (el, ctx) {
    var me = ctx.me, posKey = 'nct40.pos.' + me.id;
    var st = { pos: { x: C.START.x, y: C.START.y }, floor: 'g', dir: 3, frame: 0, lastMove: 0, padTimer: null, fx: false };
    try { var sp = JSON.parse(localStorage.getItem(posKey) || 'null'); if (sp && C.FLOORS[sp.floor] && C.FLOORS[sp.floor].grid[sp.pos.y][sp.pos.x] === '0') { st.pos = sp.pos; st.floor = sp.floor; } } catch (e) {}
    var savePos = function () { try { localStorage.setItem(posKey, JSON.stringify({ pos: st.pos, floor: st.floor })); } catch (e) {} };
    var unlocked = function () { var o = {}; NCT.api.myCheckinsSync().forEach(function (c) { o[c.locationId] = c.at; }); return o; };

    el.innerHTML =
      '<div class="page"><div class="playgrid">' +
      '<div class="guide" style="min-width:0;display:flex;flex-direction:column;gap:16px">' +
      '<aside class="pbox" style="padding:16px;display:flex;flex-direction:column;gap:12px" aria-labelledby="g-t"><h2 id="g-t" class="lbl" style="margin:0">Cách chơi</h2>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px" aria-hidden="true">' +
      '<div style="display:flex;gap:4px"><span class="keycap" style="visibility:hidden">·</span><span class="keycap">W</span><span class="keycap" style="visibility:hidden">·</span><span style="width:10px"></span><span class="keycap" style="visibility:hidden">·</span><span class="keycap">▲</span></div>' +
      '<div style="display:flex;gap:4px"><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span><span style="width:10px"></span><span class="keycap">◀</span><span class="keycap">▼</span><span class="keycap">▶</span></div></div>' +
      '<p style="margin:0;font-size:14px;line-height:1.6;color:#3d362f">Sử dụng các nút WASD / nút mũi tên trên máy tính hoặc nút điều khiển dưới bản đồ đi đến biểu tượng địa điểm để mở khóa và nhận dấu mộc.</p>' +
      '<p style="margin:0;font-size:14px;line-height:1.6;color:#3d362f">Ở mỗi địa điểm, hãy để lại những kỉ niệm đáng nhớ cùng Trứ bạn nhé!</p></aside>' +
      '<div class="pbox" style="padding:16px;display:flex;justify-content:center"><div style="display:grid;grid-template-columns:repeat(3,56px);grid-template-rows:repeat(3,56px);gap:4px" role="group" aria-label="Điều khiển di chuyển">' +
      '<span></span><button type="button" class="btn ghost" style="padding:0;min-height:56px" aria-label="Đi lên" data-pad="0,-1"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4 L17 14 L3 14 Z" fill="#2b2622"/></svg></button><span></span>' +
      '<button type="button" class="btn ghost" style="padding:0;min-height:56px" aria-label="Sang trái" data-pad="-1,0"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10 L14 3 L14 17 Z" fill="#2b2622"/></svg></button>' +
      '<button type="button" class="btn" style="padding:0;min-height:56px;font-size:12px" aria-label="Check-in tại điểm đang đứng" data-act>OK</button>' +
      '<button type="button" class="btn ghost" style="padding:0;min-height:56px" aria-label="Sang phải" data-pad="1,0"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10 L6 3 L6 17 Z" fill="#2b2622"/></svg></button>' +
      '<span></span><button type="button" class="btn ghost" style="padding:0;min-height:56px" aria-label="Đi xuống" data-pad="0,1"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16 L17 6 L3 6 Z" fill="#2b2622"/></svg></button><span></span></div></div></div>' +
      '<section class="mapcol" style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:10px" aria-label="Bản đồ trường">' +
      '<div class="game" tabindex="0" role="application" data-game style="width:100%;max-width:min(900px,calc(100vh - 96px));border:3px solid #2b2622;box-shadow:5px 5px 0 #2b2622;border-radius:4px;background:#9fae86">' +
      '<div style="position:relative;width:100%;aspect-ratio:1/1;overflow:hidden" data-stage>' +
      '<img data-base alt="" class="pixelated" style="position:absolute;inset:0;width:100%;height:100%;display:block">' +
      '<div data-zones></div>' +
      '<div data-cell aria-hidden="true" style="position:absolute;width:6.6667%;height:6.6667%;box-sizing:border-box;border:2px solid rgba(255,250,240,.9);outline:2px solid rgba(43,38,34,.55);outline-offset:-4px;transition:left .2s linear,top .2s linear"></div>' +
      '<div data-shadow aria-hidden="true" style="position:absolute;width:5%;height:1.6%;background:rgba(40,30,20,.35);border-radius:50%;transition:left .2s linear,top .2s linear"></div>' +
      '<div data-avatar aria-hidden="true" style="position:absolute;width:6.6667%;height:6.6667%"></div>' +
      '<img data-canopy src="assets/img/map-canopy.png" alt="" class="pixelated" style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity .25s">' +
      '<div data-sky aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;transition:background 2s,opacity 2s"></div>' +
      '<div data-glow aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen"></div>' +
      '<div data-stairs></div><div class="floorchip" aria-live="polite" data-chip></div><div data-markers></div><div data-fx></div>' +
      '</div></div></section>' +
      '<aside class="side" style="min-width:0;display:flex;flex-direction:column;gap:16px"><div class="pbox" style="padding:16px;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div class="lbl" style="margin:0">' + C.LOCS.length + ' điểm check-in</div><span class="pix" data-count style="font-size:12px"></span></div>' +
      '<ul data-list style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px"></ul>' +
      '<a class="btn mint sm" href="#/me" style="margin-top:4px">Sổ dấu mộc</a></div></aside>' +
      '</div></div>';

    var $ = function (s) { return el.querySelector(s); };
    var game = $('[data-game]');

    function locAt(x, y, floor) {
      for (var i = 0; i < C.LOCS.length; i++) { var z = C.zone(C.LOCS[i], floor); for (var j = 0; j < z.length; j++) if (z[j][0] === x && z[j][1] === y) return C.LOCS[i]; }
      return null;
    }
    function stairAt(x, y, floor) { for (var i = 0; i < C.STAIRS.length; i++) { var t = C.STAIRS[i][floor]; if (t[0] === x && t[1] === y) return C.STAIRS[i]; } return null; }
    function sky() {
      var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
      if (h >= 5 && h < 7) return { label: 'Bình minh', color: '#ffd2a1', opacity: 0.38 };
      if (h >= 7 && h < 16) return { label: 'Ban ngày', color: '#ffffff', opacity: 0 };
      if (h >= 16 && h < 18) return { label: 'Buổi chiều', color: '#ffb06a', opacity: 0.4 };
      if (h >= 18 && h < 19) return { label: 'Hoàng hôn', color: '#c67a92', opacity: 0.5 };
      return { label: 'Buổi tối', color: '#26356a', opacity: 0.6, night: true };
    }

    function update() {
      var FL = C.FLOORS[st.floor], un = unlocked(), sk = sky();
      var base = $('[data-base]'); if (base.getAttribute('src') !== FL.base) base.setAttribute('src', FL.base);
      var cov = FL.cover, under = !!(cov && cov[st.pos.y] && cov[st.pos.y][st.pos.x] === '1');
      var can = $('[data-canopy]'); can.hidden = !FL.canopy; can.style.opacity = under ? 0.45 : 0.96;
      var L = st.pos.x * T, Tp = st.pos.y * T;
      $('[data-cell]').style.left = L + '%'; $('[data-cell]').style.top = Tp + '%';
      var sh = $('[data-shadow]'); sh.style.left = (L + T * 0.125) + '%'; sh.style.top = (Tp + T * 0.78) + '%';
      var av = $('[data-avatar]'); av.className = NCT.ui.avClass(me); av.style.left = L + '%'; av.style.top = (Tp - 0.6) + '%';
      av.style.backgroundPosition = (st.frame ? 100 : 0) + '% ' + (st.dir * 100 / 3) + '%';
      var skyEl = $('[data-sky]'); skyEl.style.background = sk.color; skyEl.style.opacity = sk.opacity;
      $('[data-glow]').style.background = sk.night ? 'radial-gradient(circle at ' + (L + T / 2) + '% ' + (Tp + T / 2) + '%, rgba(255,214,140,.35) 0, rgba(255,214,140,0) 14%)' : 'none';
      $('[data-chip]').innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 11 H4 V8 H7 V5 H10 V2" stroke="#f2c94c" stroke-width="2" fill="none"/></svg>' + FL.label + ' · ' + sk.label;
      $('[data-stairs]').innerHTML = C.STAIRS.map(function (s) { var t = s[st.floor]; return '<span class="stairtag" style="left:' + ((t[0] + 0.5) * T) + '%;top:' + (t[1] * T + 0.4) + '%" aria-hidden="true">' + (st.floor === 'g' ? '▲ Tầng 1' : '▼ Tầng trệt') + '</span>'; }).join('');
      // zone tiles + markers
      var zh = '', mh = '', near = nearLoc();
      C.LOCS.forEach(function (l) {
        var open = !!un[l.id];
        C.zone(l, st.floor).forEach(function (z) { zh += '<div aria-hidden="true" style="position:absolute;left:' + (z[0] * T) + '%;top:' + (z[1] * T) + '%;width:6.6667%;height:6.6667%;box-sizing:border-box;border:2px dashed ' + (open ? 'rgba(63,122,54,.55)' : 'rgba(217,67,59,.7)') + ';background:' + (open ? 'rgba(127,209,185,.18)' : 'rgba(242,201,76,.28)') + '"></div>'; });
      });
      var allMarkers = C.LOCS;
      allMarkers.forEach(function (l) {
        if (!l.mk || (l.floor !== st.floor && l.floor !== 'both')) return;
        var open = !!un[l.id];
        var isNear = near && near.id === l.id;
        var icoInner = '';
        if (l.iconSvg) {
          icoInner = '<span class="ico-custom">' + l.iconSvg + '</span>';
        } else if (l.iconImg) {
          icoInner = '<span class="ico" style="background-image:url(' + l.iconImg + ');background-size:100% 100%"></span>';
        } else {
          icoInner = '<span class="ico" style="background-position:' + (l.icon * 100 / 9) + '% 0"></span>';
        }
        mh += '<button type="button" class="mk ' + (open ? 'open' : 'locked') + (isNear ? ' near' : '') + '" style="left:' + (l.mk[0] * T) + '%;top:' + (l.mk[1] * T) + '%" data-loc="' + l.id + '" aria-label="' + esc(NCT.ui.locTitle(l)) + (open ? ', đã mở khóa' : ', chưa mở khóa') + '">' +
          '<span class="badge">' + icoInner + '</span><span class="tip">' + esc(NCT.ui.locTitle(l)) + '</span>' +
          (open ? '<span class="chk"><svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M1 4.5 L3.5 7 L8 1.5" stroke="#fffaf0" stroke-width="2" fill="none"/></svg></span>' : '') + '</button>';
      });
      $('[data-zones]').innerHTML = zh; $('[data-markers]').innerHTML = mh;
      $('[data-fx]').innerHTML = st.fx ? '<div class="floorfx" aria-hidden="true"></div>' : '';
      // side list
      var cnt = 0;
      $('[data-list]').innerHTML = C.LOCS.map(function (l) {
        var open = !!un[l.id]; if (open) cnt++;
        var icoHtml = '';
        if (l.iconSvg) {
          icoHtml = '<span class="ico-custom" style="width:28px;height:28px;flex:none;' + (open ? '' : 'filter:grayscale(1) opacity(.55)') + '">' + l.iconSvg + '</span>';
        } else if (l.iconImg) {
          icoHtml = '<span class="ico" style="width:28px;height:28px;flex:none;background-image:url(' + l.iconImg + ');background-size:100% 100%;' + (open ? '' : 'filter:grayscale(1) opacity(.55)') + '"></span>';
        } else {
          icoHtml = '<span class="ico" style="width:28px;height:28px;flex:none;background-position:' + (l.icon * 100 / 9) + '% 0;filter:' + (open ? 'none' : 'grayscale(1) opacity(.55)') + '"></span>';
        }
        return '<li><button type="button" class="btn ghost" data-loc="' + l.id + '" style="width:100%;justify-content:flex-start;box-shadow:none;border-width:2px;padding:6px 10px;font-weight:700;background:' + (open ? '#fff6d6' : '#fffaf0') + '">' +
          icoHtml +
          '<span style="flex:1;text-align:left;display:flex;flex-direction:column;line-height:1.25"><span>' + esc(NCT.ui.locTitle(l)) + '</span><span style="font-size:11px;font-weight:600;color:#5c5247">' + (l.floor === 'both' ? '4 góc · cả 2 tầng' : C.FLOORS[l.floor].name) + '</span></span>' +
          '<span style="font-size:12px;font-weight:800;color:' + (open ? '#2f6b30' : '#5c5247') + '">' + (open ? 'Đã mở' : 'Chưa mở') + '</span></button></li>';
      }).join('');
      $('[data-count]').textContent = cnt + '/' + C.LOCS.length;
    }
    function nearLoc() {
      var best = null, bd = 99;
      var all = C.LOCS;
      all.forEach(function (l) {
        var z = C.zone(l, st.floor);
        if (z && z.length) {
          z.forEach(function (pt) { var d = Math.max(Math.abs(pt[0] - st.pos.x), Math.abs(pt[1] - st.pos.y)); if (d < bd) { bd = d; best = l; } });
        } else if (l.mk && (l.floor === st.floor || l.floor === 'both')) {
          var d = Math.max(Math.abs(l.mk[0] - st.pos.x), Math.abs(l.mk[1] - st.pos.y));
          if (d < bd) { bd = d; best = l; }
        }
      });
      return bd <= 2 ? best : null;
    }

    function move(dx, dy) {
      if (NCT.ui.openModals()) return;
      var now = Date.now(); if (now - st.lastMove < 200) return; st.lastMove = now;
      st.dir = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
      var nx = st.pos.x + dx, ny = st.pos.y + dy, grid = C.FLOORS[st.floor].grid;
      if (!(ny >= 0 && ny < C.N && nx >= 0 && nx < C.N && grid[ny][nx] === '0')) { NCT.sound.sfx('bump'); update(); return; }
      if (st.floor === 'g' && st.pos.y === 13 && ny === 14) { padStop(); return guard(nx, ny); }
      var prevLoc = locAt(st.pos.x, st.pos.y, st.floor), changedFloor = false;
      st.pos = { x: nx, y: ny }; st.frame = st.frame ? 0 : 1;
      var stp = stairAt(nx, ny, st.floor);
      if (stp && !stairAt(st.pos.x - dx, st.pos.y - dy, st.floor)) {
        var nf = st.floor === 'g' ? 'f1' : 'g'; st.floor = nf; st.pos = { x: stp[nf][0], y: stp[nf][1] }; changedFloor = true;
        st.fx = true; setTimeout(function () { st.fx = false; update(); }, 750);
        NCT.ui.toast(nf === 'f1' ? 'Bạn đã lên Tầng 1 — hành lang lầu 1' : 'Bạn đã xuống Tầng trệt'); NCT.sound.sfx(nf === 'f1' ? 'up' : 'down');
      } else NCT.sound.sfx('step');
      savePos(); update();
      var hit = locAt(st.pos.x, st.pos.y, st.floor), un = unlocked();
      if (hit && !un[hit.id]) {
        padStop();
        NCT.api.checkin(hit.id).then(function () { update(); NCT.checkins.unlock(hit); });
      } else if (hit && hit.id !== 'stairs' && !changedFloor && (!prevLoc || prevLoc.id !== hit.id)) {
        padStop(); NCT.checkins.open(hit);
      }
    }
    function act() {
      var here = locAt(st.pos.x, st.pos.y, st.floor) || nearLoc(), un = unlocked();
      if (here && un[here.id]) {
        NCT.checkins.open(here);
      } else {
        NCT.ui.toast(here ? 'Bước vào ô viền nét đứt để mở khóa trước nhé.' : 'Hãy đến gần một địa điểm để check-in.');
      }
    }
    function guard(nx, ny) {
      NCT.sound.sfx('whistle');
      var gv = me.role === 'gv';
      var opts = gv ? [['Ừ, tôi về đây. Chào anh nhé!', 'out', ''], ['Tôi quay lại lớp một chút đã.', 'back', '']]
        : [['Dạ, em quay vào lớp liền ạ!', 'back', 'Vậy mới ngoan. Vào lớp đi em!'], ['Dạ… em ra mua ổ bánh mì xíu thôi ạ…', 'back', 'Giờ học không ra ngoài được! Vào lớp mau!'], ['Dạ em xin phép về, em có giấy ra cổng ạ.', 'out', 'Ừ, đi đứng cẩn thận nghen em.']];
      var m = NCT.ui.modal('<div style="padding:22px;display:flex;flex-direction:column;gap:16px"><div class="lbl" style="margin:0">Cổng trường · Tiếng gọi từ chòi bảo vệ</div>' +
        '<p class="bubble" style="margin:0">' + (gv ? 'Dạ chào thầy/cô! Thầy cô về rồi hả, có cần con mở cổng không ạ?' : 'Ê, em lớp nào đó? Đi đâu đây?') + '</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' + opts.map(function (o, i) { return '<button type="button" class="btn ghost" data-opt="' + i + '" style="justify-content:flex-start;text-align:left;width:100%">' + esc(o[0]) + '</button>'; }).join('') + '</div></div>',
        { maxWidth: 520, center: true, label: 'Hỏi han ở cổng trường' });
      m.el.querySelectorAll('[data-opt]').forEach(function (b) { b.addEventListener('click', function () {
        var o = opts[Number(b.getAttribute('data-opt'))];
        if (o[1] === 'out') { st.pos = { x: nx, y: ny }; st.dir = 0; savePos(); } else st.dir = 3;
        m.close(); update(); if (o[2]) NCT.ui.toast('Bác bảo vệ: “' + o[2] + '”');
      }); });
    }
    function padStop() { if (st.padTimer) { clearInterval(st.padTimer); st.padTimer = null; } }

    // ---- input: keyboard on the whole view, d-pad hold-to-walk, refocus after popups ----
    var KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], W: [0, -1], s: [0, 1], S: [0, 1], a: [-1, 0], A: [-1, 0], d: [1, 0], D: [1, 0] };
    var onKey = function (e) {
      if (NCT.ui.openModals()) return;
      var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      if (KEYS[e.key]) { e.preventDefault(); move(KEYS[e.key][0], KEYS[e.key][1]); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target === game) { e.preventDefault(); act(); }
    };
    document.addEventListener('keydown', onKey);   // standalone build: page-level so focus never gets lost
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-loc]');
      if (b) {
        var l = NCT.ui.loc(b.getAttribute('data-loc'));
        if (!l) return;
        if (unlocked()[l.id]) NCT.checkins.open(l);
        else NCT.ui.toast('“' + l.name + '” chưa mở khóa — hãy đi đến đó trên bản đồ.');
        return;
      }
      if (e.target.closest('[data-act]')) { act(); return; }
      var p = e.target.closest('[data-pad]'); if (p && e.detail === 0) { st.lastMove = 0; var v = p.getAttribute('data-pad').split(','); move(+v[0], +v[1]); }
    });
    el.addEventListener('pointerdown', function (e) {
      var p = e.target.closest('[data-pad]'); if (!p || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var v = p.getAttribute('data-pad').split(','); padStop(); st.lastMove = 0; move(+v[0], +v[1]);
      st.padTimer = setInterval(function () { move(+v[0], +v[1]); }, 230);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, padStop); });
    var offClose = NCT.bus.on('modal:closed', function () { update(); setTimeout(function () { try { game.focus({ preventScroll: true }); } catch (e) {} }, 40); });
    var clock = setInterval(update, 60000);
    update(); setTimeout(function () { try { game.focus({ preventScroll: true }); } catch (e) {} }, 60);
    return { destroy: function () { document.removeEventListener('keydown', onKey); offClose(); clearInterval(clock); padStop(); } };
  } };
})();
