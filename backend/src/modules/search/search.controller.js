import * as service from './search.service.js';

export async function search(req, res, next) {
  try {
    const query = req.validated_query || req.query || {};
    const {
      q,
      type = 'all',
      cohort,
      className,
      role,
      year,
      page = 1,
      limit = 10,
    } = query;

    const filters = { q, cohort, className, role, year, page, limit };

    switch (type) {
      case 'users': {
        const result = await service.searchUsers(filters);
        return res.json({
          query: q || null,
          type: 'users',
          ...result,
        });
      }
      case 'locations': {
        const result = await service.searchLocations(filters);
        return res.json({
          query: q || null,
          type: 'locations',
          ...result,
        });
      }
      case 'memories': {
        const result = await service.searchMemories(filters);
        return res.json({
          query: q || null,
          type: 'memories',
          ...result,
        });
      }
      case 'all':
      default: {
        const result = await service.searchAll(filters);
        return res.json({
          query: q || null,
          type: 'all',
          results: result,
        });
      }
    }
  } catch (err) {
    next(err);
  }
}
