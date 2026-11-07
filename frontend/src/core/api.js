/* ============================================================
 * core/api.js — Kết nối trực tiếp Frontend với Backend Express / PostgreSQL
 * Tích hợp toàn bộ API modules: auth, users, locations, checkins,
 * memories, comments, reactions, rankings, search, admin.
 * ============================================================ */
window.NCT = window.NCT || {};
(function () {
  var TOKEN_KEY = 'nct40.jwt_token';
  var USER_KEY = 'nct40.current_user';
  var CHECKINS_KEY = 'nct40.checkins';

  // Base URL: tự động dùng /api nếu qua Vite dev server / proxy,
  // hoặc trỏ thẳng http://localhost:3000/api khi mở trực tiếp file / live server
  var API_BASE = (window.location.protocol === 'file:' || window.location.port === '5500' || window.location.port === '8080')
    ? 'http://localhost:3000/api'
    : '/api';

  var _cachedUser = null;
  var _cachedCheckins = [];
  var _backendLocations = null;

  try { _cachedUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { _cachedUser = null; }
  try { _cachedCheckins = JSON.parse(localStorage.getItem(CHECKINS_KEY) || '[]'); } catch (e) { _cachedCheckins = []; }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
  }

  function saveSession(user, token) {
    _cachedUser = user;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch (e) { }
  }

  function clearSession() {
    _cachedUser = null;
    _cachedCheckins = [];
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(CHECKINS_KEY);
    } catch (e) { }
  }

  /* Helper gửi HTTP request */
  function request(endpoint, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    var token = getToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    var url = endpoint.indexOf('http') === 0 ? endpoint : API_BASE + endpoint;

    return fetch(url, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        if (res.status === 204) return null;
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) {
            var msg = (data && (data.message || data.error)) || 'Lỗi kết nối máy chủ (' + res.status + ')';
            if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
              clearSession();
            }
            var err = new Error(msg);
            err.status = res.status;
            err.data = data;
            return Promise.reject(err);
          }
          return data;
        });
      });
  }

  /* ---------- MAPPING HELPERS ---------- */

  var FRONTEND_TO_SLUG = {
    gate: 'cong-truong',
    yard: 'san-truong',
    corridor: 'hanh-lang',
    classA: 'lop-hoc',
    hsts: 'hsts',
    statue: 'statue',
    stairs: 'stairs',
    lab: 'lab',
    canteen: 'can-tin',
    informatics: 'phong-tin-hoc',
    library: 'thu-vien'
  };

  var SLUG_OR_ID_TO_FRONTEND = {
    'cong-truong': 'gate',
    'san-truong': 'yard',
    'hanh-lang': 'corridor',
    'lop-hoc': 'classA',
    'hsts': 'hsts',
    'statue': 'statue',
    'stairs': 'stairs',
    'lab': 'lab',
    'can-tin': 'canteen',
    'phong-tin-hoc': 'informatics',
    'thu-vien': 'library',
    'gate': 'gate',
    'yard': 'yard',
    'corridor': 'corridor',
    'classA': 'classA',
    'canteen': 'canteen',
    'informatics': 'informatics',
    'library': 'library',
    '1': 'gate',
    '2': 'yard',
    '3': 'canteen',
    '9': 'corridor',
    '10': 'classA',
    '19': 'library',
    '27': 'hsts',
    '28': 'statue',
    '29': 'stairs',
    '30': 'lab',
    '31': 'informatics'
  };

  function toBackendRole(r) {
    if (r === 'hs') return 'student';
    if (r === 'chs') return 'alumni';
    if (r === 'gv') return 'teacher';
    return r || 'student';
  }

  function toFrontendRole(r, isAdmin) {
    if (isAdmin) return 'admin';
    if (r === 'student') return 'hs';
    if (r === 'alumni') return 'chs';
    if (r === 'teacher') return 'gv';
    return r || 'chs';
  }

  var FALLBACK_LOC_IDS = {
    gate: 1, yard: 2, canteen: 3, corridor: 9, classA: 10, library: 19,
    hsts: 27, statue: 28, stairs: 29, lab: 30, informatics: 31
  };

  function toBackendLocId(locId) {
    var slug = FRONTEND_TO_SLUG[locId] || locId;
    if (Array.isArray(_backendLocations) && _backendLocations.length > 0) {
      var f = _backendLocations.filter(function (l) { return l.slug === slug || String(l.id) === String(locId); })[0];
      if (f) return f.id;
    }
    if (FALLBACK_LOC_IDS[locId]) return FALLBACK_LOC_IDS[locId];
    return slug;
  }

  function toFrontendLocId(identifier, slug) {
    if (slug && SLUG_OR_ID_TO_FRONTEND[slug]) return SLUG_OR_ID_TO_FRONTEND[slug];
    if (identifier && SLUG_OR_ID_TO_FRONTEND[String(identifier)]) return SLUG_OR_ID_TO_FRONTEND[String(identifier)];
    return identifier;
  }

  function mapUser(u) {
    if (!u) return null;
    if (u.user && typeof u.user === 'object') u = u.user;
    var sy = 2023, ey = 2026;
    if (u.cohort) {
      var parts = String(u.cohort).split(/[-–]/);
      if (parts.length >= 2) {
        sy = parseInt(parts[0], 10) || 2023;
        ey = parseInt(parts[1], 10) || 2026;
      } else {
        sy = parseInt(u.cohort, 10) || 2023;
        ey = sy + 3;
      }
    }

    var gender = 'm', stripe = 'y';
    if (u.avatar_url && u.avatar_url.indexOf('avatar:') === 0) {
      var segs = u.avatar_url.replace('avatar:', '').split('_');
      gender = segs[0] || 'm';
      stripe = segs[1] || 'y';
    } else if (u.gender) {
      gender = u.gender;
      stripe = u.stripe || 'y';
    }

    return {
      id: u.id,
      name: u.display_name || u.name || 'Hành khách NCT',
      email: u.email || '',
      role: toFrontendRole(u.role, u.is_admin || u.isAdmin),
      className: u.class_name || u.className || '',
      sy: sy,
      ey: ey,
      cohort: u.cohort || (sy + '–' + ey),
      gender: gender,
      stripe: stripe,
      createdAt: u.created_at || new Date().toISOString()
    };
  }

  function mapMemory(m) {
    if (!m) return null;
    var locId = toFrontendLocId(m.location_id, m.location ? m.location.slug : null);
    var author = mapUser(m.author) || { name: 'Ẩn danh', role: 'chs', sy: 2023, ey: 2026, gender: 'm', stripe: 'y' };
    var img = '';
    if (Array.isArray(m.images) && m.images.length > 0) img = m.images[0];
    else if (m.img) img = m.img;

    var loveCount = m.love_count !== undefined ? m.love_count : ((m.reactions && m.reactions.love) || m.like_count || 0);
    var missCount = m.miss_count !== undefined ? m.miss_count : ((m.reactions && m.reactions.miss) || 0);
    var laughCount = m.laugh_count !== undefined ? m.laugh_count : ((m.reactions && m.reactions.laugh) || 0);
    var proudCount = m.proud_count !== undefined ? m.proud_count : ((m.reactions && m.reactions.proud) || 0);

    var myReaction = m.my_reaction || m.myReaction || (m.has_liked ? 'love' : null);

    return {
      id: m.id,
      userId: (m.author && m.author.id) || m.user_id || m.userId,
      locationId: locId,
      text: m.content || m.text || '',
      img: img,
      status: m.status === 'approved' ? 'published' : m.status || 'published',
      at: m.created_at || m.at || new Date().toISOString(),
      author: author,
      reactions: {
        love: loveCount,
        miss: missCount,
        laugh: laughCount,
        proud: proudCount
      },
      myReaction: myReaction,
      commentCount: m.comment_count !== undefined ? m.comment_count : (m.commentCount || 0)
    };
  }

  function mapComment(c, memoryId) {
    var authorName = 'Ẩn danh';
    if (c.author && (c.author.display_name || c.author.name)) authorName = c.author.display_name || c.author.name;
    else if (c.display_name) authorName = c.display_name;

    var authorRole = (c.author && c.author.role) || c.role || 'chs';
    var authorCohort = (c.author && c.author.cohort) || c.cohort || '';
    var authorClass = (c.author && c.author.class_name) || c.class_name || '';

    return {
      id: c.id,
      memoryId: memoryId || c.memory_id,
      userId: (c.author && c.author.id) || c.user_id,
      text: c.content || c.text || '',
      at: c.created_at || c.at || new Date().toISOString(),
      author: {
        name: authorName,
        role: authorRole,
        cohort: authorCohort,
        className: authorClass,
        gender: (c.author && c.author.gender) || 'm',
        stripe: (c.author && c.author.stripe) || 'y'
      }
    };
  }

  /* Nạp trước danh mục locations từ backend để lấy id số tương ứng */
  function ensureBackendLocations() {
    if (Array.isArray(_backendLocations) && _backendLocations.length > 0) return Promise.resolve(_backendLocations);
    return request('/locations').then(function (list) {
      _backendLocations = Array.isArray(list) ? list : ((list && list.items) || []);
      return _backendLocations;
    }).catch(function () {
      return _backendLocations || [];
    });
  }

  ensureBackendLocations();

  /* ============================================================
   * NCT.api — Đối tượng giao tiếp dữ liệu chính
   * ============================================================ */
  NCT.api = {
    /* ---------- AUTH ---------- */

    // POST /auth/register
    register: function (data) {
      var bRole = toBackendRole(data.role);
      var payload = {
        email: String(data.email || '').trim().toLowerCase(),
        password: String(data.password || ''),
        displayName: String(data.name || '').trim(),
        role: bRole
      };
      if (bRole !== 'teacher') {
        payload.cohort = data.sy + '-' + data.ey;
        payload.className = data.className ? String(data.className).trim() : '12A';
      }

      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).then(function (res) {
        var user = mapUser(res.user);
        user.gender = data.gender || 'm';
        user.stripe = data.stripe || 'y';
        saveSession(user, res.token);
        return NCT.api.myCheckins().then(function () {
          return { user: user, token: res.token };
        }).catch(function () {
          return { user: user, token: res.token };
        });
      });
    },

    // POST /auth/login
    login: function (email, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(email || '').trim().toLowerCase(),
          password: String(password || '')
        })
      }).then(function (res) {
        var user = mapUser(res.user);
        saveSession(user, res.token);
        return NCT.api.myCheckins().then(function () {
          return { user: user, token: res.token };
        }).catch(function () {
          return { user: user, token: res.token };
        });
      });
    },

    // POST /auth/logout
    logout: function () {
      clearSession();
      return Promise.resolve(true);
    },

    // GET /auth/me
    me: function () {
      if (!getToken()) return Promise.resolve(null);
      return request('/auth/me').then(function (res) {
        var user = mapUser(res.user);
        saveSession(user, getToken());
        if (!_cachedCheckins || _cachedCheckins.length === 0) {
          NCT.api.myCheckins();
        }
        return user;
      }).catch(function () {
        return _cachedUser;
      });
    },

    // Đồng bộ tức thời cho game loop
    meSync: function () {
      return _cachedUser;
    },

    /* ---------- USERS ---------- */

    // GET /users/:id
    getUser: function (id) {
      if (_cachedUser && String(id) === String(_cachedUser.id)) {
        return Promise.resolve(_cachedUser);
      }
      return request('/users/' + encodeURIComponent(id)).then(mapUser);
    },

    // PATCH /users/:id
    updateUser: function (id, patch) {
      var payload = {};
      if (patch.name) payload.displayName = patch.name;
      if (patch.className !== undefined) payload.className = patch.className;

      return request('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }).then(function (res) {
        var rawUser = (res && res.user) ? res.user : res;
        var updated = mapUser(rawUser);
        if (patch.gender) updated.gender = patch.gender;
        if (patch.stripe) updated.stripe = patch.stripe;
        saveSession(updated, getToken());
        return updated;
      });
    },

    // GET /users/:id/stats
    userStats: function (id) {
      var isMe = _cachedUser && String(id) === String(_cachedUser.id);
      if (isMe) {
        return request('/checkins/me/summary').then(function (s) {
          return NCT.api.memories({ userId: id }).then(function (mems) {
            return {
              stamps: s.visitedCount || _cachedCheckins.length || 0,
              memories: mems.length,
              reactionsReceived: 0,
              comments: 0
            };
          });
        }).catch(function () {
          return { stamps: _cachedCheckins.length, memories: 0, reactionsReceived: 0, comments: 0 };
        });
      }

      return request('/users/' + encodeURIComponent(id)).then(function (u) {
        return NCT.api.memories({ userId: id }).then(function (mems) {
          return {
            stamps: u.checkinCount || 0,
            memories: mems.length,
            reactionsReceived: 0,
            comments: 0
          };
        });
      }).catch(function () {
        return { stamps: 0, memories: 0, reactionsReceived: 0, comments: 0 };
      });
    },

    /* ---------- LOCATIONS ---------- */

    // GET /locations
    locations: function () {
      return Promise.resolve(NCT.C.LOCS.slice());
    },

    // GET /locations/:id
    location: function (id) {
      var found = NCT.C.LOCS.filter(function (x) { return x.id === id; })[0] || null;
      return Promise.resolve(found);
    },

    /* ---------- CHECKINS ---------- */

    // GET /checkins?userId=me
    myCheckins: function () {
      if (!getToken()) return Promise.resolve(_cachedCheckins);
      return request('/checkins/me?limit=50').then(function (res) {
        var items = res.items || [];
        _cachedCheckins = items.map(function (c) {
          return {
            id: c.id,
            userId: _cachedUser ? _cachedUser.id : null,
            locationId: toFrontendLocId(c.location_id, c.slug || c.location_slug),
            at: c.created_at
          };
        });
        try { localStorage.setItem(CHECKINS_KEY, JSON.stringify(_cachedCheckins)); } catch (e) { }
        return _cachedCheckins;
      }).catch(function () {
        return _cachedCheckins;
      });
    },

    myCheckinsSync: function () {
      return _cachedCheckins || [];
    },

    // POST /checkins  body: { locationId }
    checkin: function (locationId) {
      var backendId = toBackendLocId(locationId);
      return request('/checkins/' + encodeURIComponent(backendId) + '/toggle', {
        method: 'POST'
      }).then(function (res) {
        var u = _cachedUser;
        var c = {
          id: 'c_' + locationId,
          userId: u ? u.id : null,
          locationId: locationId,
          at: new Date().toISOString()
        };

        var has = _cachedCheckins.filter(function (x) { return x.locationId === locationId; })[0];
        if (res.checkedIn && !has) {
          _cachedCheckins.push(c);
        } else if (!res.checkedIn && has) {
          _cachedCheckins = _cachedCheckins.filter(function (x) { return x.locationId !== locationId; });
        }
        try { localStorage.setItem(CHECKINS_KEY, JSON.stringify(_cachedCheckins)); } catch (e) { }
        return c;
      });
    },

    /* ---------- MEMORIES ---------- */

    // GET /memories?locationId=&userId=&status=published&sort=new|top
    memories: function (q) {
      q = q || {};
      var qs = ['limit=50'];
      if (q.locationId) {
        var slug = FRONTEND_TO_SLUG[q.locationId] || q.locationId;
        qs.push('locationSlug=' + encodeURIComponent(slug));
      }
      return request('/memories?' + qs.join('&')).then(function (res) {
        var list = (res.items || []).map(mapMemory);
        if (q.userId) {
          list = list.filter(function (m) { return String(m.userId) === String(q.userId); });
        }
        if (q.locationId) {
          list = list.filter(function (m) { return m.locationId === q.locationId; });
        }
        if (q.sort === 'top') {
          list.sort(function (a, b) { return b.reactions.love - a.reactions.love; });
        } else {
          list.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
        }
        return list;
      }).catch(function () {
        return [];
      });
    },

    // GET /memories/:id
    memory: function (id) {
      return request('/memories/' + encodeURIComponent(id)).then(mapMemory);
    },

    // POST /memories
    createMemory: function (data) {
      return ensureBackendLocations().then(function (locs) {
        var bId = toBackendLocId(data.locationId);
        var numericLocId = typeof bId === 'number' ? bId : 1;
        if (typeof bId !== 'number') {
          var found = (locs || []).filter(function (l) { return l.slug === bId || l.id === data.locationId; })[0];
          if (found) numericLocId = found.id;
          else if (FALLBACK_LOC_IDS[data.locationId]) numericLocId = FALLBACK_LOC_IDS[data.locationId];
        }

        var payload = {
          locationId: numericLocId,
          content: String(data.text || '').trim() || 'Kỷ niệm đẹp cùng NCT',
          images: data.img ? [data.img] : []
        };

        return request('/memories', {
          method: 'POST',
          body: JSON.stringify(payload)
        }).then(function (res) {
          var mem = mapMemory((res && res.memory) || res);
          return { memory: mem, stored: true };
        });
      });
    },

    // DELETE /memories/:id
    deleteMemory: function (id) {
      return request('/memories/' + encodeURIComponent(id), {
        method: 'DELETE'
      }).then(function () { return true; });
    },

    /* ---------- COMMENTS ---------- */

    // GET /comments/memories/:id
    comments: function (memoryId) {
      return request('/comments/memories/' + encodeURIComponent(memoryId) + '?limit=50').then(function (res) {
        var items = res.items || [];
        return items.map(function (c) { return mapComment(c, memoryId); });
      }).catch(function (err) {
        console.warn('Lỗi tải bình luận:', err);
        return [];
      });
    },

    // POST /comments/memories/:id
    addComment: function (memoryId, text) {
      return request('/comments/memories/' + encodeURIComponent(memoryId), {
        method: 'POST',
        body: JSON.stringify({ content: String(text).slice(0, 200) })
      }).then(function (res) {
        var c = res.comment || res;
        return mapComment(c, memoryId);
      });
    },

    /* ---------- REACTIONS ---------- */

    // POST /reactions/memories/:id/toggle
    react: function (memoryId, type) {
      return request('/reactions/memories/' + encodeURIComponent(memoryId) + '/toggle', {
        method: 'POST',
        body: JSON.stringify({ type: type || 'love' })
      }).then(function (res) {
        return NCT.api.memory(memoryId).then(function (m) {
          if (m && res.counts) {
            m.reactions = {
              love: res.counts.love || 0,
              miss: res.counts.miss || 0,
              laugh: res.counts.laugh || 0,
              proud: res.counts.proud || 0
            };
            m.myReaction = res.myReaction || null;
          }
          return m;
        });
      });
    },

    /* ---------- RANKINGS ---------- */

    // GET /rankings?type=stamps|memories|reactions|cohort
    rankings: function (type) {
      if (type === 'cohort') {
        return request('/rankings/cohorts?limit=20').then(function (rows) {
          return (rows || []).map(function (r) {
            return {
              cohort: r.cohort,
              members: r.member_count || 0,
              stamps: r.total_checkins || 0,
              memories: 0
            };
          });
        }).catch(function () { return []; });
      }

      return request('/rankings/explorers?limit=20').then(function (rows) {
        return (rows || []).map(function (r) {
          return {
            user: mapUser(r),
            score: r.visited_count || 0
          };
        });
      }).catch(function () { return []; });
    },

    /* ---------- SEARCH ---------- */

    // GET /search?q=&cohort=&className=&role=&locationId=
    search: function (f) {
      f = f || {};
      var qs = ['type=all'];
      if (f.q) qs.push('q=' + encodeURIComponent(f.q));
      if (f.cohort) qs.push('cohort=' + encodeURIComponent(f.cohort));
      if (f.className) qs.push('className=' + encodeURIComponent(f.className));
      if (f.role) qs.push('role=' + encodeURIComponent(toBackendRole(f.role)));

      return request('/search?' + qs.join('&')).then(function (res) {
        var results = res.results || {};
        var users = (results.users || []).map(mapUser);
        var memories = (results.memories || []).map(mapMemory);

        if (f.locationId) {
          memories = memories.filter(function (m) { return m.locationId === f.locationId; });
        }
        return { users: users, memories: memories };
      }).catch(function () {
        return { users: [], memories: [] };
      });
    },

    /* ---------- ADMIN ---------- */

    // GET /admin/stats
    adminStats: function () {
      return request('/admin/stats').then(function (s) {
        var perLoc = NCT.C.LOCS.map(function (l) {
          var slug = FRONTEND_TO_SLUG[l.id] || l.id;
          var locStat = Array.isArray(s.locations) ? s.locations.filter(function (x) { return x.slug === slug; })[0] : null;
          return {
            id: l.id,
            name: l.name,
            checkins: locStat ? (locStat.checkin_count || 0) : 0,
            memories: locStat ? (locStat.memory_count || 0) : 0
          };
        });

        return {
          users: (s.users && s.users.total) || 0,
          checkins: perLoc.reduce(function (a, b) { return a + b.checkins; }, 0),
          memories: (s.memories && s.memories.approved) || 0,
          pending: (s.memories && s.memories.pending) || 0,
          comments: (s.comments && s.comments.total) || 0,
          reactions: 0,
          perLocation: perLoc
        };
      });
    },

    // GET /admin/memories
    adminMemories: function (status) {
      var qStatus = status === 'published' ? 'approved' : status === 'pending' ? 'pending' : 'all';
      return request('/admin/memories?status=' + encodeURIComponent(qStatus) + '&limit=100').then(function (res) {
        return (res.items || []).map(mapMemory);
      });
    },

    // PATCH /admin/memories/:id
    moderate: function (id, status) {
      var action = (status === 'published' || status === 'approved') ? 'approve' : 'reject';
      return request('/admin/memories/' + encodeURIComponent(id) + '/' + action, {
        method: 'PATCH'
      }).then(mapMemory);
    },

    // GET /admin/users
    adminUsers: function () {
      return request('/admin/users?limit=100').then(function (res) {
        return (res.items || []).map(mapUser);
      });
    },

    // PATCH /admin/users/:id  body: { role }
    setRole: function (id, role) {
      if (role === 'admin') {
        return request('/admin/users/' + encodeURIComponent(id) + '/admin', {
          method: 'PATCH',
          body: JSON.stringify({ isAdmin: true })
        }).then(mapUser);
      }
      var bRole = toBackendRole(role);
      return request('/admin/users/' + encodeURIComponent(id) + '/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: bRole })
      }).then(mapUser);
    },

    /* dev helper: xoá session */
    _reset: function () {
      clearSession();
    }
  };
})();
