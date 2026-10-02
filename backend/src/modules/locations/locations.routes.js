import { Router } from 'express';
import * as controller from './locations.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:slug', controller.detail);

export default router;