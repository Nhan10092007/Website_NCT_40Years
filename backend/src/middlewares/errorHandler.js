import { AppError } from '../utils/appError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError || err.statusCode) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ' });
  }

  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Lỗi máy chủ' : err.message,
  });
}
