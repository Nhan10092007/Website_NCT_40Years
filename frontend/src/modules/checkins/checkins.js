/* ============================================================
 * modules/checkins — popup nhận dấu mộc + màn check-in tại một địa điểm
 * API: NCT.api.checkin (POST /checkins) · memories of the location via modules/memories
 * ============================================================ */
(function () {
  var esc = NCT.esc;
  var stamp = function (l, size, date, extra) {
    var icoHtml = '';
    if (l.iconSvg) {
      icoHtml = '<span class="ico-custom" style="width:' + Math.round(size * 0.37) + 'px;height:' + Math.round(size * 0.37) + 'px;display:flex;align-items:center;justify-content:center">' + l.iconSvg + '</span>';
    } else if (l.iconImg) {
      icoHtml = '<span class="ico" style="width:' + Math.round(size * 0.37) + 'px;height:' + Math.round(size * 0.37) + 'px;background-image:url(' + l.iconImg + ');background-size:100% 100%"></span>';
    } else {
      icoHtml = NCT.ui.ico(l.icon, Math.round(size * 0.37));
    }
    return '<div class="stamp ' + (extra || '') + '" style="width:' + size + 'px;height:' + size + 'px;color:' + l.ink + '">' +
      '<span class="pix" style="font-size:11px;font-weight:700">NCT · 40 NĂM</span>' + icoHtml +
      '<span class="pix" style="font-size:11px;font-weight:700">' + l.no + (date ? ' · ' + date : '') + '</span></div>';
  };
  NCT.checkins = {
    stamp: stamp,
    /* first visit: reward popup, then straight into the check-in screen */
    unlock: function (l) {
      NCT.sound.sfx('unlock');
      var m = NCT.ui.modal('<div style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">' +
        '<div class="pix" style="font-size:13px;color:#2f6b5c">ĐỊA ĐIỂM MỚI · ' + Number(l.no) + '/' + NCT.C.LOCS.length + '</div>' + stamp(l, 150, NCT.ui.date(new Date().toISOString()), 'stamp-in') +
        '<h2 style="margin:0;font-size:26px">' + esc(NCT.ui.locTitle(l)) + '</h2><div style="font-size:15px;font-weight:700;color:#2f6b5c">Bạn vừa nhận được một dấu mộc!</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;width:100%"><button type="button" class="btn" style="flex:1 1 160px" data-go>Check-in ngay</button><button type="button" class="btn ghost" style="flex:1 1 160px" data-close>Tiếp tục khám phá</button></div></div>',
        { maxWidth: 440, center: true, label: 'Nhận dấu mộc ' + l.name });
      var t = setTimeout(function () { if (!m.el.parentNode) return; m.close(); if (l.id !== 'stairs') NCT.checkins.open(l); }, 2200);
      m.el.querySelector('[data-go]').addEventListener('click', function () { clearTimeout(t); m.close(); NCT.checkins.open(l); });
      m.el.querySelector('[data-close]').addEventListener('click', function () { clearTimeout(t); });
    },
    /* check-in screen: clip, stamp, story, composer, memory wall of this place */
    open: function (l) {
      var ci = NCT.api.myCheckinsSync().filter(function (c) { return c.locationId === l.id; })[0];
      var icoStamp = '';
      if (l.iconSvg) {
        icoStamp = '<span class="ico-custom" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center">' + l.iconSvg + '</span>';
      } else if (l.iconImg) {
        icoStamp = '<span class="ico" style="width:34px;height:34px;background-image:url(' + l.iconImg + ');background-size:100% 100%"></span>';
      } else {
        icoStamp = NCT.ui.ico(l.icon, 34);
      }
      var m = NCT.ui.modal(
        '<div style="position:relative;width:100%;aspect-ratio:16/7;overflow:hidden;border-bottom:3px solid #2b2622;background:#3d4a3a">' +
        '<video class="vid" src="' + l.video + '" poster="assets/img/landscape.png" autoplay muted loop playsinline aria-label="Clip góc trường ' + esc(l.name) + '"></video>' +
        '<div style="position:absolute;left:12px;top:12px;background:#2b2622;color:#fffaf0;font-size:12px;font-weight:700;padding:6px 10px;border-radius:3px">' + esc(NCT.ui.locTitle(l)) + '</div>' +
        '<button type="button" class="btn ghost sm" style="position:absolute;right:12px;top:12px" data-close aria-label="Đóng check-in">Đóng</button></div>' +
        '<div style="padding:24px;display:flex;flex-direction:column;gap:22px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:14px">' +
        '<div class="stamp" style="width:72px;height:72px;color:' + l.ink + ';transform:rotate(-7deg);border-width:3px">' + icoStamp + '</div>' +
        '<div><div class="pix" style="font-size:12px;color:#2f6b5c">CHECK-IN · ' + l.no + '</div><h2 style="margin:2px 0 0;font-size:28px">' + esc(NCT.ui.locTitle(l)) + '</h2></div></div>' +
        (ci ? '<div style="font-size:13px;color:#5c5247">Dấu mộc nhận ngày <strong style="color:#2b2622">' + NCT.ui.date(ci.at) + '</strong></div>' : '') + '</div>' +
        '<p style="margin:0;font-size:15px;line-height:1.7;color:#3d362f;text-align:justify">' + esc(l.desc) + '</p>' +
        '<div data-composer></div>' +
        '<section style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0;font-size:18px">Kỷ niệm tại đây <span class="pix muted" data-n style="font-size:14px"></span></h3><div data-wall></div></section>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end"><a class="btn mint" href="#/me">Sổ dấu mộc</a><button type="button" class="btn ghost" data-close>Quay lại khám phá</button></div></div>',
        { maxWidth: 1000, label: 'Check-in ' + l.name });
      var wall = m.el.querySelector('[data-wall]'), n = m.el.querySelector('[data-n]');
      var refresh = function () { NCT.api.memories({ locationId: l.id }).then(function (list) { n.textContent = '(' + list.length + ')'; NCT.memories.renderWall(wall, list, refresh); }); };
      NCT.memories.composer(m.el.querySelector('[data-composer]'), l, refresh);
      refresh();
    }
  };
  NCT.modules.checkins = { render: function (el) { el.innerHTML = ''; } };
})();
