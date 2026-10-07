import { Router } from 'express';
import * as controller from './reactions.controller.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  locationIdentifierParamSchema,
  memoryIdParamSchema,
  paginationQuerySchema,
} from './reactions.schema.js';

const router = Router();

/* ==================== CÁ NHÂN (USER ME) ==================== */

// Danh sách các địa điểm người dùng đã thích
router.get(
  '/me/locations',
  requireAuth,
  validate(paginationQuerySchema, 'query'),
  controller.myLikedLocations
);

// Danh sách các bài viết kỷ niệm người dùng đã thích
router.get(
  '/me/memories',
  requireAuth,
  validate(paginationQuerySchema, 'query'),
  controller.myLikedMemories
);

/* ==================== ĐỊA ĐIỂM (LOCATIONS) ==================== */

// Bảng xếp hạng góc trường được yêu thích nhất
router.get('/locations/leaderboard', controller.topLikedLocations);

// Lấy số lượt thích & trạng thái của người dùng
router.get(
  '/locations/:identifier',
  optionalAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.getLocationLikes
);

// Danh sách những người đã like địa điểm
router.get(
  '/locations/:identifier/likers',
  validate(locationIdentifierParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  controller.getLocationLikers
);

// Thích địa điểm
router.post(
  '/locations/:identifier',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.likeLocation
);

// Bỏ thích địa điểm
router.delete(
  '/locations/:identifier',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.unlikeLocation
);

// Toggle Thích / Bỏ thích địa điểm
router.post(
  '/locations/:identifier/toggle',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.toggleLocation
);

/* ==================== BÀI VIẾT KỶ NIỆM (MEMORIES) ==================== */

// Lấy số lượt thích của bài viết kỷ niệm
router.get(
  '/memories/:id',
  optionalAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.getMemoryLikes
);

// Thích bài viết
router.post(
  '/memories/:id',
  requireAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.likeMemory
);

// Bỏ thích bài viết
router.delete(
  '/memories/:id',
  requireAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.unlikeMemory
);

// Toggle Thích / Bỏ thích bài viết
router.post(
  '/memories/:id/toggle',
  requireAuth,
  validate(memoryIdParamSchema, 'params'),
  controller.toggleMemory
);

export default router;
