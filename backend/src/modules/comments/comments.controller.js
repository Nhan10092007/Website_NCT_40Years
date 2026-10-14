import * as service from './comments.service.js';

export async function listByMemory(req, res, next) {
  try {
    const memoryId = Number(req.params.memoryId);
    const { page = 1, limit = 20 } = req.validated_query || req.query;
    const result = await service.listComments(memoryId, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const memoryId = Number(req.params.memoryId);
    const comment = await service.createComment(req.user.id, memoryId, req.body.content);
    res.status(201).json({
      message: 'Đã thêm bình luận',
      comment,
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const comment = await service.updateComment(
      req.user.id,
      commentId,
      req.body.content,
      req.user.isAdmin
    );
    res.json({
      message: 'Đã cập nhật bình luận',
      comment,
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const comment = await service.deleteComment(req.user.id, commentId, req.user.isAdmin);
    res.json({
      message: 'Đã xóa bình luận',
      comment,
    });
  } catch (err) {
    next(err);
  }
}

export async function mine(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.validated_query || req.query;
    const result = await service.getMyComments(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
