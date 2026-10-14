import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/* ==================== HẰNG SỐ VÀ HÀM DÙNG CHUNG ==================== */

// Hành động của admin -> giá trị lưu trong cột memories.status
const REVIEW_STATUS = {
  approve: 'approved',
  reject: 'rejected',
};

// Các cột người dùng trả cho admin.
// Liệt kê rõ từng cột, KHÔNG dùng u.* để không bao giờ lộ password_hash.
const ADMIN_USER_COLUMNS = `
  u.id,
  u.email,
  u.display_name,
  u.avatar_url,
  u.role,
  u.cohort,
  u.class_name,
  u.current_city,
  u.job,
  u.is_admin,
  u.created_at
`;

// Số liệu hoạt động của từng người dùng, để admin biết ai đang đóng góp nhiều
const USER_ACTIVITY_COLUMNS = `
  (SELECT COUNT(*)::int FROM memories m WHERE m.user_id = u.id) AS memory_count,
  (SELECT COUNT(*)::int FROM memories m WHERE m.user_id = u.id AND m.status = 'pending') AS pending_memory_count,
  (SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id) AS comment_count,
  (SELECT COUNT(*)::int FROM checkins ch WHERE ch.user_id = u.id) AS checkin_count
`;

// Một bài viết kỷ niệm kèm tác giả, góc trường, ảnh và số liệu (dùng cho cả danh sách lẫn chi tiết).
// Admin thấy cả email của tác giả, khác với API công khai.
const MEMORY_SELECT = `
  SELECT
    m.id,
    m.content,
    m.year,
    m.status,
    m.created_at,
    json_build_object(
      'id', u.id,
      'display_name', u.display_name,
      'email', u.email,
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
      (SELECT json_agg(mi.url ORDER BY mi.id) FROM memory_images mi WHERE mi.memory_id = m.id),
      '[]'::json
    ) AS images,
    (SELECT COUNT(*)::int FROM comments c WHERE c.memory_id = m.id) AS comment_count,
    (SELECT COUNT(*)::int FROM memory_likes ml WHERE ml.memory_id = m.id) AS like_count
  FROM memories m
  JOIN users u ON u.id = m.user_id
  JOIN locations l ON l.id = m.location_id
`;

function buildPagination(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// Ghép các điều kiện lọc thành mệnh đề WHERE (rỗng nếu không có điều kiện nào)
function buildWhere(conditions) {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Thoát các ký tự đặc biệt của LIKE (% _ \) để từ khóa của admin được tìm đúng như đã gõ
function escapeLike(text) {
  return text.replace(/[\\%_]/g, '\\$&');
}

// Hướng sắp xếp lấy từ một giá trị đã được schema kiểm tra, nên an toàn khi ghép vào SQL
function toSqlDirection(order) {
  return order === 'asc' ? 'ASC' : 'DESC';
}

/* ==================== KIỂM TRA QUYỀN ADMIN ==================== */

// Token JWT lưu isAdmin trong tối đa 7 ngày nên không đủ tin cậy cho các thao tác của admin:
// người vừa bị thu quyền vẫn còn token cũ. Hàm này hỏi thẳng database để quyền có hiệu lực ngay.
export async function isAdminInDatabase(userId) {
  const { rows } = await query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin === true;
}

/* ==================== THỐNG KÊ ==================== */

export async function getStats() {
  const [usersRes, memoriesRes, commentsRes, locationsRes] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE role = 'student')::int AS students,
         COUNT(*) FILTER (WHERE role = 'alumni')::int AS alumni,
         COUNT(*) FILTER (WHERE role = 'teacher')::int AS teachers,
         COUNT(*) FILTER (WHERE is_admin)::int AS admins
       FROM users`
    ),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM memories`
    ),
    query('SELECT COUNT(*)::int AS total FROM comments'),
    query('SELECT COUNT(*)::int AS total FROM locations'),
  ]);

  return {
    users: usersRes.rows[0],
    memories: memoriesRes.rows[0],
    comments: commentsRes.rows[0].total,
    locations: locationsRes.rows[0].total,
  };
}

/* ==================== DUYỆT BÀI VIẾT KỶ NIỆM ==================== */

/**
 * Danh sách bài viết cho admin duyệt (mặc định là hàng chờ pending).
 * Hàng chờ xếp cũ nhất lên đầu để bài nào gửi trước được duyệt trước;
 * các trạng thái khác xếp mới nhất lên đầu. Truyền order để đổi.
 */
export async function listMemories({
  status = 'pending',
  locationId,
  userId,
  q,
  order,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const params = [];

  if (status !== 'all') {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }

  if (locationId) {
    params.push(locationId);
    conditions.push(`m.location_id = $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`m.user_id = $${params.length}`);
  }

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    conditions.push(`(m.content ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`);
  }

  const whereClause = buildWhere(conditions);
  const direction = toSqlDirection(order ?? (status === 'pending' ? 'asc' : 'desc'));
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM memories m
       JOIN users u ON u.id = m.user_id
       ${whereClause}`,
      params
    ),
    query(
      `${MEMORY_SELECT}
       ${whereClause}
       ORDER BY m.created_at ${direction}, m.id ${direction}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    items: rowsRes.rows,
    pagination: buildPagination(total, page, limit),
  };
}

/**
 * Chi tiết một bài viết ở bất kỳ trạng thái nào (API công khai chỉ cho xem bài approved)
 */
export async function getMemory(memoryId) {
  const { rows } = await query(`${MEMORY_SELECT} WHERE m.id = $1`, [memoryId]);

  if (!rows[0]) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  return rows[0];
}

/**
 * Duyệt hoặc từ chối một bài viết. action là 'approve' hoặc 'reject'.
 * Gọi lại với bài đã ở đúng trạng thái đó thì không lỗi (kết quả giữ nguyên),
 * và admin vẫn có thể đổi ý, ví dụ gỡ một bài đã duyệt bằng cách từ chối.
 */
export async function reviewMemory(memoryId, action) {
  const status = REVIEW_STATUS[action];
  if (!status) {
    throw new AppError('Hành động duyệt bài không hợp lệ', 400);
  }

  const { rowCount } = await query('UPDATE memories SET status = $1 WHERE id = $2', [
    status,
    memoryId,
  ]);

  if (rowCount === 0) {
    throw new AppError('Bài viết kỷ niệm không tồn tại', 404);
  }

  return getMemory(memoryId);
}

/**
 * Duyệt hoặc từ chối nhiều bài cùng lúc trong MỘT câu lệnh SQL (hoặc xong hết, hoặc không gì cả).
 * Kết quả chia các mã bài thành ba nhóm để giao diện biết chuyện gì đã xảy ra:
 *   updatedIds   - bài vừa được đổi trạng thái
 *   unchangedIds - bài có sẵn nhưng đã ở đúng trạng thái đó rồi
 *   notFoundIds  - mã không tồn tại
 */
export async function bulkReviewMemories({ action, ids }) {
  const status = REVIEW_STATUS[action];
  if (!status) {
    throw new AppError('Hành động duyệt bài không hợp lệ', 400);
  }

  const { rows } = await query(
    `WITH changed AS (
       UPDATE memories
       SET status = $2
       WHERE id = ANY($1::int[]) AND status <> $2
       RETURNING id
     )
     SELECT
       COALESCE((SELECT array_agg(id ORDER BY id) FROM changed), '{}') AS updated_ids,
       COALESCE((SELECT array_agg(id ORDER BY id) FROM memories WHERE id = ANY($1::int[])), '{}') AS existing_ids`,
    [ids, status]
  );

  const updatedIds = rows[0].updated_ids;
  const updatedSet = new Set(updatedIds);
  const existingSet = new Set(rows[0].existing_ids);

  return {
    action,
    status,
    requested: ids.length,
    updatedIds,
    unchangedIds: ids.filter((id) => existingSet.has(id) && !updatedSet.has(id)),
    notFoundIds: ids.filter((id) => !existingSet.has(id)),
  };
}

/* ==================== GỠ BÌNH LUẬN ==================== */

export async function listComments({ memoryId, userId, q, page = 1, limit = 10 } = {}) {
  const conditions = [];
  const params = [];

  if (memoryId) {
    params.push(memoryId);
    conditions.push(`c.memory_id = $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`c.user_id = $${params.length}`);
  }

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    conditions.push(`(c.content ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`);
  }

  const whereClause = buildWhere(conditions);
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM comments c
       JOIN users u ON u.id = c.user_id
       ${whereClause}`,
      params
    ),
    query(
      `SELECT
         c.id,
         c.memory_id,
         c.content,
         c.created_at,
         json_build_object(
           'id', u.id,
           'display_name', u.display_name,
           'avatar_url', u.avatar_url,
           'role', u.role
         ) AS author,
         json_build_object(
           'id', m.id,
           'status', m.status,
           'excerpt', LEFT(m.content, 100),
           'location_name', l.name,
           'location_slug', l.slug
         ) AS memory
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN memories m ON m.id = c.memory_id
       JOIN locations l ON l.id = m.location_id
       ${whereClause}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    items: rowsRes.rows,
    pagination: buildPagination(total, page, limit),
  };
}

export async function deleteComment(commentId) {
  const { rows } = await query(
    `DELETE FROM comments
     WHERE id = $1
     RETURNING id, memory_id, user_id, content, created_at`,
    [commentId]
  );

  if (!rows[0]) {
    throw new AppError('Bình luận không tồn tại', 404);
  }

  return rows[0];
}

/* ==================== QUẢN LÝ NGƯỜI DÙNG ==================== */

export async function listUsers({
  q,
  role,
  isAdmin,
  cohort,
  className,
  order,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const params = [];

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    conditions.push(`(u.display_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (isAdmin !== undefined) {
    params.push(isAdmin);
    conditions.push(`u.is_admin = $${params.length}`);
  }

  if (cohort) {
    params.push(cohort);
    conditions.push(`u.cohort = $${params.length}`);
  }

  if (className) {
    params.push(className);
    conditions.push(`u.class_name = $${params.length}`);
  }

  const whereClause = buildWhere(conditions);
  const direction = toSqlDirection(order);
  const offset = (page - 1) * limit;

  const [countRes, rowsRes] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM users u ${whereClause}`, params),
    query(
      `SELECT ${ADMIN_USER_COLUMNS}, ${USER_ACTIVITY_COLUMNS}
       FROM users u
       ${whereClause}
       ORDER BY u.created_at ${direction}, u.id ${direction}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = countRes.rows[0]?.total ?? 0;

  return {
    items: rowsRes.rows,
    pagination: buildPagination(total, page, limit),
  };
}

export async function getUser(userId) {
  const { rows } = await query(
    `SELECT ${ADMIN_USER_COLUMNS}, ${USER_ACTIVITY_COLUMNS}
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  return rows[0];
}

/**
 * Đổi vai trò (student / alumni / teacher) của một người dùng.
 * - Sang giáo viên: xóa niên khóa và lớp (giáo viên không có hai thông tin này).
 * - Sang học sinh hoặc cựu học sinh: bắt buộc phải có niên khóa và lớp, lấy từ body
 *   hoặc từ dữ liệu sẵn có. Người từng là giáo viên chưa có thì admin phải gửi kèm.
 */
export async function changeUserRole(userId, { role, cohort, className }) {
  const current = await query('SELECT cohort, class_name FROM users WHERE id = $1', [userId]);
  if (!current.rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  let nextCohort = null;
  let nextClassName = null;

  if (role !== 'teacher') {
    nextCohort = cohort ?? current.rows[0].cohort;
    nextClassName = className ?? current.rows[0].class_name;

    if (!nextCohort || !nextClassName) {
      throw new AppError(
        'Học sinh và cựu học sinh phải có niên khóa và lớp, vui lòng gửi kèm cohort và className',
        400
      );
    }
  }

  await query('UPDATE users SET role = $1, cohort = $2, class_name = $3 WHERE id = $4', [
    role,
    nextCohort,
    nextClassName,
    userId,
  ]);

  return getUser(userId);
}

/**
 * Cấp hoặc thu hồi quyền admin.
 * Không cho admin tự đổi quyền của chính mình: vừa tránh bấm nhầm tự mất quyền,
 * vừa đảm bảo hệ thống luôn còn ít nhất một admin.
 */
export async function setUserAdmin(actorId, userId, isAdmin) {
  if (actorId === userId) {
    throw new AppError('Bạn không thể thay đổi quyền admin của chính mình', 400);
  }

  const { rowCount } = await query('UPDATE users SET is_admin = $1 WHERE id = $2', [
    isAdmin,
    userId,
  ]);

  if (rowCount === 0) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  return getUser(userId);
}

/**
 * Xóa tài khoản. Toàn bộ bài viết, bình luận, lượt thích và check-in của người đó
 * bị xóa theo (ON DELETE CASCADE).
 * Không xóa được chính mình, và không xóa được tài khoản admin
 * (phải thu hồi quyền admin trước, tránh xóa nhầm).
 */
export async function deleteUser(actorId, userId) {
  if (actorId === userId) {
    throw new AppError('Bạn không thể xóa tài khoản của chính mình', 400);
  }

  // Điều kiện is_admin = FALSE nằm ngay trong câu DELETE để không bị lệch nếu quyền vừa đổi
  const { rows } = await query(
    `DELETE FROM users
     WHERE id = $1 AND is_admin = FALSE
     RETURNING id, email, display_name`,
    [userId]
  );

  if (rows[0]) {
    return rows[0];
  }

  // Không xóa được: hoặc không có tài khoản này, hoặc đó là admin
  const existing = await query('SELECT 1 FROM users WHERE id = $1', [userId]);
  if (existing.rowCount === 0) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  throw new AppError('Không thể xóa tài khoản admin, hãy thu hồi quyền admin trước', 409);
}