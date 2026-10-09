import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

const PUBLIC_USER_COLUMNS = `u.id AS user_id, u.display_name, u.avatar_url, u.role, u.cohort, u.class_name, u.is_admin`;

async function resolveMemory(memoryId) {
  const { rows } = await query(
    `SELECT m.id, m.content, m.status, m.created_at, m.location_id, l.name AS location_name, l.slug AS location_slug
     FROM memories m
     LEFT JOIN locations l ON l.id = m.location_id
     WHERE m.id = $1`,
    [memoryId]
  );

  return rows[0] ?? null;
}

function canManageComment(comment, userId, isAdmin = false) {
  return isAdmin || Number(comment.user_id) === Number(userId);
}

export async function listComments(memoryId, { page = 1, limit = 20 } = {}) {
  const memory = await resolveMemory(memoryId);
  if (!memory) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM comments WHERE memory_id = $1', [memoryId]),
    query(
      `SELECT
         c.id,
         c.memory_id,
         c.user_id,
         c.content,
         c.created_at,
         ${PUBLIC_USER_COLUMNS}
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.memory_id = $1
       ORDER BY c.created_at ASC, c.id ASC
       LIMIT $2 OFFSET $3`,
      [memoryId, limit, offset]
    ),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    memory: {
      id: memory.id,
      content: memory.content,
      status: memory.status,
      locationId: memory.location_id,
      locationName: memory.location_name,
      locationSlug: memory.location_slug,
    },
    items: rowsRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function createComment(userId, memoryId, content) {
  const memory = await resolveMemory(memoryId);
  if (!memory) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  try {
    const { rows } = await query(
      `INSERT INTO comments (memory_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, memory_id, user_id, content, created_at`,
      [memoryId, userId, content]
    );

    return rows[0];
  } catch (err) {
    if (err.code === '23503') {
      throw new AppError('Bài viết hoặc người dùng không tồn tại', 404);
    }
    throw err;
  }
}

export async function getComment(commentId) {
  const { rows } = await query(
    `SELECT
       c.id,
       c.memory_id,
       c.user_id,
       c.content,
       c.created_at,
       m.status AS memory_status
     FROM comments c
     JOIN memories m ON m.id = c.memory_id
     WHERE c.id = $1`,
    [commentId]
  );

  return rows[0] ?? null;
}

export async function updateComment(userId, commentId, content, isAdmin = false) {
  const existing = await getComment(commentId);
  if (!existing) {
    throw new AppError('Bình luận không tồn tại', 404);
  }

  if (!canManageComment(existing, userId, isAdmin)) {
    throw new AppError('Bạn không có quyền sửa bình luận này', 403);
  }

  const { rows } = await query(
    `UPDATE comments
     SET content = $1
     WHERE id = $2
     RETURNING id, memory_id, user_id, content, created_at`,
    [content, commentId]
  );

  return rows[0] ?? null;
}

export async function deleteComment(userId, commentId, isAdmin = false) {
  const existing = await getComment(commentId);
  if (!existing) {
    throw new AppError('Bình luận không tồn tại', 404);
  }

  if (!canManageComment(existing, userId, isAdmin)) {
    throw new AppError('Bạn không có quyền xóa bình luận này', 403);
  }

  const { rows } = await query(
    `DELETE FROM comments
     WHERE id = $1
     RETURNING id, memory_id, user_id, content, created_at`,
    [commentId]
  );

  return rows[0] ?? null;
}

export async function getMyComments(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM comments WHERE user_id = $1', [userId]),
    query(
      `SELECT
         c.id,
         c.memory_id,
         c.content,
         c.created_at,
         m.content AS memory_content,
         m.status AS memory_status,
         l.name AS location_name,
         l.slug AS location_slug
       FROM comments c
       JOIN memories m ON m.id = c.memory_id
       JOIN locations l ON l.id = m.location_id
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
