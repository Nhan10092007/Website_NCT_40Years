import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { query } from './config/db.js';
import locationsRoutes from './modules/locations/locations.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/locations', locationsRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

export default app;
