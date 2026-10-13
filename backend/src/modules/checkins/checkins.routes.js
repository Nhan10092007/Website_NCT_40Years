import { Router } from 'express';
import * as controller from './checkins.controller.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  locationIdentifierParamSchema,
  visitorsQuerySchema,
  leaderboardQuerySchema,
  paginationQuerySchema,
} from './checkins.schema.js';

const router = Router();

/* ==================== CÁ NHÂN (USER ME) ==================== */

// Lấy danh sách check-in của chính người dùng (phân trang)
router.get('/me', requireAuth, validate(paginationQuerySchema, 'query'), controller.mine);

// Tiến độ khám phá toàn trường & danh hiệu huy hiệu của cá nhân
router.get('/me/summary', requireAuth, controller.mySummary);

/* ==================== BẢNG XẾP HẠNG (LEADERBOARDS) ==================== */

// Bảng xếp hạng các địa điểm được check-in nhiều nhất
router.get(
  '/leaderboard/locations',
  validate(leaderboardQuerySchema, 'query'),
  controller.leaderboardLocations
);
// Giữ route '/leaderboard' cũ để tương thích ngược
router.get(
  '/leaderboard',
  validate(leaderboardQuerySchema, 'query'),
  controller.leaderboardLocations
);

// Bảng vinh danh: Top người dùng check-in nhiều địa điểm nhất
router.get(
  '/leaderboard/explorers',
  validate(leaderboardQuerySchema, 'query'),
  controller.leaderboardExplorers
);

/* ==================== THEO ĐỊA ĐIỂM (LOCATION / SLUG) ==================== */

// Thống kê check-in của 1 địa điểm theo ID hoặc Slug (hỗ trợ cả khách & user đăng nhập)
router.get(
  '/location/:identifier',
  optionalAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.locationCount
);

// Danh sách cựu học sinh / học sinh đã check-in tại địa điểm (lọc theo cohort, className, phân trang)
router.get(
  '/location/:identifier/visitors',
  validate(locationIdentifierParamSchema, 'params'),
  validate(visitorsQuerySchema, 'query'),
  controller.locationVisitors
);

// Thống kê số lượng check-in theo từng niên khóa tại địa điểm
router.get(
  '/location/:identifier/cohorts',
  validate(locationIdentifierParamSchema, 'params'),
  controller.locationCohorts
);

/* ==================== THỰC HIỆN CHECK-IN / HỦY CHECK-IN ==================== */

// Check-in vào địa điểm bằng ID hoặc Slug (yêu cầu auth)
router.post(
  '/:identifier',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.create
);

// Hủy check-in khỏi địa điểm bằng ID hoặc Slug (yêu cầu auth)
router.delete(
  '/:identifier',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.remove
);

// Toggle Check-in / Hủy Check-in (yêu cầu auth)
router.post(
  '/:identifier/toggle',
  requireAuth,
  validate(locationIdentifierParamSchema, 'params'),
  controller.toggle
);

export default router;