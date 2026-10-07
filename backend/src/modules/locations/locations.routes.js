import { Router } from 'express';
import * as controller from './locations.controller.js';
import { requireAuth, requireAdmin, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  locationIdentifierParamSchema,
  createLocationSchema,
  updateLocationSchema,
  addPhotoSchema,
  addLinkSchema,
} from './locations.schema.js';

const router = Router();

/* ==================== CÔNG KHAI (PUBLIC / CLIENT) ==================== */

// Lấy danh sách tất cả địa điểm kèm số liệu thống kê (checkin, like, memory)
router.get('/', optionalAuth, controller.list);

// Lấy chi tiết 1 địa điểm theo Slug hoặc ID
router.get(
  '/:identifier',
  optionalAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.detail
);

/* ==================== QUẢN TRỊ VIÊN (ADMIN ONLY) ==================== */

// Tạo địa điểm mới
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createLocationSchema, 'body'),
  controller.create
);

// Cập nhật thông tin địa điểm
router.patch(
  '/:identifier',
  requireAuth,
  requireAdmin,
  validate(locationIdentifierParamSchema, 'params'),
  validate(updateLocationSchema, 'body'),
  controller.update
);

// Xóa địa điểm
router.delete(
  '/:identifier',
  requireAuth,
  requireAdmin,
  validate(locationIdentifierParamSchema, 'params'),
  controller.remove
);

/* Ảnh tư liệu (Photos) */
router.post(
  '/:identifier/photos',
  requireAuth,
  requireAdmin,
  validate(locationIdentifierParamSchema, 'params'),
  validate(addPhotoSchema, 'body'),
  controller.addPhoto
);

router.delete('/photos/:photoId', requireAuth, requireAdmin, controller.removePhoto);

/* Liên kết chuyển cảnh 360° (Links) */
router.post(
  '/:identifier/links',
  requireAuth,
  requireAdmin,
  validate(locationIdentifierParamSchema, 'params'),
  validate(addLinkSchema, 'body'),
  controller.addLink
);

router.delete('/links/:linkId', requireAuth, requireAdmin, controller.removeLink);

export default router;