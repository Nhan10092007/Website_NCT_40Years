import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utils/appError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.resolve(__dirname, '../../../error.log');

// Các trường không được ghi vào log (so khớp không phân biệt hoa thường)
const SENSITIVE_KEYS = ['password', 'token', 'secret'];

// Trả về bản sao của dữ liệu với giá trị nhạy cảm bị thay bằng '***'
function maskSensitive(value) {
  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }
  if (value && typeof value === 'object') {
    const masked = {};
    for (const [key, val] of Object.entries(value)) {
      const isSensitive = SENSITIVE_KEYS.some((word) => key.toLowerCase().includes(word));
      masked[key] = isSensitive ? '***' : maskSensitive(val);
    }
    return masked;
  }
  return value;
}

function logErrorToFile(err, req) {
  try {
    const timestamp = new Date().toISOString();
    const route = `${req.method} ${req.originalUrl || req.url}`;
    const user = req.user ? `[User ID: ${req.user.id}]` : '[Guest]';
    const body = req.body && Object.keys(req.body).length > 0
      ? JSON.stringify(maskSensitive(req.body))
      : '{}';
    const message = err.stack || err.message || String(err);
    const logEntry = `[${timestamp}] ERROR ${route} ${user}\nRequest Body: ${body}\nDetails:\n${message}\n${'-'.repeat(60)}\n`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (logErr) {
    console.error('Không thể ghi file error.log:', logErr.message);
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // JSON sai cú pháp: phải kiểm tra TRƯỚC nhánh statusCode,
  // vì lỗi này cũng có statusCode = 400 nên sẽ bị nhánh dưới bắt mất
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ' });
  }

  if (err instanceof AppError || err.statusCode) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Ghi log chi tiết ra console và file error.log để dễ dàng tra cứu fix lỗi
  console.error(err);
  logErrorToFile(err, req);

  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Lỗi máy chủ' : err.message,
  });
}