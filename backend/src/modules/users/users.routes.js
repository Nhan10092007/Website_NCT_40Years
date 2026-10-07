import { Router } from 'express';

import * as controller from './users.controller.js';

import { updateProfileSchema } from './users.schema.js';

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

export default router;