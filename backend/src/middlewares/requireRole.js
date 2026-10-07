import { AppError } from '../utils/appError.js';

// Dùng SAU requireAuth.
// Ví dụ: requireRole('teacher') hoặc requireRole('student', 'alumni')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Vai trò của bạn không được thực hiện thao tác này', 403));
    }
    next();
  };
}