import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

const SALT_ROUNDS = 10;

// Băm sẵn một mật khẩu giả để vẫn tốn thời gian so sánh khi email không tồn tại
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

const PUBLIC_USER_COLUMNS = `id, email, display_name, role, cohort, class_name,
  current_city, job, avatar_url, is_admin, created_at`;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, isAdmin: user.is_admin },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function register(data) {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users
         (email, password_hash, display_name, role, cohort, class_name, current_city, job, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [
        data.email,
        passwordHash,
        data.displayName,
        data.role,
        data.cohort ?? null,
        data.className ?? null,
        data.currentCity ?? null,
        data.job ?? null,
        data.avatarURL ?? null,
      ]
    );

    const user = rows[0];
    return { user, token: signToken(user) };
  } catch (err) {
    // 23505 = vi phạm UNIQUE (email đã tồn tại)
    if (err.code === '23505') {
      throw new AppError('Email đã được sử dụng', 409);
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const row = rows[0];

  const match = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !match) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  delete row.password_hash;
  return { user: row, token: signToken(row) };
}

export async function getMe(userId) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) {
    throw new AppError('Tài khoản không tồn tại', 401);
  }
  return rows[0];
}