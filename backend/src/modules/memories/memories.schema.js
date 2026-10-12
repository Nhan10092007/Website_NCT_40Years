import { z } from 'zod';

export const createMemorySchema = z.object({
  locationId: z.coerce.number().int().positive({ message: 'Vui lòng chọn góc trường hợp lệ' }),
  content: z
    .string()
    .trim()
    .min(5, { message: 'Nội dung kỷ niệm tối thiểu 5 ký tự' })
    .max(3000, { message: 'Nội dung kỷ niệm không vượt quá 3000 ký tự' }),
  year: z.coerce.number().int().min(1986).max(2029).optional(),
  images: z
    .array(z.string().trim().url({ message: 'Đường dẫn ảnh không hợp lệ' }))
    .max(5, { message: 'Tối đa 5 ảnh đính kèm' })
    .optional()
    .default([]),
});

export const listMemoriesQuerySchema = z.object({
  locationId: z.coerce.number().int().positive().optional(),
  locationSlug: z.string().trim().optional(),
  cohort: z.string().trim().optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});

export const memoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Mã bài viết phải là số nguyên dương' }),
});
