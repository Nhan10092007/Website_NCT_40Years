import * as service from './checkins.service.js';
import { AppError } from '../../utils/appError.js';

export async function mine(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const result = await service.getMyCheckins(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function mySummary(req, res, next) {
  try {
    const summary = await service.getMyCheckinSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function locationCount(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const userId = req.user?.id || null;
    const stats = await service.getLocationCheckins(identifier, userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function locationVisitors(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const { cohort, className } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const visitors = await service.getLocationVisitors(identifier, {
      cohort,
      className,
      page,
      limit,
    });
    res.json(visitors);
  } catch (err) {
    next(err);
  }
}

export async function locationCohorts(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const stats = await service.getLocationCohortStats(identifier);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const checkin = await service.createCheckin(req.user.id, identifier);
    res.status(201).json({
      message: 'Check-in thành công',
      checkin,
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const deleted = await service.deleteCheckin(req.user.id, identifier);
    if (!deleted) {
      throw new AppError('Bạn chưa check-in tại địa điểm này', 404);
    }
    res.json({
      message: 'Hủy check-in thành công',
      checkin: deleted,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggle(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const result = await service.toggleCheckin(req.user.id, identifier);
    res.json({
      message: result.checkedIn ? 'Check-in thành công' : 'Đã hủy check-in',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function leaderboardLocations(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const topLocations = await service.getTopLocationsByCheckins(limit);
    res.json(topLocations);
  } catch (err) {
    next(err);
  }
}

export async function leaderboardExplorers(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const topExplorers = await service.getTopExplorers(limit);
    res.json(topExplorers);
  } catch (err) {
    next(err);
  }
}
