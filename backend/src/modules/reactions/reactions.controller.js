import * as service from './reactions.service.js';
import { AppError } from '../../utils/appError.js';

/* ==================== LOCATION LIKES ==================== */

export async function getLocationLikes(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const userId = req.user?.id || null;
    const stats = await service.getLocationLikes(identifier, userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function likeLocation(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const result = await service.likeLocation(req.user.id, identifier);
    res.status(201).json({
      message: 'Đã thích địa điểm',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function unlikeLocation(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const deleted = await service.unlikeLocation(req.user.id, identifier);
    if (!deleted) {
      throw new AppError('Bạn chưa thích địa điểm này', 404);
    }
    res.json({
      message: 'Đã bỏ thích địa điểm',
      data: deleted,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleLocation(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const result = await service.toggleLocationLike(req.user.id, identifier);
    res.json({
      message: result.liked ? 'Đã thích địa điểm' : 'Đã bỏ thích địa điểm',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLocationLikers(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const result = await service.getLocationLikers(identifier, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function topLikedLocations(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const top = await service.getTopLikedLocations(limit);
    res.json(top);
  } catch (err) {
    next(err);
  }
}

export async function myLikedLocations(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const result = await service.getMyLikedLocations(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/* ==================== MEMORY LIKES ==================== */

export async function getMemoryLikes(req, res, next) {
  try {
    const memoryId = Number(req.params.id);
    const userId = req.user?.id || null;
    const stats = await service.getMemoryLikes(memoryId, userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function likeMemory(req, res, next) {
  try {
    const memoryId = Number(req.params.id);
    const result = await service.likeMemory(req.user.id, memoryId);
    res.status(201).json({
      message: 'Đã thích bài viết',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function unlikeMemory(req, res, next) {
  try {
    const memoryId = Number(req.params.id);
    const deleted = await service.unlikeMemory(req.user.id, memoryId);
    if (!deleted) {
      throw new AppError('Bạn chưa thích bài viết này', 404);
    }
    res.json({
      message: 'Đã bỏ thích bài viết',
      data: deleted,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleMemory(req, res, next) {
  try {
    const memoryId = Number(req.params.id);
    const result = await service.toggleMemoryLike(req.user.id, memoryId);
    res.json({
      message: result.liked ? 'Đã thích bài viết' : 'Đã bỏ thích bài viết',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function myLikedMemories(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const result = await service.getMyLikedMemories(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
