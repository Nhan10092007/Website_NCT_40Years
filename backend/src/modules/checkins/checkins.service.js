import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Tìm địa điểm theo ID hoặc Slug
 */
export async function resolveLocation(identifier) {
  const isNumeric = /^\d+$/.test(String(identifier));
  let res;

  if (isNumeric) {
    res = await query(
      'SELECT id, slug, name, description, panorama_url FROM locations WHERE id = $1',
      [Number(identifier)]
    );
  } else {
    res = await query(
      'SELECT id, slug, name, description, panorama_url FROM locations WHERE slug = $1',
      [String(identifier).trim()]
    );
  }

  return res.rows[0] ?? null;
}

/**
 * Thực hiện check-in vào địa điểm
 */
export async function createCheckin(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  try {
    const { rows } = await query(
      `INSERT INTO checkins (user_id, location_id)
       VALUES ($1, $2)
       RETURNING user_id, location_id, created_at`,
      [userId, location.id]
    );

    return {
      ...rows[0],
      location,
    };
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Bạn đã check-in tại địa điểm này rồi', 409);
    }
    if (err.code === '23503') {
      throw new AppError('Địa điểm hoặc người dùng không tồn tại', 404);
    }
    throw err;
  }
}

/**
 * Hủy check-in khỏi địa điểm
 */
export async function deleteCheckin(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const { rows } = await query(
    `DELETE FROM checkins
     WHERE user_id = $1 AND location_id = $2
     RETURNING user_id, location_id, created_at`,
    [userId, location.id]
  );

  return rows[0] ?? null;
}

/**
 * Toggle Check-in / Hủy Check-in địa điểm
 */
export async function toggleCheckin(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const checkRes = await query(
    'SELECT 1 FROM checkins WHERE user_id = $1 AND location_id = $2',
    [userId, location.id]
  );

  const hasCheckedIn = checkRes.rows.length > 0;

  if (hasCheckedIn) {
    await query(
      'DELETE FROM checkins WHERE user_id = $1 AND location_id = $2',
      [userId, location.id]
    );
  } else {
    await query(
      'INSERT INTO checkins (user_id, location_id) VALUES ($1, $2)',
      [userId, location.id]
    );
  }

  const countRes = await query(
    'SELECT COUNT(*)::int AS count FROM checkins WHERE location_id = $1',
    [location.id]
  );

  return {
    locationId: location.id,
    locationSlug: location.slug,
    locationName: location.name,
    checkedIn: !hasCheckedIn,
    count: countRes.rows[0]?.count ?? 0,
  };
}

/**
 * Lấy danh sách check-in của cá nhân có phân trang
 */
export async function getMyCheckins(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM checkins WHERE user_id = $1', [userId]),
    query(
      `SELECT
         c.location_id,
         c.created_at,
         l.slug,
         l.name,
         l.description,
         l.panorama_url
       FROM checkins c
       JOIN locations l ON l.id = c.location_id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    items: rowsRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Tổng hợp tiến độ khám phá & huy hiệu cá nhân
 */
export async function getMyCheckinSummary(userId) {
  const [totalLocRes, checkedLocRes, unvisitedRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM locations'),
    query(
      `SELECT
         c.location_id,
         c.created_at,
         l.slug,
         l.name
       FROM checkins c
       JOIN locations l ON l.id = c.location_id
       WHERE c.user_id = $1
       ORDER BY c.created_at ASC`,
      [userId]
    ),
    query(
      `SELECT id, slug, name, description
       FROM locations
       WHERE id NOT IN (SELECT location_id FROM checkins WHERE user_id = $1)
       ORDER BY id`,
      [userId]
    ),
  ]);

  const totalLocations = totalLocRes.rows[0]?.total ?? 0;
  const checkedCount = checkedLocRes.rows.length;
  const percentage = totalLocations > 0 ? Math.round((checkedCount / totalLocations) * 100) : 0;

  // Tính toán danh hiệu dựa trên tiến độ check-in
  let badge = 'Tân binh NCT';
  if (checkedCount === 0) {
    badge = 'Chưa khám phá';
  } else if (checkedCount >= totalLocations && totalLocations > 0) {
    badge = 'NCT Explorer - Trọn Vẹn Thanh Xuân 🏆';
  } else if (checkedCount >= Math.ceil(totalLocations * 0.7)) {
    badge = 'Dấu ấn tuổi xanh ⭐';
  } else if (checkedCount >= Math.ceil(totalLocations * 0.3)) {
    badge = 'Kỷ niệm thân quen 🎒';
  }

  return {
    progress: {
      checkedCount,
      totalLocations,
      percentage,
      badge,
    },
    checkedLocations: checkedLocRes.rows,
    unvisitedLocations: unvisitedRes.rows,
  };
}

/**
 * Thống kê lượt check-in của 1 địa điểm
 */
export async function getLocationCheckins(identifier, currentUserId = null) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const [countRes, hasCheckedInRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count
       FROM checkins
       WHERE location_id = $1`,
      [location.id]
    ),
    currentUserId
      ? query(
          `SELECT 1 FROM checkins WHERE location_id = $1 AND user_id = $2`,
          [location.id, currentUserId]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    locationId: location.id,
    locationName: location.name,
    locationSlug: location.slug,
    count: countRes.rows[0]?.count ?? 0,
    hasCheckedIn: hasCheckedInRes.rows.length > 0,
  };
}

/**
 * Danh sách cựu học sinh / học sinh ghé thăm địa điểm (có lọc niên khóa, lớp)
 */
export async function getLocationVisitors(identifier, { cohort, className, page = 1, limit = 10 } = {}) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const offset = (page - 1) * limit;
  const conditions = ['c.location_id = $1'];
  const params = [location.id];

  if (cohort) {
    params.push(cohort);
    conditions.push(`u.cohort = $${params.length}`);
  }

  if (className) {
    params.push(className);
    conditions.push(`u.class_name = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    WHERE ${whereClause}
  `;

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataQuery = `
    SELECT
      u.id AS user_id,
      u.display_name,
      u.avatar_url,
      u.role,
      u.cohort,
      u.class_name,
      c.created_at AS checked_in_at
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countQuery, params.slice(0, params.length - 2)),
    query(dataQuery, params),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    location: {
      id: location.id,
      name: location.name,
      slug: location.slug,
    },
    items: dataRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Thống kê check-in theo niên khóa tại 1 địa điểm
 */
export async function getLocationCohortStats(identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const { rows } = await query(
    `SELECT
       u.cohort,
       COUNT(*)::int AS count
     FROM checkins c
     JOIN users u ON u.id = c.user_id
     WHERE c.location_id = $1 AND u.cohort IS NOT NULL
     GROUP BY u.cohort
     ORDER BY count DESC, u.cohort DESC`,
    [location.id]
  );

  return {
    locationId: location.id,
    locationName: location.name,
    cohorts: rows,
  };
}

/**
 * Bảng xếp hạng các địa điểm có nhiều lượt check-in nhất
 */
export async function getTopLocationsByCheckins(limit = 10) {
  const { rows } = await query(
    `SELECT
       l.id,
       l.slug,
       l.name,
       COUNT(c.user_id)::int AS checkin_count
     FROM locations l
     LEFT JOIN checkins c ON c.location_id = l.id
     GROUP BY l.id, l.slug, l.name
     ORDER BY checkin_count DESC, l.id ASC
     LIMIT $1`,
    [limit]
  );

  return rows;
}

/**
 * Bảng vinh danh: Top thành viên check-in nhiều góc trường nhất
 */
export async function getTopExplorers(limit = 10) {
  const { rows } = await query(
    `SELECT
       u.id,
       u.display_name,
       u.avatar_url,
       u.role,
       u.cohort,
       u.class_name,
       COUNT(c.location_id)::int AS visited_count
     FROM users u
     JOIN checkins c ON c.user_id = u.id
     GROUP BY u.id, u.display_name, u.avatar_url, u.role, u.cohort, u.class_name
     ORDER BY visited_count DESC, u.id ASC
     LIMIT $1`,
    [limit]
  );

  return rows;
}