import { Router } from 'express';
import * as controller from './memories.controller.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  createMemorySchema,
  listMemoriesQuerySchema,
  memoryIdParamSchema,
} from './memories.schema.js';

const router = Router();

/* ==================== BÀI VIẾT KỶ NIỆM (MEMORIES) ==================== */

// Lấy danh sách bài viết kỷ niệm (lọc theo location, cohort, year, phân trang)
router.get(
  '/',
  optionalAuth,
  validate(listMemoriesQuerySchema, 'query'),
  controller.list
);

// Lấy chi tiết 1 bài viết kỷ niệm
router.get(
  '/:id',
  optionalAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.detail
);

// Đăng bài viết kỷ niệm mới (yêu cầu đăng nhập)
router.post(
  '/',
  requireAuth,
  validate(createMemorySchema, 'body'),
  controller.create
);

// Xóa bài viết kỷ niệm (chính tác giả hoặc admin)
router.delete(
  '/:id',
  requireAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.remove
);

export default router;
