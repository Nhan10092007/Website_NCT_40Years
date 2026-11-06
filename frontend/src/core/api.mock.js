/* ============================================================
 * core/api.js — the ONLY place the UI talks to data.
 *
 * Every function below maps 1:1 to a backend module + endpoint
 * (see README.md › API contract). Right now they run against a
 * localStorage mock so the UI works offline; to go live, replace the
 * body of each function with a fetch() to the endpoint in its comment
 * and keep the return shape.
 *
 * Shapes
 *   User     { id, name, role:'hs'|'chs'|'gv'|'admin', gender:'m'|'f', stripe:'y'|'w'|'b',
 *              sy, ey, className, email, createdAt }
 *   Location { id, no, name, floor, desc, video, icon, ink }          (layout data in config.js)
 *   Checkin  { id, userId, locationId, at }
 *   Memory   { id, userId, locationId, text, img, status:'published'|'pending'|'hidden', at }
 *   Comment  { id, memoryId, userId, text, at }
 *   Reaction { memoryId, userId, type:'love'|'miss'|'laugh'|'proud' }
 * ============================================================ */
window.NCT = window.NCT || {};
(function () {
  var KEY = 'nct40.db.v1';
  var delay = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 40); }); };
  var uid = function (p) { return p + '_' + Math.random().toString(36).slice(2, 9); };

  function load() {
    var db = null;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db) { db = NCT.seed(); save(db); }
    return db;
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) {
      // quota: drop images from the oldest memories, keep text
      db.memories.forEach(function (m, i) { if (i < db.memories.length - 3) m.img = ''; });
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e2) {}
      return false;
    }
  }
  var db = null;
  function D() { if (!db) db = load(); return db; }
  function me() { var d = D(); return d.users.filter(function (u) { return u.id === d.session; })[0] || null; }
  function needMe() { var u = me(); if (!u) throw new Error('Chưa đăng nhập'); return u; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function decorate(m) {
    var d = D(), u = byId(d.users, m.userId) || { name: 'Ẩn danh', role: 'chs', sy: '', ey: '', gender: 'm', stripe: 'y' };
    var rs = d.reactions.filter(function (r) { return r.memoryId === m.id; });
    var counts = { love: 0, miss: 0, laugh: 0, proud: 0 };
    rs.forEach(function (r) { counts[r.type] = (counts[r.type] || 0) + 1; });
    var mine = d.session ? (rs.filter(function (r) { return r.userId === d.session; })[0] || {}).type || null : null;
    return Object.assign({}, m, { author: u, reactions: counts, myReaction: mine,
      commentCount: d.comments.filter(function (c) { return c.memoryId === m.id; }).length });
  }

  NCT.api = {
    /* ---------- auth ---------- */
    // POST /auth/register  body: User fields + password  → { user, token }
    register: function (data) {
      var d = D();
      var u = Object.assign({ id: uid('u'), createdAt: new Date().toISOString(), role: 'chs', className: '' }, data);
      delete u.password;
      d.users.push(u); d.session = u.id; save(d); return delay({ user: u, token: 'mock-token' });
    },
    // POST /auth/login  body: { email, password }  → { user, token }
    login: function (email) {
      var d = D(); var u = d.users.filter(function (x) { return (x.email || '').toLowerCase() === String(email || '').toLowerCase(); })[0];
      if (!u) return Promise.reject(new Error('Không tìm thấy tài khoản với email này.'));
      d.session = u.id; save(d); return delay({ user: u, token: 'mock-token' });
    },
    // POST /auth/logout
    logout: function () { var d = D(); d.session = null; save(d); return delay(true); },
    // GET /auth/me  → User | null
    me: function () { return delay(me()); },
    meSync: me,

    /* ---------- users ---------- */
    // GET /users/:id  → User
    getUser: function (id) { return delay(byId(D().users, id)); },
    // PATCH /users/:id  body: partial User → User
    updateUser: function (id, patch) { var d = D(), u = byId(d.users, id); Object.assign(u, patch); save(d); return delay(u); },
    // GET /users/:id/stats → { stamps, memories, reactionsReceived, comments }
    userStats: function (id) {
      var d = D();
      var mem = d.memories.filter(function (m) { return m.userId === id && m.status === 'published'; });
      var ids = mem.map(function (m) { return m.id; });
      return delay({
        stamps: d.checkins.filter(function (c) { return c.userId === id; }).length,
        memories: mem.length,
        reactionsReceived: d.reactions.filter(function (r) { return ids.indexOf(r.memoryId) >= 0; }).length,
        comments: d.comments.filter(function (c) { return c.userId === id; }).length
      });
    },

    /* ---------- locations ---------- */
    // GET /locations → Location[]
    locations: function () { return delay(NCT.C.LOCS.slice()); },
    // GET /locations/:id → Location
    location: function (id) { return delay(byId(NCT.C.LOCS, id)); },

    /* ---------- checkins ---------- */
    // GET /checkins?userId=me → Checkin[]
    myCheckins: function () { var d = D(); return delay(d.checkins.filter(function (c) { return c.userId === d.session; })); },
    myCheckinsSync: function () { var d = D(); return d.checkins.filter(function (c) { return c.userId === d.session; }); },
    // POST /checkins  body: { locationId } → Checkin  (idempotent per user+location)
    checkin: function (locationId) {
      var d = D(), u = needMe();
      var c = d.checkins.filter(function (x) { return x.userId === u.id && x.locationId === locationId; })[0];
      if (!c) { c = { id: uid('c'), userId: u.id, locationId: locationId, at: new Date().toISOString() }; d.checkins.push(c); save(d); }
      return delay(c);
    },

    /* ---------- memories ---------- */
    // GET /memories?locationId=&userId=&status=published&sort=new|top → Memory[] (decorated)
    memories: function (q) {
      q = q || {}; var d = D();
      var list = d.memories.filter(function (m) {
        return (q.status ? m.status === q.status : m.status === 'published') &&
          (!q.locationId || m.locationId === q.locationId) && (!q.userId || m.userId === q.userId);
      }).map(decorate);
      list.sort(q.sort === 'top'
        ? function (a, b) { return (b.reactions.love + b.reactions.miss + b.reactions.laugh + b.reactions.proud) - (a.reactions.love + a.reactions.miss + a.reactions.laugh + a.reactions.proud); }
        : function (a, b) { return a.at < b.at ? 1 : -1; });
      return delay(list);
    },
    // GET /memories/:id → Memory (decorated)
    memory: function (id) { var m = byId(D().memories, id); return delay(m ? decorate(m) : null); },
    // POST /memories  body: { locationId, text (≤300), img? } → Memory   (multipart for img in prod)
    createMemory: function (data) {
      var d = D(), u = needMe();
      var m = { id: uid('m'), userId: u.id, locationId: data.locationId, text: String(data.text || '').slice(0, 300), img: data.img || '', status: 'published', at: new Date().toISOString() };
      d.memories.push(m); var ok = save(d); return delay({ memory: decorate(m), stored: ok });
    },
    // DELETE /memories/:id
    deleteMemory: function (id) { var d = D(); d.memories = d.memories.filter(function (m) { return m.id !== id; }); save(d); return delay(true); },

    /* ---------- comments ---------- */
    // GET /memories/:id/comments → Comment[] (with author)
    comments: function (memoryId) {
      var d = D();
      return delay(d.comments.filter(function (c) { return c.memoryId === memoryId; })
        .sort(function (a, b) { return a.at > b.at ? 1 : -1; })
        .map(function (c) { return Object.assign({}, c, { author: byId(d.users, c.userId) || { name: 'Ẩn danh' } }); }));
    },
    // POST /memories/:id/comments  body: { text (≤200) } → Comment
    addComment: function (memoryId, text) {
      var d = D(), u = needMe();
      var c = { id: uid('cm'), memoryId: memoryId, userId: u.id, text: String(text).slice(0, 200), at: new Date().toISOString() };
      d.comments.push(c); save(d); return delay(c);
    },

    /* ---------- reactions ---------- */
    // PUT /memories/:id/reactions  body: { type } → toggles; one reaction per user per memory
    react: function (memoryId, type) {
      var d = D(), u = needMe();
      var cur = d.reactions.filter(function (r) { return r.memoryId === memoryId && r.userId === u.id; })[0];
      d.reactions = d.reactions.filter(function (r) { return !(r.memoryId === memoryId && r.userId === u.id); });
      if (!cur || cur.type !== type) d.reactions.push({ memoryId: memoryId, userId: u.id, type: type });
      save(d); return delay(decorate(byId(d.memories, memoryId)));
    },

    /* ---------- rankings ---------- */
    // GET /rankings?type=stamps|memories|reactions|cohort&limit=20
    rankings: function (type) {
      var d = D();
      if (type === 'cohort') {
        var map = {};
        d.users.filter(function (u) { return u.role !== 'admin'; }).forEach(function (u) {
          var k = u.sy + '–' + u.ey; map[k] = map[k] || { cohort: k, members: 0, stamps: 0, memories: 0 };
          map[k].members++;
          map[k].stamps += d.checkins.filter(function (c) { return c.userId === u.id; }).length;
          map[k].memories += d.memories.filter(function (m) { return m.userId === u.id && m.status === 'published'; }).length;
        });
        return delay(Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.memories + b.stamps - (a.memories + a.stamps); }));
      }
      var rows = d.users.filter(function (u) { return u.role !== 'admin'; }).map(function (u) {
        var mem = d.memories.filter(function (m) { return m.userId === u.id && m.status === 'published'; });
        var ids = mem.map(function (m) { return m.id; });
        var score = type === 'memories' ? mem.length
          : type === 'reactions' ? d.reactions.filter(function (r) { return ids.indexOf(r.memoryId) >= 0; }).length
          : d.checkins.filter(function (c) { return c.userId === u.id; }).length;
        return { user: u, score: score };
      });
      rows.sort(function (a, b) { return b.score - a.score; });
      return delay(rows.slice(0, 20));
    },

    /* ---------- search ---------- */
    // GET /search?q=&cohort=&className=&role=&locationId= → { users: User[], memories: Memory[] }
    search: function (f) {
      f = f || {}; var d = D();
      var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); };
      var q = norm(f.q);
      var users = d.users.filter(function (u) {
        if (u.role === 'admin') return false;
        if (q && norm(u.name).indexOf(q) < 0 && norm(u.className).indexOf(q) < 0 && (u.sy + '-' + u.ey).indexOf(q) < 0) return false;
        if (f.cohort && String(u.sy) !== String(f.cohort) && String(u.ey) !== String(f.cohort)) return false;
        if (f.className && norm(u.className).indexOf(norm(f.className)) < 0) return false;
        if (f.role && u.role !== f.role) return false;
        return true;
      });
      var uids = users.map(function (u) { return u.id; });
      var memories = d.memories.filter(function (m) {
        if (m.status !== 'published') return false;
        if (f.locationId && m.locationId !== f.locationId) return false;
        var textHit = q && norm(m.text).indexOf(q) >= 0;
        return uids.indexOf(m.userId) >= 0 || textHit;
      }).map(decorate);
      return delay({ users: users, memories: memories });
    },

    /* ---------- admin ---------- */
    // GET /admin/stats
    adminStats: function () {
      var d = D();
      return delay({ users: d.users.length, checkins: d.checkins.length, memories: d.memories.filter(function (m) { return m.status === 'published'; }).length,
        pending: d.memories.filter(function (m) { return m.status === 'pending'; }).length, comments: d.comments.length, reactions: d.reactions.length,
        perLocation: NCT.C.LOCS.map(function (l) { return { id: l.id, name: l.name, checkins: d.checkins.filter(function (c) { return c.locationId === l.id; }).length, memories: d.memories.filter(function (m) { return m.locationId === l.id; }).length }; }) });
    },
    // GET /admin/memories?status=pending|published|hidden
    adminMemories: function (status) { var d = D(); return delay(d.memories.filter(function (m) { return !status || m.status === status; }).map(decorate)); },
    // PATCH /admin/memories/:id  body: { status }
    moderate: function (id, status) { var d = D(), m = byId(d.memories, id); if (m) m.status = status; save(d); return delay(m); },
    // GET /admin/users
    adminUsers: function () { return delay(D().users.slice()); },
    // PATCH /admin/users/:id  body: { role }
    setRole: function (id, role) { var d = D(), u = byId(d.users, id); if (u) u.role = role; save(d); return delay(u); },

    /* dev helper: wipe the mock DB */
    _reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} db = null; }
  };
})();
