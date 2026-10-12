import { query } from '../../config/db.js';

/**
 * Tìm kiếm cựu học sinh / giáo viên / học sinh
 */
export async function searchUsers({ q, cohort, className, role, page = 1, limit = 10 } = {}) {
  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(u.display_name ILIKE $${idx} OR u.job ILIKE $${idx} OR u.current_city ILIKE $${idx})`);
  }

  if (cohort) {
    params.push(`%${cohort}%`);
    conditions.push(`u.cohort ILIKE $${params.length}`);
  }

  if (className) {
    params.push(`%${className}%`);
    conditions.push(`u.class_name ILIKE $${params.length}`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`;

  const offset = (page - 1) * limit;
  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT
      u.id,
      u.display_name,
      u.role,
      u.cohort,
      u.class_name,
      u.current_city,
      u.job,
      u.avatar_url,
      u.created_at
    FROM users u
    ${whereClause}
    ORDER BY u.cohort DESC NULLS LAST, u.class_name ASC NULLS LAST, u.display_name ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countSql, params),
    query(dataSql, dataParams),
  ]);

  const total = countRes.rows[0]?.total ?? 0;
  return {
    items: dataRes.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Tìm kiếm các địa điểm / góc trường trong Virtual Tour
 */
export async function searchLocations({ q, page = 1, limit = 10 } = {}) {
  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(l.name ILIKE $${idx} OR l.description ILIKE $${idx})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*)::int AS total FROM locations l ${whereClause}`;

  const offset = (page - 1) * limit;
  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT
      l.id,
      l.slug,
      l.name,
      l.description,
      l.panorama_url,
      l.created_at,
      COUNT(DISTINCT c.user_id)::int AS checkin_count,
      COUNT(DISTINCT ll.user_id)::int AS like_count
    FROM locations l
    LEFT JOIN checkins c ON c.location_id = l.id
    LEFT JOIN location_likes ll ON ll.location_id = l.id
    ${whereClause}
    GROUP BY l.id
    ORDER BY l.name ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countSql, params),
    query(dataSql, dataParams),
  ]);

  const total = countRes.rows[0]?.total ?? 0;
  return {
    items: dataRes.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Tìm kiếm bài viết kỷ niệm đã được duyệt
 */
export async function searchMemories({ q, cohort, className, year, page = 1, limit = 10 } = {}) {
  const conditions = ["m.status = 'approved'"];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`m.content ILIKE $${params.length}`);
  }

  if (year) {
    params.push(year);
    conditions.push(`m.year = $${params.length}`);
  }

  if (cohort) {
    params.push(`%${cohort}%`);
    conditions.push(`u.cohort ILIKE $${params.length}`);
  }

  if (className) {
    params.push(`%${className}%`);
    conditions.push(`u.class_name ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM memories m
    JOIN users u ON u.id = m.user_id
    ${whereClause}
  `;

  const offset = (page - 1) * limit;
  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT
      m.id,
      m.content,
      m.year,
      m.created_at,
      l.id AS location_id,
      l.name AS location_name,
      l.slug AS location_slug,
      u.id AS author_id,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      u.role AS author_role,
      u.cohort AS author_cohort,
      u.class_name AS author_class,
      COALESCE(
        json_agg(mi.url) FILTER (WHERE mi.id IS NOT NULL),
        '[]'
      ) AS images
    FROM memories m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN locations l ON l.id = m.location_id
    LEFT JOIN memory_images mi ON mi.memory_id = m.id
    ${whereClause}
    GROUP BY m.id, l.id, u.id
    ORDER BY m.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countSql, params),
    query(dataSql, dataParams),
  ]);

  const total = countRes.rows[0]?.total ?? 0;
  return {
    items: dataRes.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Tìm kiếm tổng hợp (Unified Search) trả về cả Users, Locations và Memories
 */
export async function searchAll(filters = {}) {
  const topLimit = Math.min(filters.limit || 5, 10);
  const [users, locations, memories] = await Promise.all([
    searchUsers({ ...filters, page: 1, limit: topLimit }),
    searchLocations({ ...filters, page: 1, limit: topLimit }),
    searchMemories({ ...filters, page: 1, limit: topLimit }),
  ]);

  return {
    users: users.items,
    locations: locations.items,
    memories: memories.items,
    totals: {
      users: users.pagination.total,
      locations: locations.pagination.total,
      memories: memories.pagination.total,
    },
  };
}
