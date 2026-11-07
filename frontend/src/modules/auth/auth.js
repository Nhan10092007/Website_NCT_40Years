/* ============================================================
 * modules/auth — Landing (cửa sổ tàu) + Vé thông hành (đăng ký / đăng nhập) + chuyển cảnh
 * API: NCT.api.register · NCT.api.login   (POST /auth/register · POST /auth/login)
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  var form = { tab: 'register', name: '', email: '', password: '', role: 'chs', gender: 'm', stripe: 'y', className: '', sy: 2023, ey: 2026, err: '' };

  function seg(name, items, cur) {
    return '<div class="seg">' + items.map(function (it) {
      var on = it.id === cur;
      return '<label><input type="radio" name="' + name + '" value="' + it.id + '"' + (on ? ' checked' : '') + '><span class="opt' + (on ? ' on' : '') + '">' +
        (it.color ? '<span class="sw" style="background:' + it.color + '"></span>' : '') + esc(it.label) +
        (on ? '<span class="tick" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 9 9"><path d="M1 4.5 L3.5 7 L8 1.5" stroke="#2b2622" stroke-width="2" fill="none"/></svg></span>' : '') + '</span></label>';
    }).join('') + '</div>';
  }
  function years(from, to, cur) { var o = ''; for (var y = from; y <= to; y++) o += '<option value="' + y + '"' + (y === Number(cur) ? ' selected' : '') + '>' + y + '</option>'; return o; }

  function ticketHTML() {
    var isGv = form.role === 'gv';
    var reg = form.tab === 'register';
    return '<div class="tabs" role="tablist">' +
      '<button type="button" role="tab" aria-selected="' + reg + '" data-tab="register">Nhận vé mới</button>' +
      '<button type="button" role="tab" aria-selected="' + !reg + '" data-tab="login">Đã có vé</button></div>' +
      '<div style="padding:20px;display:flex;flex-direction:column;gap:16px">' +
      '<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#5c5247">' +
      '<div><div class="lbl">Ga đi</div><div style="font-size:16px;font-weight:800;color:#2b2622">Hiện tại</div></div>' +
      '<div class="pix" style="align-self:center;font-size:18px;color:#2b2622" aria-hidden="true">&gt;&gt;&gt;</div>' +
      '<div style="text-align:right"><div class="lbl">Ga đến</div><div style="font-size:16px;font-weight:800;color:#2b2622">THPT Nguyễn Công Trứ</div></div></div>' +
      (reg ? (
        '<div><label class="lbl" for="f-name">Tên hành khách</label><input id="f-name" class="inp" name="name" maxlength="40" autocomplete="name" placeholder="Nhập họ và tên" value="' + esc(form.name) + '"></div>' +
        '<fieldset style="border:0;margin:0;padding:0;min-width:0"><legend class="lbl" style="padding:0">Hồ sơ</legend>' +
        seg('role', [{ id: 'hs', label: 'Học sinh' }, { id: 'chs', label: 'Cựu học sinh' }, { id: 'gv', label: 'Giáo viên' }], form.role) + '</fieldset>' +
        '<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap">' +
        '<div style="width:76px;height:76px;flex:none;border:3px solid #2b2622;border-radius:4px;background:#e9efe2;display:flex;align-items:center;justify-content:center" aria-hidden="true"><span class="avatar av-' + form.gender + '-' + form.stripe + '" style="display:block;width:64px;height:64px;background-position:0 0"></span></div>' +
        '<div style="flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:12px">' +
        '<fieldset style="border:0;margin:0;padding:0;min-width:0"><legend class="lbl" style="padding:0">Giới tính</legend>' + seg('gender', [{ id: 'm', label: 'Nam' }, { id: 'f', label: 'Nữ' }], form.gender) + '</fieldset>' +
        '<fieldset style="border:0;margin:0;padding:0;min-width:0"><legend class="lbl" style="padding:0">Sọc đồng phục</legend>' +
        seg('stripe', [{ id: 'y', label: 'Vàng', color: '#f2c230' }, { id: 'w', label: 'Trắng', color: '#f4f4f0' }, { id: 'b', label: 'Xanh dương', color: '#5fb2f0' }], form.stripe) + '</fieldset></div></div>' +
        '<div><div class="lbl" id="f-years">' + (isGv ? 'Thời gian công tác' : 'Niên khóa') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" role="group" aria-labelledby="f-years">' +
        '<div><label class="sr-only" for="f-sy">Năm bắt đầu</label><select id="f-sy" class="inp" name="sy">' + years(1986, 2026, form.sy) + '</select><div style="font-size:12px;color:#5c5247;margin-top:4px">' + (isGv ? 'Năm bắt đầu công tác' : 'Năm vào trường') + '</div></div>' +
        '<div><label class="sr-only" for="f-ey">Năm kết thúc</label><select id="f-ey" class="inp" name="ey"' + (isGv ? '' : ' disabled') + '>' + years(Number(form.sy) + 1, 2029, form.ey) + '</select></div></div></div>' +
        (isGv ? '' : '<div><label class="lbl" for="f-class">Lớp</label><input id="f-class" class="inp" name="className" maxlength="10" placeholder="VD: 12A1" value="' + esc(form.className) + '"></div>') +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">' +
        '<div><label class="lbl" for="f-email">Email</label><input id="f-email" class="inp" type="email" name="email" autocomplete="email" value="' + esc(form.email) + '"></div>' +
        '<div><label class="lbl" for="f-pass">Mật khẩu</label><input id="f-pass" class="inp" type="password" name="password" autocomplete="new-password"></div></div>'
      ) : (
        '<div><label class="lbl" for="l-email">Email</label><input id="l-email" class="inp" type="email" name="email" autocomplete="email" value="' + esc(form.email) + '"></div>' +
        '<div><label class="lbl" for="l-pass">Mật khẩu</label><input id="l-pass" class="inp" type="password" name="password" autocomplete="current-password"></div>' +
        '<div class="muted" style="font-size:13px">Tài khoản mẫu: <b>a@nct.demo</b> (cựu học sinh) · <b>admin@nct.demo</b> (quản trị) — mật khẩu bất kỳ.</div>'
      )) +
      (form.err ? '<div role="alert" style="font-size:14px;font-weight:700;color:#a8302a">' + esc(form.err) + '</div>' : '') +
      '<button type="submit" class="btn" style="width:100%;font-size:16px">' + (reg ? 'Lên tàu · Bắt đầu hành trình' : 'Đăng nhập & lên tàu') + '</button></div>' +
      '<div style="border-top:3px dashed #2b2622;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;background:#f3ead2">' +
      '<div class="pix" style="font-size:12px">TOA 40</div><div class="pix" style="font-size:12px">NCT-' + form.sy + '-' + form.ey + '</div></div>';
  }

  function landing(el) {
    el.innerHTML =
      '<div class="nct panel-wall" style="min-height:100vh;box-sizing:border-box;padding:0 16px 48px;display:flex;flex-direction:column;align-items:center">' +
      '<div style="width:100%;max-width:1120px;display:flex;flex-direction:column;gap:28px">' +
      '<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;background:#cfe6dc;padding:18px 0 24px;border-bottom:2px solid rgba(43,38,34,.16);margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;min-width:0"><img src="assets/img/logo-truong.png" alt="Logo 40 năm Trường THPT Nguyễn Công Trứ – Thắp chí vươn xa 1986–2026" style="display:block;height:84px;width:auto;flex-shrink:0">' +
      '<div style="display:flex;flex-direction:column;justify-content:center;gap:10px;padding-left:18px;border-left:3px solid #2b2622">' +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#2f6b5c;text-transform:uppercase;line-height:1;margin:0">Kỷ niệm 40 năm thành lập</div>' +
      '<h1 style="margin:6px 0 0;font-family:\'League Spartan\',sans-serif;font-size:clamp(24px,3.2vw,38px);line-height:1.15;font-weight:900;letter-spacing:-0.01em;color:#2b2622">CHUYẾN TÀU TIẾP NỐI</h1>' +
      '<div style="display:flex;align-items:center;gap:10px;line-height:1;margin:0"><span class="pix" style="background:#f2c94c;border:2px solid #2b2622;box-shadow:2px 2px 0 #2b2622;font-size:18px;font-weight:700;padding:2px 8px;line-height:1.2">40</span><span style="font-size:17px;font-weight:900">năm NCT</span></div></div></div>' +
      '<div style="font-family:\'League Spartan\',sans-serif;font-size:16px;font-weight:800;letter-spacing:.06em;color:#2f6b5c">1986 — 2026</div></header>' +
      '<div style="display:flex;flex-wrap:wrap;gap:28px;align-items:stretch">' +
      '<div style="flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:14px">' +
      '<div class="train" data-train style="background:#2f6b5c;border:3px solid #2b2622;border-radius:28px;padding:16px;box-shadow:5px 5px 0 #2b2622">' +
      '<div style="border:3px solid #2b2622;border-radius:16px;overflow:hidden;position:relative;background:#3d4a3a;aspect-ratio:16/9">' +
      '<video class="vid" src="assets/video/train-window.mp4" autoplay muted loop playsinline preload="auto" aria-label="Cảnh trường Nguyễn Công Trứ lướt qua ô cửa tàu"></video>' +
      '<div class="pole" aria-hidden="true"></div><div class="pole p2" aria-hidden="true"></div>' +
      '<div class="scene" aria-live="polite" style="position:absolute;left:14px;bottom:14px;background:rgba(43,38,34,.82);color:#fffaf0;font-size:13px;font-weight:700;padding:6px 10px;border-radius:3px;display:flex;gap:8px;align-items:center"><span class="pix" style="font-size:10px;color:#f2c94c">GA</span><span data-scene>Cổng trường</span></div>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.35) 0 18%,transparent 18% 26%,rgba(255,255,255,.18) 26% 30%,transparent 30%)" aria-hidden="true"></div></div>' +
      '<div style="height:14px;margin-top:12px;background:#24564a;border:3px solid #2b2622;border-radius:4px" aria-hidden="true"></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;max-width:560px"><p style="margin:0;font-size:22px;line-height:1.3;font-weight:900">Bạn nhớ Trứ?</p>' +
      '<p style="margin:0;font-size:16px;line-height:1.6;color:#3d362f">Có những góc trường tưởng chừng đã quá đỗi thân quen, nhưng liệu bạn còn nhớ hết những câu chuyện ẩn mình nơi ấy?</p>' +
      '<p style="margin:0;font-size:16px;line-height:1.6;color:#3d362f">Hay để chuyến tàu này đưa bạn đi tìm lại những điều tưởng chừng đã quên nhé!</p></div></div>' +
      '<form data-ticket class="pbox" style="flex:1 1 360px;min-width:0;max-width:460px;display:flex;flex-direction:column;overflow:hidden" novalidate>' +
      '<div style="background:#d9433b;color:#fffaf0;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:3px solid #2b2622">' +
      '<div style="font-size:15px;font-weight:900;letter-spacing:.12em">VÉ THÔNG HÀNH</div><div style="font-size:15px;font-weight:900;letter-spacing:.12em">BOARDING PASS</div></div>' +
      '<div data-ticket-body></div></form></div></div></div>';

    var tf = el.querySelector('[data-ticket]'), body = el.querySelector('[data-ticket-body]');
    function paint() { body.innerHTML = ticketHTML(); }
    paint();
    tf.addEventListener('click', function (e) { var t = e.target.closest('[data-tab]'); if (t) { form.tab = t.getAttribute('data-tab'); form.err = ''; paint(); } });
    tf.addEventListener('input', function (e) { var n = e.target.name; if (n === 'name' || n === 'email' || n === 'className') form[n] = e.target.value; if (n === 'password') form.password = e.target.value; });
    tf.addEventListener('change', function (e) {
      var n = e.target.name, v = e.target.value;
      if (n === 'role') { form.role = v; if (v !== 'gv') form.ey = Number(form.sy) + 3; paint(); }
      else if (n === 'gender' || n === 'stripe') { form[n] = v; paint(); }
      else if (n === 'sy') { form.sy = Number(v); if (form.role !== 'gv') form.ey = form.sy + 3; else if (form.ey <= form.sy) form.ey = Math.min(form.sy + 3, 2029); paint(); }
      else if (n === 'ey') { form.ey = Number(v); }
    });
    tf.addEventListener('submit', function (e) {
      e.preventDefault(); NCT.sound.unlock();
      var go = function () { setTimeout(function () { NCT.sound.sfx('horn'); }, 80); location.hash = '#/journey'; };
      if (form.tab === 'login') {
        if (!form.email.trim()) { form.err = 'Hãy nhập email đã đăng ký.'; paint(); return; }
        NCT.api.login(form.email.trim(), form.password).then(go, function (er) { form.err = er.message; paint(); });
        return;
      }
      if (!form.name.trim()) { form.err = 'Hãy nhập tên hành khách để nhận vé.'; paint(); return; }
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { form.err = 'Email chưa hợp lệ.'; paint(); return; }
      if ((form.password || '').length < 8) { form.err = 'Mật khẩu cần ít nhất 8 ký tự.'; paint(); return; }
      NCT.api.register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, gender: form.gender, stripe: form.stripe,
        className: form.role === 'gv' ? '' : form.className.trim(), sy: Number(form.sy), ey: Number(form.ey) }).then(go);
    });

    // train window: scene name + passing poles synced to the scrolling video
    var vid = el.querySelector('video'), train = el.querySelector('[data-train]'), sceneEl = el.querySelector('[data-scene]'), raf = 0, last = '';
    var tick = function () {
      if (vid) {
        var f = (NCT.C.WIN_V * (vid.currentTime || 0)) / NCT.C.WIN_P, frac = f - Math.floor(f);
        var moving = frac > 0.40 && frac < 0.62, name = NCT.C.WIN_NAMES[Math.round(f) % NCT.C.WIN_NAMES.length];
        train.classList.toggle('moving', moving);
        if (name !== last) { sceneEl.textContent = name; last = name; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { destroy: function () { cancelAnimationFrame(raf); } };
  }

  function journey(el, ctx) {
    var me = ctx.me;
    if (!me) { location.hash = '#/'; return; }
    el.innerHTML = '<div class="nct fadein" style="min-height:100vh;background:#2b2622;display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box">' +
      '<div style="width:100%;max-width:860px;display:flex;flex-direction:column;gap:20px;align-items:center">' +
      '<div style="width:100%;background:#2f6b5c;border:3px solid #fffaf0;border-radius:28px;padding:14px;box-sizing:border-box"><div style="border:3px solid #fffaf0;border-radius:16px;overflow:hidden;background:#bfe3f2"><div class="scenery fast" style="height:240px" aria-hidden="true"></div></div></div>' +
      '<div style="color:#fffaf0;font-size:clamp(20px,3vw,28px);font-weight:800;text-align:center">Chuyến tàu đang đưa ' + esc(me.name) + ' về NCT<span class="blink">…</span></div>' +
      '<div style="color:#d8cfbf;font-size:15px;text-align:center">' + esc(NCT.ui.roleLabel(me.role)) + ' · ' + esc(NCT.ui.years(me)) + '</div>' +
      '<div style="width:100%;max-width:420px;height:14px;border:3px solid #fffaf0;border-radius:3px;box-sizing:border-box;overflow:hidden"><div class="bar" style="height:100%;background:#f2c94c"></div></div>' +
      '<button type="button" class="btn ghost sm" data-skip>Bỏ qua</button></div></div>';
    var t = setTimeout(function () { location.hash = '#/map'; }, 2800);
    el.querySelector('[data-skip]').addEventListener('click', function () { clearTimeout(t); location.hash = '#/map'; });
    return { destroy: function () { clearTimeout(t); } };
  }

  NCT.modules.auth = { render: function (el, ctx) {
    if (ctx.view === 'journey') return journey(el, ctx);
    if (ctx.me) { location.hash = '#/map'; return; }
    return landing(el);
  } };
})();
