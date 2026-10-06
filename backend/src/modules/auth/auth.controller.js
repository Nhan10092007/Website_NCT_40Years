import * as service from './auth.service.js';
import { generateCohorts } from '../../utils/cohorts.js';

export async function register(req, res, next) {
  try {
    res.status(201).json(await service.register(req.body));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    res.json(await service.login(req.body));
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json({ user: await service.getMe(req.user.id) });
  } catch (err) {
    next(err);
  }
}

export function cohorts(req, res) {
  res.json(generateCohorts());
}