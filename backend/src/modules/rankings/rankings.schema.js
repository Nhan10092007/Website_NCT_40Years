import { z } from 'zod';

export const rankingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});

export const topLocationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  sortBy: z.enum(['checkins', 'likes', 'popular']).default('checkins').optional(),
});
