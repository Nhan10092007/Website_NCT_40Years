import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';
import { resolveLocation } from '../locations/locations.service.js';

/* ==================== LOCATION LIKES ==================== */

export async function likeLocation(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  try {
    const { rows } = await query(
      `INSERT INTO location_likes (user_id, location_id)
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
      throw new AppError('Bạn đã yêu thích địa điểm này rồi', 409);
    }
    if (err.code === '23503') {
      throw new AppError('Địa điểm hoặc người dùng không tồn tại', 404);
    }
    throw err;
  }
}

export async function unlikeLocation(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const { rows } = await query(
    `DELETE FROM location_likes
     WHERE user_id = $1 AND location_id = $2
     RETURNING user_id, location_id, created_at`,
    [userId, location.id]
  );

  return rows[0] ?? null;
}

export async function toggleLocationLike(userId, identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const checkRes = await query(
    'SELECT 1 FROM location_likes WHERE user_id = $1 AND location_id = $2',
    [userId, location.id]
  );

  const hasLiked = checkRes.rows.length > 0;

  if (hasLiked) {
    await query(
      'DELETE FROM location_likes WHERE user_id = $1 AND location_id = $2',
      [userId, location.id]
    );
  } else {
    await query(
      'INSERT INTO location_likes (user_id, location_id) VALUES ($1, $2)',
      [userId, location.id]
    );
  }

  const countRes = await query(
    'SELECT COUNT(*)::int AS count FROM location_likes WHERE location_id = $1',
    [location.id]
  );

  return {
    locationId: location.id,
    locationSlug: location.slug,
    liked: !hasLiked,
    count: countRes.rows[0]?.count ?? 0,
  };
}

export async function getLocationLikes(identifier, currentUserId = null) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const [countRes, hasLikedRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count
       FROM location_likes
       WHERE location_id = $1`,
      [location.id]
    ),
    currentUserId
      ? query(
          `SELECT 1 FROM location_likes WHERE location_id = $1 AND user_id = $2`,
          [location.id, currentUserId]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    locationId: location.id,
    locationName: location.name,
    locationSlug: location.slug,
    count: countRes.rows[0]?.count ?? 0,
    hasLiked: hasLikedRes.rows.length > 0,
  };
}

export async function getLocationLikers(identifier, { page = 1, limit = 20 } = {}) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM location_likes WHERE location_id = $1', [location.id]),
    query(
      `SELECT
         u.id,
         u.display_name,
         u.avatar_url,
         u.role,
         u.cohort,
         u.class_name,
         ll.created_at AS liked_at
       FROM location_likes ll
       JOIN users u ON u.id = ll.user_id
       WHERE ll.location_id = $1
       ORDER BY ll.created_at DESC
       LIMIT $2 OFFSET $3`,
      [location.id, limit, offset]
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

export async function getTopLikedLocations(limit = 10) {
  const { rows } = await query(
    `SELECT
       l.id,
       l.slug,
       l.name,
       COUNT(ll.user_id)::int AS like_count
     FROM locations l
     LEFT JOIN location_likes ll ON ll.location_id = l.id
     GROUP BY l.id, l.slug, l.name
     ORDER BY like_count DESC, l.id ASC
     LIMIT $1`,
    [limit]
  );

  return rows;
}

export async function getMyLikedLocations(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM location_likes WHERE user_id = $1', [userId]),
    query(
      `SELECT
         l.id,
         l.slug,
         l.name,
         l.description,
         l.panorama_url,
         ll.created_at AS liked_at
       FROM location_likes ll
       JOIN locations l ON l.id = ll.location_id
       WHERE ll.user_id = $1
       ORDER BY ll.created_at DESC
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

/* ==================== MEMORY LIKES ==================== */

export async function likeMemory(userId, memoryId) {
  const memRes = await query('SELECT id, status FROM memories WHERE id = $1', [memoryId]);
  if (!memRes.rows[0]) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  try {
    const { rows } = await query(
      `INSERT INTO memory_likes (user_id, memory_id)
       VALUES ($1, $2)
       RETURNING user_id, memory_id, created_at`,
      [userId, memoryId]
    );

    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Bạn đã thích bài viết này rồi', 409);
    }
    if (err.code === '23503') {
      throw new AppError('Bài viết hoặc người dùng không tồn tại', 404);
    }
    throw err;
  }
}

export async function unlikeMemory(userId, memoryId) {
  const { rows } = await query(
    `DELETE FROM memory_likes
     WHERE user_id = $1 AND memory_id = $2
     RETURNING user_id, memory_id, created_at`,
    [userId, memoryId]
  );

  return rows[0] ?? null;
}

export async function toggleMemoryLike(userId, memoryId) {
  const memRes = await query('SELECT id FROM memories WHERE id = $1', [memoryId]);
  if (!memRes.rows[0]) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  const checkRes = await query(
    'SELECT 1 FROM memory_likes WHERE user_id = $1 AND memory_id = $2',
    [userId, memoryId]
  );

  const hasLiked = checkRes.rows.length > 0;

  if (hasLiked) {
    await query(
      'DELETE FROM memory_likes WHERE user_id = $1 AND memory_id = $2',
      [userId, memoryId]
    );
  } else {
    await query(
      'INSERT INTO memory_likes (user_id, memory_id) VALUES ($1, $2)',
      [userId, memoryId]
    );
  }

  const countRes = await query(
    'SELECT COUNT(*)::int AS count FROM memory_likes WHERE memory_id = $1',
    [memoryId]
  );

  return {
    memoryId,
    liked: !hasLiked,
    count: countRes.rows[0]?.count ?? 0,
  };
}

export async function getMemoryLikes(memoryId, currentUserId = null) {
  const memRes = await query('SELECT id FROM memories WHERE id = $1', [memoryId]);
  if (!memRes.rows[0]) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  const [countRes, hasLikedRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count
       FROM memory_likes
       WHERE memory_id = $1`,
      [memoryId]
    ),
    currentUserId
      ? query(
          `SELECT 1 FROM memory_likes WHERE memory_id = $1 AND user_id = $2`,
          [memoryId, currentUserId]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    memoryId,
    count: countRes.rows[0]?.count ?? 0,
    hasLiked: hasLikedRes.rows.length > 0,
  };
}

export async function getMyLikedMemories(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM memory_likes WHERE user_id = $1', [userId]),
    query(
      `SELECT
         m.id,
         m.content,
         m.year,
         m.created_at,
         l.name AS location_name,
         l.slug AS location_slug,
         ml.created_at AS liked_at
       FROM memory_likes ml
       JOIN memories m ON m.id = ml.memory_id
       JOIN locations l ON l.id = m.location_id
       WHERE ml.user_id = $1
       ORDER BY ml.created_at DESC
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
