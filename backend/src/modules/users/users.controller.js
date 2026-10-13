import * as service from './users.service.js';

export async function me(req, res, next) {
  try {
    const user = await service.getProfile(req.user.id);

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await service.getUserById(Number(req.params.id));

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await service.updateProfile(
      req.user.id,
      req.user.role,
      req.body
    );

    res.json({ user });
  } catch (err) {
    next(err);
  }
}