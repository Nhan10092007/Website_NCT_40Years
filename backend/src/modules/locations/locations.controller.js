import * as service from './locations.service.js';
import { AppError } from '../../utils/appError.js';

export async function list(req, res, next) {
  try {
    const currentUserId = req.user?.id || null;
    const locations = await service.listLocations(currentUserId);
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const identifier = req.params.identifier || req.params.slug;
    const currentUserId = req.user?.id || null;
    const location = await service.getLocationByIdentifier(identifier, currentUserId);
    if (!location) {
      throw new AppError('Không tìm thấy địa điểm', 404);
    }
    res.json(location);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const newLocation = await service.createLocation(req.body);
    res.status(201).json({
      message: 'Tạo địa điểm thành công',
      location: newLocation,
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const updated = await service.updateLocation(identifier, req.body);
    res.json({
      message: 'Cập nhật địa điểm thành công',
      location: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const deleted = await service.deleteLocation(identifier);
    res.json({
      message: 'Xóa địa điểm thành công',
      location: deleted,
    });
  } catch (err) {
    next(err);
  }
}

export async function addPhoto(req, res, next) {
  try {
    const identifier = req.params.identifier;
    const photo = await service.addPhotoToLocation(identifier, req.body);
    res.status(201).json({
      message: 'Thêm ảnh tư liệu thành công',
      photo,
    });
  } catch (err) {
    next(err);
  }
}

export async function removePhoto(req, res, next) {
  try {
    const photoId = Number(req.params.photoId);
    const deleted = await service.deletePhoto(photoId);
    if (!deleted) {
      throw new AppError('Không tìm thấy ảnh tư liệu', 404);
    }
    res.json({
      message: 'Xóa ảnh tư liệu thành công',
      photo: deleted,
    });
  } catch (err) {
    next(err);
  }
}

export async function addLink(req, res, next) {
  try {
    const fromIdentifier = req.params.identifier;
    const link = await service.addLinkBetweenLocations(fromIdentifier, req.body);
    res.status(201).json({
      message: 'Tạo liên kết 360° thành công',
      link,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeLink(req, res, next) {
  try {
    const linkId = Number(req.params.linkId);
    const deleted = await service.deleteLink(linkId);
    if (!deleted) {
      throw new AppError('Không tìm thấy liên kết 360°', 404);
    }
    res.json({
      message: 'Xóa liên kết 360° thành công',
      link: deleted,
    });
  } catch (err) {
    next(err);
  }
}