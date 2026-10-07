import { z } from 'zod';
import { isValidCohort } from '../../utils/cohorts.js';

// Không gửi: giữ nguyên. Gửi null hoặc chuỗi rỗng: xóa (lưu NULL).
const clearableText = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value === '' ? null : value))
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
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Không có thông tin nào để cập nhật',
  });

export { updateProfileSchema };