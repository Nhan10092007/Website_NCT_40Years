import { Router } from 'express';
import * as controller from './rankings.controller.js';
import { validate } from '../../middlewares/validate.js';
import { rankingsQuerySchema, topLocationsQuerySchema } from './rankings.schema.js';

const router = Router();

// Top góc trường được check-in / yêu thích nhiều nhất
router.get(
  '/locations',
  validate(topLocationsQuerySchema, 'query'),
  controller.topLocations
);

// Bảng vinh danh: Top người dùng check-in nhiều địa điểm nhất
router.get(
  '/explorers',
  validate(rankingsQuerySchema, 'query'),
  controller.topExplorers
);

// Bảng xếp hạng: Niên khóa sôi nổi nhất
router.get(
  '/cohorts',
  validate(rankingsQuerySchema, 'query'),
  controller.topCohorts
);

// Tổng hợp nhanh top 5 cho Dashboard / Widget trang chủ
router.get(
  '/overview',
  controller.overview
);

export default router;
