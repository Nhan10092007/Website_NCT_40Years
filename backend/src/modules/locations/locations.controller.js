import * as service from './locations.service.js';

export async function list(req, res, next) {
  try {
    res.json(await service.listLocations());
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const location = await service.getLocationBySlug(req.params.slug);
    if (!location) return res.status(404).json({ message: 'Không tìm thấy địa điểm' });
    res.json(location);
  } catch (err) {
    next(err);
  }
}