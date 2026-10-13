import { Router } from 'express';
import * as controller from './admin.controller.js';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  memoryIdParamSchema,
  listMemoriesQuerySchema,
  bulkReviewSchema,
  commentIdParamSchema,
  listCommentsQuerySchema,
  userIdParamSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserAdminSchema,
} from './admin.schema.js';

const router = Router();

// Mọi API trong module này chỉ dành cho admin, nên kiểm tra một lần ở đầu router.
// 1. requireAuth: phải đăng nhập (401).
// 2. requireAdmin: token ghi là admin (403).
// 3. confirmAdminInDatabase: database cũng xác nhận vẫn là admin (403),
//    để người vừa bị thu quyền không dùng được token cũ.
router.use(requireAuth, requireAdmin, controller.confirmAdminInDatabase);

/* ==================== THỐNG KÊ ==================== */

// Số liệu cho trang tổng quan: người dùng theo vai trò, bài viết theo trạng thái...
router.get('/stats', controller.stats);

/* ==================== DUYỆT BÀI VIẾT KỶ NIỆM ==================== */

// Danh sách bài viết (mặc định là hàng chờ pending; ?status=all để xem mọi trạng thái)
router.get('/memories', validate(listMemoriesQuerySchema, 'query'), controller.listMemories);

// Duyệt hoặc từ chối nhiều bài cùng lúc
router.post('/memories/bulk-review', validate(bulkReviewSchema), controller.bulkReview);

// Chi tiết một bài viết ở bất kỳ trạng thái nào
router.get('/memories/:id', validate(memoryIdParamSchema, 'params'), controller.memoryDetail);

// Duyệt một bài: pending (hoặc rejected) -> approved, bài hiện công khai
router.patch(
  '/memories/:id/approve',
  validate(memoryIdParamSchema, 'params'),
  controller.approveMemory
);

// Từ chối một bài: -> rejected, bài bị ẩn khỏi công khai
router.patch(
  '/memories/:id/reject',
  validate(memoryIdParamSchema, 'params'),
  controller.rejectMemory
);

/* ==================== GỠ BÌNH LUẬN ==================== */

router.get('/comments', validate(listCommentsQuerySchema, 'query'), controller.listComments);

router.delete(
  '/comments/:id',
  validate(commentIdParamSchema, 'params'),
  controller.removeComment
);

/* ==================== QUẢN LÝ NGƯỜI DÙNG ==================== */

// Danh sách người dùng (tìm theo tên hoặc email, lọc theo vai trò, niên khóa, lớp, admin)
router.get('/users', validate(listUsersQuerySchema, 'query'), controller.listUsers);

router.get('/users/:id', validate(userIdParamSchema, 'params'), controller.userDetail);

// Đổi vai trò (student / alumni / teacher)
router.patch(
  '/users/:id/role',
  validate(userIdParamSchema, 'params'),
  validate(updateUserRoleSchema),
  controller.changeUserRole
);

// Cấp hoặc thu hồi quyền admin
router.patch(
  '/users/:id/admin',
  validate(userIdParamSchema, 'params'),
  validate(updateUserAdminSchema),
  controller.setUserAdmin
);

// Xóa tài khoản (kèm toàn bộ nội dung của người đó)
router.delete('/users/:id', validate(userIdParamSchema, 'params'), controller.removeUser);

export default router;