import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';
import { resolveLocation } from '../locations/locations.service.js';

/**
 * Lấy danh sách bài viết kỷ niệm (lọc theo location, cohort, year, phân trang)
 */
export async function listMemories(
  currentUserId = null,
  { locationId = null, locationSlug = null, cohort = null, year = null, page = 1, limit = 10 } = {}
) {
  const conditions = ["m.status = 'approved'"];
  const params = [];

  if (currentUserId) {
    params.push(currentUserId);
  }

  if (locationId) {
    params.push(locationId);
    conditions.push(`m.location_id = $${params.length}`);
  } else if (locationSlug) {
    const location = await resolveLocation(locationSlug);
    if (location) {
      params.push(location.id);
      conditions.push(`m.location_id = $${params.length}`);
    } else {
      return { items: [], pagination: { total: 0, page, limit, totalPages: 1 } };
    }
  }

  if (cohort) {
    params.push(cohort.trim());
    conditions.push(`u.cohort = $${params.length}`);
  }

  if (year) {
    params.push(Number(year));
    conditions.push(`m.year = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Đếm tổng số bài viết phù hợp
  const countSql = `
    SELECT COUNT(m.id)::int AS total
    FROM memories m
    JOIN users u ON u.id = m.user_id
    ${whereClause}
  `;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0]?.total ?? 0;

  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT
      m.id,
      m.content,
      m.year,
      m.created_at,
      json_build_object(
        'id', u.id,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'role', u.role,
        'cohort', u.cohort,
        'class_name', u.class_name
      ) AS author,
      json_build_object(
        'id', l.id,
        'name', l.name,
        'slug', l.slug
      ) AS location,
      COALESCE(
        (SELECT json_agg(mi.url) FROM memory_images mi WHERE mi.memory_id = m.id),
        '[]'::json
      ) AS images,
      (SELECT COUNT(*)::int FROM memory_likes ml WHERE ml.memory_id = m.id) AS like_count,
      (SELECT COUNT(*)::int FROM comments c WHERE c.memory_id = m.id) AS comment_count,
      ${
        currentUserId
          ? `EXISTS(SELECT 1 FROM memory_likes WHERE memory_id = m.id AND user_id = $1) AS has_liked`
          : `FALSE AS has_liked`
      }
    FROM memories m
    JOIN users u ON u.id = m.user_id
    JOIN locations l ON l.id = m.location_id
    ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await query(sql, params);

  return {
    items: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lấy chi tiết 1 bài viết kỷ niệm theo ID
 */
export async function getMemoryById(memoryId, currentUserId = null) {
  const params = [memoryId];
  if (currentUserId) {
    params.push(currentUserId);
  }

  const sql = `
    SELECT
      m.id,
      m.content,
      m.year,
      m.created_at,
      json_build_object(
        'id', u.id,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'role', u.role,
        'cohort', u.cohort,
        'class_name', u.class_name
      ) AS author,
      json_build_object(
        'id', l.id,
        'name', l.name,
        'slug', l.slug
      ) AS location,
      COALESCE(
        (SELECT json_agg(mi.url) FROM memory_images mi WHERE mi.memory_id = m.id),
        '[]'::json
      ) AS images,
      (SELECT COUNT(*)::int FROM memory_likes ml WHERE ml.memory_id = m.id) AS like_count,
      (SELECT COUNT(*)::int FROM comments c WHERE c.memory_id = m.id) AS comment_count,
      ${
        currentUserId
          ? `EXISTS(SELECT 1 FROM memory_likes WHERE memory_id = m.id AND user_id = $2) AS has_liked`
          : `FALSE AS has_liked`
      }
    FROM memories m
    JOIN users u ON u.id = m.user_id
    JOIN locations l ON l.id = m.location_id
    WHERE m.id = $1 AND m.status = 'approved'
  `;

  const { rows } = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * Đăng bài viết kỷ niệm mới (mặc định approved cho người dùng đã xác thực)
 */
export async function createMemory(userId, { locationId, content, year = null, images = [] }) {
  const location = await resolveLocation(locationId);
  if (!location) {
    throw new AppError('Góc trường được chọn không tồn tại', 404);
  }

  const { rows } = await query(
    `INSERT INTO memories (user_id, location_id, content, year, status)
     VALUES ($1, $2, $3, $4, 'approved')
     RETURNING id, user_id, location_id, content, year, status, created_at`,
    [userId, location.id, content, year || null]
  );

  const memory = rows[0];

  // Lưu ảnh đính kèm nếu có
  const savedImages = [];
  if (Array.isArray(images) && images.length > 0) {
    for (const url of images.slice(0, 5)) {
      if (typeof url === 'string' && url.trim()) {
        const imgRes = await query(
          'INSERT INTO memory_images (memory_id, url) VALUES ($1, $2) RETURNING url',
          [memory.id, url.trim()]
        );
        savedImages.push(imgRes.rows[0].url);
      }
    }
  }

  return getMemoryById(memory.id, userId);
}

/**
 * Xóa bài viết kỷ niệm (chính tác giả hoặc admin)
 */
export async function deleteMemory(userId, memoryId, isAdmin = false) {
  const { rows } = await query('SELECT id, user_id FROM memories WHERE id = $1', [memoryId]);
  const memory = rows[0];
  if (!memory) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  if (memory.user_id !== userId && !isAdmin) {
    throw new AppError('Bạn không có quyền xóa bài viết này', 403);
  }

  await query('DELETE FROM memories WHERE id = $1', [memoryId]);
  return { id: memoryId, deleted: true };
}
