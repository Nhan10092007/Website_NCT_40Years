import { z } from 'zod';

export const locationIdentifierParamSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, { message: 'Mã hoặc đường dẫn địa điểm không được để trống' }),
});

export const memoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Mã bài viết kỷ niệm (id) phải là số nguyên dương' }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});
