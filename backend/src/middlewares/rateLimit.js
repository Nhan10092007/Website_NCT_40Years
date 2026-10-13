import { rateLimit } from 'express-rate-limit';

// Chỉ tính các lần đăng nhập thất bại
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Thử đăng nhập quá nhiều lần, vui lòng đợi 15 phút' },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Đăng ký quá nhiều lần, vui lòng thử lại sau' },
});