import config from '../config/index.js';
import * as authService from '../services/auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const requireAuth = async (req, res, next) => {
  try {
    const rawToken = req.cookies[config.cookie.name];

    if (!rawToken) {
      throw new UnauthorizedError('Authentication required');
    }

    const session = await authService.getSessionFromRawToken(rawToken);
    if (!session) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    // Attach for downstream handlers.
    req.user = session.user;
    req.sessionId = session.sessionId;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError(`Requires role: ${allowedRoles.join(' or ')}`));
  }
  next();
};