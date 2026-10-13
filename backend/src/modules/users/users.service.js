import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

const PUBLIC_USER_COLUMNS = `
  id,
  email,
  display_name,
  role,
  cohort,
  class_name,
  current_city,
  job,
  avatar_url,
  is_admin,
  created_at
`;

const PUBLIC_PROFILE_COLUMNS = `
  id,
  display_name,
  role,
  cohort,
  class_name,
  current_city,
  job,
  avatar_url,
  created_at
`;

// Tên trường trong body -> tên cột trong database.
// Tên cột lấy từ bảng cố định này, không lấy từ người dùng nên an toàn khi ghép vào SQL.
const UPDATABLE_FIELDS = {
  displayName: 'display_name',
  cohort: 'cohort',
  className: 'class_name',
  currentCity: 'current_city',
  job: 'job',
  avatarURL: 'avatar_url',
  avatarUrl: 'avatar_url',
};

export async function getProfile(userId) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (!rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  return rows[0];
}

export async function getUserById(userId) {
  const { rows } = await query(
    `SELECT ${PUBLIC_PROFILE_COLUMNS}
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (!rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  const countRes = await query(
    'SELECT COUNT(*)::int AS checkin_count FROM checkins WHERE user_id = $1',
    [userId]
  );

  return {
    ...rows[0],
    checkinCount: countRes.rows[0]?.checkin_count ?? 0,
  };
}


export async function updateProfile(userId, role, data) {
  // Giáo viên không có niên khóa và lớp
  if (role === 'teacher' && (data.cohort !== undefined || data.className !== undefined)) {
    throw new AppError('Giáo viên không có niên khóa hoặc lớp', 400);
  }

  // Chỉ cập nhật những trường thật sự được gửi lên (null nghĩa là xóa)
  const sets = [];
  const values = [];
  for (const [field, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (data[field] !== undefined) {
      values.push(data[field]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    throw new AppError('Không có thông tin nào để cập nhật', 400);
  }

  values.push(userId);
  const { rows } = await query(
    `UPDATE users
     SET ${sets.join(', ')}
     WHERE id = $${values.length}
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    values
  );

  if (!rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 404);
  }

  return rows[0];
}