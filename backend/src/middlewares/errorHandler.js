import { AppError } from '../utils/appError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // JSON gửi lên bị sai cú pháp
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ' });
  }

  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
}