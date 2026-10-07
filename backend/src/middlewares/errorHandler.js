import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utils/appError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.resolve(__dirname, '../../../error.log');

function logErrorToFile(err, req) {
  try {
    const timestamp = new Date().toISOString();
    const route = `${req.method} ${req.originalUrl || req.url}`;
    const user = req.user ? `[User ID: ${req.user.id}]` : '[Guest]';
    const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '{}';
    const message = err.stack || err.message || String(err);
    const logEntry = `[${timestamp}] ERROR ${route} ${user}\nRequest Body: ${body}\nDetails:\n${message}\n${'-'.repeat(60)}\n`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (logErr) {
    console.error('Không thể ghi file error.log:', logErr.message);
  }
}

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

  // Ghi log chi tiết ra console và file error.log để dễ dàng tra cứu fix lỗi
  console.error(err);
  logErrorToFile(err, req);

  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Lỗi máy chủ' : err.message,
  });
}
