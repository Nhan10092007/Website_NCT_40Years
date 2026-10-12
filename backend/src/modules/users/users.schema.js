import { z } from 'zod';
import { isValidCohort } from '../../utils/cohorts.js';

// Không gửi: giữ nguyên. Gửi null hoặc chuỗi rỗng: xóa (lưu NULL).
const clearableText = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value === '' ? null : value))
  .optional();

const clearableUrl = z
  .union([
    z.string().trim().url({ message: 'Đường dẫn ảnh đại diện không hợp lệ' }),
    z.literal(''),
    z.null(),
  ])
  .transform((val) => (val === '' ? null : val))
  .optional();

const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).optional(),
    cohort: z
      .string()
      .refine(isValidCohort, { message: 'Niên khóa không hợp lệ' })
      .optional(),
    className: z.string().trim().min(1).optional(),
    currentCity: clearableText,
    job: clearableText,
    avatarURL: clearableUrl,
    avatarUrl: clearableUrl,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Không có thông tin nào để cập nhật',
  });


export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'ID người dùng phải là số nguyên dương' }),
});

export { updateProfileSchema };