import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100, { message: 'Từ khóa tìm kiếm không quá 100 ký tự' }).optional(),
  type: z.enum(['all', 'users', 'locations', 'memories']).default('all').optional(),
  cohort: z.string().trim().max(50).optional(),
  className: z.string().trim().max(50).optional(),
  role: z.enum(['student', 'alumni', 'teacher']).optional(),
  year: z.coerce.number().int().min(1986).max(2030).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});
