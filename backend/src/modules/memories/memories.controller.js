import * as service from './memories.service.js';
import { AppError } from '../../utils/appError.js';

export async function list(req, res, next) {
  try {
    const currentUserId = req.user?.id || null;
    const query = req.validated_query || req.query;
    const result = await service.listMemories(currentUserId, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const currentUserId = req.user?.id || null;
    const memory = await service.getMemoryById(Number(req.params.id), currentUserId);
    if (!memory) {
      throw new AppError('Không tìm thấy bài viết kỷ niệm', 404);
    }
    res.json(memory);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const memory = await service.createMemory(req.user.id, req.body);
    res.status(201).json({
      message: 'Đăng bài viết kỷ niệm thành công',
      memory,
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const isAdmin = Boolean(req.user?.isAdmin);
    const result = await service.deleteMemory(req.user.id, Number(req.params.id), isAdmin);
    res.json({
      message: 'Đã xóa bài viết kỷ niệm',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
