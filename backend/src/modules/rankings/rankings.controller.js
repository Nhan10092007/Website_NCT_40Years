import * as service from './rankings.service.js';

export async function topLocations(req, res, next) {
  try {
    const query = req.validated_query || req.query;
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const sortBy = query.sortBy || 'checkins';
    const data = await service.getTopLocations({ limit, sortBy });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function topExplorers(req, res, next) {
  try {
    const query = req.validated_query || req.query;
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const data = await service.getTopExplorers({ limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function topCohorts(req, res, next) {
  try {
    const query = req.validated_query || req.query;
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const data = await service.getTopCohorts({ limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function overview(req, res, next) {
  try {
    const data = await service.getRankingsOverview();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
