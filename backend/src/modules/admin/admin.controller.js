import * as service from './admin.service.js';
import { AppError } from '../../utils/appError.js';

/* ==================== KIỂM TRA QUYỀN ==================== */

// Đặt SAU requireAuth và requireAdmin.
// requireAdmin chỉ đọc isAdmin trong token (có thể đã cũ tới 7 ngày),
// nên ở đây hỏi lại database: thu quyền admin của ai là người đó mất quyền ngay,
// tài khoản đã bị xóa cũng không dùng được token cũ nữa.
export async function confirmAdminInDatabase(req, res, next) {
  try {
    const stillAdmin = await service.isAdminInDatabase(req.user.id);
    if (!stillAdmin) {
      throw new AppError('Bạn không có quyền thực hiện thao tác này', 403);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/* ==================== THỐNG KÊ ==================== */

export async function stats(req, res, next) {
  try {
    res.json(await service.getStats());
  } catch (err) {
    next(err);
  }
}

/* ==================== DUYỆT BÀI VIẾT KỶ NIỆM ==================== */

export async function listMemories(req, res, next) {
  try {
    const filters = req.validated_query || req.query;
    res.json(await service.listMemories(filters));
  } catch (err) {
    next(err);
  }
}

export async function memoryDetail(req, res, next) {
  try {
    const memory = await service.getMemory(Number(req.params.id));
    res.json({ memory });
  } catch (err) {
    next(err);
  }
}

export async function approveMemory(req, res, next) {
  try {
    const memory = await service.reviewMemory(Number(req.params.id), 'approve');
    res.json({
      message: 'Đã duyệt bài viết kỷ niệm',
      memory,
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectMemory(req, res, next) {
  try {
    const memory = await service.reviewMemory(Number(req.params.id), 'reject');
    res.json({
      message: 'Đã từ chối bài viết kỷ niệm',
      memory,
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkReview(req, res, next) {
  try {
    const result = await service.bulkReviewMemories(req.body);
    const verb = result.action === 'approve' ? 'duyệt' : 'từ chối';
    res.json({
      message: `Đã ${verb} ${result.updatedIds.length} bài viết kỷ niệm`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/* ==================== GỠ BÌNH LUẬN ==================== */

export async function listComments(req, res, next) {
  try {
    const filters = req.validated_query || req.query;
    res.json(await service.listComments(filters));
  } catch (err) {
    next(err);
  }
}

export async function removeComment(req, res, next) {
  try {
    const comment = await service.deleteComment(Number(req.params.id));
    res.json({
      message: 'Đã xóa bình luận',
      comment,
    });
  } catch (err) {
    next(err);
  }
}

/* ==================== QUẢN LÝ NGƯỜI DÙNG ==================== */

export async function listUsers(req, res, next) {
  try {
    const filters = req.validated_query || req.query;
    res.json(await service.listUsers(filters));
  } catch (err) {
    next(err);
  }
}

export async function userDetail(req, res, next) {
  try {
    const user = await service.getUser(Number(req.params.id));
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changeUserRole(req, res, next) {
  try {
    const user = await service.changeUserRole(Number(req.params.id), req.body);
    res.json({
      message: 'Đã cập nhật vai trò người dùng',
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function setUserAdmin(req, res, next) {
  try {
    const { isAdmin } = req.body;
    const user = await service.setUserAdmin(req.user.id, Number(req.params.id), isAdmin);
    res.json({
      message: isAdmin ? 'Đã cấp quyền admin' : 'Đã thu hồi quyền admin',
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeUser(req, res, next) {
  try {
    const user = await service.deleteUser(req.user.id, Number(req.params.id));
    res.json({
      message: 'Đã xóa tài khoản người dùng',
      user,
    });
  } catch (err) {
    next(err);
  }
}