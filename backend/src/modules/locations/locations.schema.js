import { z } from 'zod';

export const locationIdentifierParamSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, { message: 'Mã hoặc đường dẫn (slug) không được để trống' }),
});

export const createLocationSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { message: 'Slug không được để trống' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug chỉ chứa chữ thường, số và dấu gạch ngang' }),
  name: z.string().trim().min(1, { message: 'Tên địa điểm không được để trống' }),
  description: z.string().trim().optional(),
  panoramaUrl: z.string().trim().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export const addPhotoSchema = z.object({
  url: z.string().trim().min(1, { message: 'URL ảnh không được để trống' }),
  kind: z.enum(['old', 'current'], { message: 'Loại ảnh phải là "old" (ảnh xưa) hoặc "current" (ảnh hiện tại)' }),
  year: z.coerce.number().int().min(1980).max(2030).optional(),
});

export const addLinkSchema = z.object({
  toLocationId: z.coerce.number().int().positive({ message: 'Địa điểm đích phải là số nguyên dương' }),
  yaw: z.coerce.number(),
  pitch: z.coerce.number(),
});
