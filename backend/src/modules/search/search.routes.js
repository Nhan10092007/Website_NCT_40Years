import { Router } from 'express';
import * as controller from './search.controller.js';
import { searchQuerySchema } from './search.schema.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

router.get('/', validate(searchQuerySchema, 'query'), controller.search);

export default router;
