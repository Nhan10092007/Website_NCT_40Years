import { Router } from 'express';

import * as controller from './users.controller.js';

import { updateProfileSchema, userIdParamSchema } from './users.schema.js';

import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.get(
  '/me',
  requireAuth,
  controller.me
);

router.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  controller.updateProfile
);

router.get(
  '/:id',
  requireAuth,
  validate(userIdParamSchema, 'params'),
  controller.getById
);


export default router;