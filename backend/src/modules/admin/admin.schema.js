import { z } from 'zod';
import { isValidCohort } from '../../utils/cohorts.js';

/* ==================== HÀM VÀ HẰNG SỐ DÙNG CHUNG ==================== */

// ID trong database là kiểu INT của Postgres (tối đa 2147483647).
// Số lớn hơn sẽ làm câu SQL báo lỗi và client nhận 500 thay vì 400.
const MAX_ID = 2147483647;

// Trạng thái bài viết kỷ niệm, khớp với CHECK của cột memories.status trong schema.sql
const MEMORY_STATUSES = ['pending', 'approved', 'rejected'];

// Vai trò (thân phận) của người dùng, khớp với CHECK của cột users.role trong schema.sql
const USER_ROLES = ['student', 'alumni', 'teacher'];

// Số nguyên dương dùng làm ID.
// Mọi kiểu sai (chữ, số âm, số thập phân, số quá lớn) đều dùng chung một thông báo.
function idSchema(message) {
  return z.coerce
    .number({ message })
    .int({ message })
    .positive({ message })
    .max(MAX_ID, { message });
}

// Axios hoặc form ở frontend hay gửi tham số rỗng (ví dụ ?locationId=&q=).
// Hàm này coi chuỗi rỗng như không gửi. Truyền vào schema đã gắn .optional() hoặc .default().
function emptyToUndefined(schema) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}

const PAGE_MESSAGE = 'Số trang phải là số nguyên từ 1 trở lên';
const LIMIT_MESSAGE = 'Số mục mỗi trang phải là số nguyên từ 1 đến 50';

// Phân trang dùng chung cho các danh sách của admin
const paginationShape = {
  page: emptyToUndefined(
    z.coerce
      .number({ message: PAGE_MESSAGE })
      .int({ message: PAGE_MESSAGE })
      .min(1, { message: PAGE_MESSAGE })
      .default(1)
  ),
  limit: emptyToUndefined(
    z.coerce
      .number({ message: LIMIT_MESSAGE })
      .int({ message: LIMIT_MESSAGE })
      .min(1, { message: LIMIT_MESSAGE })
      .max(50, { message: LIMIT_MESSAGE })
      .default(10)
  ),
};

// Từ khóa tìm kiếm (không bắt buộc, tối đa 100 ký tự)
const searchSchema = emptyToUndefined(
  z.string().trim().max(100, { message: 'Từ khóa tìm kiếm tối đa 100 ký tự' }).optional()
);

/* ==================== DUYỆT BÀI VIẾT KỶ NIỆM ==================== */

export const memoryIdParamSchema = z.object({
  id: idSchema('Mã bài viết kỷ niệm (id) phải là số nguyên dương'),
});

// Danh sách bài viết cho admin duyệt.
// status mặc định là "pending" (hàng chờ duyệt); "all" nghĩa là không lọc theo trạng thái.
export const listMemoriesQuerySchema = z.object({
  status: emptyToUndefined(
    z
      .enum([...MEMORY_STATUSES, 'all'], {
        message: 'Trạng thái phải là pending, approved, rejected hoặc all',
      })
      .default('pending')
  ),
  locationId: emptyToUndefined(
    idSchema('Mã góc trường (locationId) phải là số nguyên dương').optional()
  ),
  userId: emptyToUndefined(
    idSchema('Mã người đăng (userId) phải là số nguyên dương').optional()
  ),
  q: searchSchema,
  order: emptyToUndefined(
    z.enum(['asc', 'desc'], { message: 'Thứ tự sắp xếp phải là asc hoặc desc' }).optional()
  ),
  ...paginationShape,
});

// Duyệt hoặc từ chối nhiều bài cùng lúc
export const bulkReviewSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    message: 'Hành động phải là "approve" (duyệt) hoặc "reject" (từ chối)',
  }),
  ids: z
    .array(idSchema('Mã bài viết kỷ niệm phải là số nguyên dương'), {
      message: 'ids phải là một mảng mã bài viết kỷ niệm',
    })
    .min(1, { message: 'Vui lòng chọn ít nhất 1 bài viết' })
    .max(100, { message: 'Mỗi lần chỉ xử lý tối đa 100 bài viết' })
    // Bỏ các mã bị lặp để cùng một bài không bị tính hai lần
    .transform((ids) => [...new Set(ids)]),
});

/* ==================== GỠ BÌNH LUẬN ==================== */

export const commentIdParamSchema = z.object({
  id: idSchema('Mã bình luận (id) phải là số nguyên dương'),
});

export const listCommentsQuerySchema = z.object({
  memoryId: emptyToUndefined(
    idSchema('Mã bài viết kỷ niệm (memoryId) phải là số nguyên dương').optional()
  ),
  userId: emptyToUndefined(
    idSchema('Mã người bình luận (userId) phải là số nguyên dương').optional()
  ),
  q: searchSchema,
  ...paginationShape,
});

/* ==================== QUẢN LÝ NGƯỜI DÙNG ==================== */

export const userIdParamSchema = z.object({
  id: idSchema('Mã người dùng (id) phải là số nguyên dương'),
});

// Danh sách người dùng cho admin.
// q tìm theo tên hiển thị hoặc email; không gửi bộ lọc nào thì lấy tất cả.
export const listUsersQuerySchema = z.object({
  q: searchSchema,
  role: emptyToUndefined(
    z.enum(USER_ROLES, { message: 'Vai trò phải là student, alumni hoặc teacher' }).optional()
  ),
  // Query string luôn là chuỗi nên nhận "true" / "false" rồi đổi sang boolean.
  // Không dùng z.coerce.boolean() vì nó coi cả chuỗi "false" là true.
  isAdmin: emptyToUndefined(
    z
      .enum(['true', 'false'], { message: 'isAdmin phải là true hoặc false' })
      .transform((value) => value === 'true')
      .optional()
  ),
  cohort: emptyToUndefined(
    z.string().trim().max(20, { message: 'Niên khóa tối đa 20 ký tự' }).optional()
  ),
  className: emptyToUndefined(
    z.string().trim().max(50, { message: 'Lớp tối đa 50 ký tự' }).optional()
  ),
  order: emptyToUndefined(
    z.enum(['asc', 'desc'], { message: 'Thứ tự sắp xếp phải là asc hoặc desc' }).optional()
  ),
  ...paginationShape,
});

// Đổi vai trò của một người dùng (ví dụ họ chọn nhầm lúc đăng ký).
// Giáo viên không có niên khóa và lớp, giống quy tắc ở đăng ký và hồ sơ.
// Đổi từ giáo viên sang học sinh hoặc cựu học sinh thì phải gửi kèm cohort và className
// (service kiểm tra phần này vì cần biết dữ liệu đang có trong database).
export const updateUserRoleSchema = z
  .object({
    role: z.enum(USER_ROLES, { message: 'Vai trò phải là student, alumni hoặc teacher' }),
    cohort: z
      .string()
      .trim()
      .refine(isValidCohort, { message: 'Niên khóa không hợp lệ' })
      .optional(),
    className: z.string().trim().min(1, { message: 'Lớp không được để trống' }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'teacher' && (data.cohort !== undefined || data.className !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Giáo viên không có niên khóa hoặc lớp',
        path: ['role'],
      });
    }
  });

// Cấp (true) hoặc thu hồi (false) quyền admin
export const updateUserAdminSchema = z.object({
  isAdmin: z.boolean({ message: 'isAdmin phải là true hoặc false' }),
});