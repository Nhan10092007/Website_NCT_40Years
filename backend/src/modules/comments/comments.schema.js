import { z } from 'zod';

export const memoryIdParamSchema = z.object({
  memoryId: z.coerce.number().int().positive({ message: 'Mã bài viết kỷ niệm (memoryId) phải là số nguyên dương' }),
});

export const commentIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Mã bình luận (id) phải là số nguyên dương' }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Nội dung bình luận không được để trống' })
    .max(2000, { message: 'Nội dung bình luận không được vượt quá 2000 ký tự' }),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Nội dung bình luận không được để trống' })
    .max(2000, { message: 'Nội dung bình luận không được vượt quá 2000 ký tự' }),
});
