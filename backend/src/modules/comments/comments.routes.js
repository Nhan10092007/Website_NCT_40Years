import { Router } from 'express';
import * as controller from './comments.controller.js';
import {
  commentIdParamSchema,
  createCommentSchema,
  memoryIdParamSchema,
  paginationQuerySchema,
  updateCommentSchema,
} from './comments.schema.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.js';

const router = Router();

router.get('/me', requireAuth, validate(paginationQuerySchema, 'query'), controller.mine);

router.get(
  '/memories/:memoryId',
  optionalAuth,
  validate(memoryIdParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  controller.listByMemory
);

router.post(
  '/memories/:memoryId',
  requireAuth,
  validate(memoryIdParamSchema, 'params'),
  validate(createCommentSchema),
  controller.create
);

router.patch(
  '/:id',
  requireAuth,
  validate(commentIdParamSchema, 'params'),
  validate(updateCommentSchema),
  controller.update
);

router.delete(
  '/:id',
  requireAuth,
  validate(commentIdParamSchema, 'params'),
  controller.remove
);

export default router;
