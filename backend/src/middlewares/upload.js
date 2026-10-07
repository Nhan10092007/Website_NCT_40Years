import multer from 'multer';
import { AppError } from '../utils/appError.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB mỗi ảnh
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(), // giữ ảnh trong bộ nhớ, chưa lưu ra đĩa
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new AppError('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP', 400));
  },
});

// Đổi lỗi của multer thành AppError để errorHandler trả đúng mã
function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('Ảnh quá lớn, tối đa 5MB mỗi ảnh', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError(`Tối đa ${MAX_FILES} ảnh`, 400));
        }
        return next(new AppError('Tải ảnh lên không thành công', 400));
      }

      next(err);
    });
  };
}

export const uploadImages = handleUpload(upload.array('images', MAX_FILES)); // nhiều ảnh, trường tên "images"
export const uploadSingleImage = handleUpload(upload.single('image'));       // một ảnh, trường tên "image"