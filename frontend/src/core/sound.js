/* ============================================================
 * core/sound.js — 8-bit SFX + chiptune loop (WebAudio, no files)
 * ============================================================ */
window.NCT = window.NCT || {};
(function () {
  var ac = null, bgm = null, stepAlt = false;
  var pref = { sound: true, music: true };
  try { var p = JSON.parse(localStorage.getItem('nct40.sound') || 'null'); if (p) pref = p; } catch (e) {}
  function audio() {
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tone(freq, dur, o) {
    o = o || {}; var a = audio(); if (!a || a.state !== 'running') return;
    var t0 = a.currentTime + (o.delay || 0), osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.04, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  var hz = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  NCT.sound = {
    pref: pref,
    unlock: function () { audio(); },
    save: function () { try { localStorage.setItem('nct40.sound', JSON.stringify(pref)); } catch (e) {} },
    sfx: function (name) {
      if (!pref.sound) return;
      if (name === 'step') { stepAlt = !stepAlt; tone(stepAlt ? 196 : 247, 0.06, { vol: 0.03 }); }
      else if (name === 'bump') tone(120, 0.09, { vol: 0.035, to: 80 });
      else if (name === 'click') tone(880, 0.04, { vol: 0.025 });
      else if (name === 'unlock') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.13, { delay: i * 0.09, vol: 0.045 }); }); tone(1568, 0.4, { delay: 0.38, type: 'triangle', vol: 0.06 }); }
      else if (name === 'up') [392, 440, 494, 523, 587, 659].forEach(function (f, i) { tone(f, 0.07, { delay: i * 0.05, vol: 0.03 }); });
      else if (name === 'down') [659, 587, 523, 494, 440, 392].forEach(function (f, i) { tone(f, 0.07, { delay: i * 0.05, vol: 0.03 }); });
      else if (name === 'whistle') { tone(2100, 0.16, { type: 'sine', vol: 0.06 }); tone(2150, 0.42, { delay: 0.22, type: 'sine', vol: 0.06, to: 1850 }); }
      else if (name === 'horn') { tone(392, 0.42, { vol: 0.035 }); tone(330, 0.6, { delay: 0.48, vol: 0.035 }); for (var i = 0; i < 10; i++) tone(70, 0.05, { delay: 1.2 + i * 0.16, vol: 0.03 }); }
      else if (name === 'save') { tone(659, 0.1, { vol: 0.04 }); tone(988, 0.18, { delay: 0.1, vol: 0.04 }); }
    },
    bgm: function (on) {
      var want = on && pref.music && pref.sound;
      if (want && !bgm) {
        var step = 0;
        var lead = [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 72, 74, 76, 0, 0, 0, 76, 0, 79, 0, 84, 81, 79, 0, 81, 79, 76, 74, 72, 0, 0, 0];
        var bass = [48, 0, 0, 0, 55, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 43, 0, 47, 0];
        bgm = setInterval(function () {
          if (lead[step]) tone(hz(lead[step]), 0.17, { vol: 0.018 });
          if (bass[step]) tone(hz(bass[step]), 0.32, { type: 'triangle', vol: 0.045 });
          step = (step + 1) % lead.length;
        }, 190);
      } else if (!want && bgm) { clearInterval(bgm); bgm = null; }
    }
  };
})();
