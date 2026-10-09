import { query } from '../../config/db.js';

/**
 * Bảng xếp hạng các địa điểm nổi bật nhất (theo checkin, lượt thích hoặc tổng thể)
 */
export async function getTopLocations({ limit = 10, sortBy = 'checkins' } = {}) {
  let orderClause = 'ORDER BY l.checkin_count DESC, l.like_count DESC, l.sort_order ASC';

  if (sortBy === 'likes') {
    orderClause = 'ORDER BY l.like_count DESC, l.checkin_count DESC, l.sort_order ASC';
  } else if (sortBy === 'popular') {
    orderClause = 'ORDER BY (l.checkin_count + l.like_count) DESC, l.sort_order ASC';
  }

  const sql = `
    SELECT
      l.id,
      l.slug,
      l.name,
      l.category,
      l.thumbnail_url,
      l.checkin_count,
      l.like_count,
      l.photo_count,
      l.memory_count
    FROM v_locations_detailed l
    WHERE l.is_active = TRUE
    ${orderClause}
    LIMIT $1
  `;

  const { rows } = await query(sql, [limit]);
  return rows;
}

/**
 * Bảng vinh danh: Top người dùng check-in khám phá nhiều địa điểm nhất
 */
export async function getTopExplorers({ limit = 10 } = {}) {
  const sql = `
    SELECT
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
    LIMIT $1
  `;

  const { rows } = await query(sql, [limit]);
  return rows;
}

/**
 * Bảng xếp hạng niên khóa sôi nổi nhất (theo số thành viên & lượt check-in)
 */
export async function getTopCohorts({ limit = 10 } = {}) {
  const sql = `
    SELECT
      u.cohort,
      COUNT(DISTINCT u.id)::int AS member_count,
      COUNT(c.location_id)::int AS total_checkins
    FROM users u
    LEFT JOIN checkins c ON c.user_id = u.id
    WHERE u.cohort IS NOT NULL
    GROUP BY u.cohort
    ORDER BY total_checkins DESC, member_count DESC, u.cohort DESC
    LIMIT $1
  `;

  const { rows } = await query(sql, [limit]);
  return rows;
}

/**
 * Tổng hợp nhanh top 5 cho Dashboard / Trang chủ
 */
export async function getRankingsOverview() {
  const [locations, explorers, cohorts] = await Promise.all([
    getTopLocations({ limit: 5, sortBy: 'checkins' }),
    getTopExplorers({ limit: 5 }),
    getTopCohorts({ limit: 5 }),
  ]);

  return {
    topLocations: locations,
    topExplorers: explorers,
    topCohorts: cohorts,
  };
}
