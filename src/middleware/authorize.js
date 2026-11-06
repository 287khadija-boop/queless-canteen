import { AppError } from './error-handler.js';

/**
 * Role-Based Authorization Middleware
 * Enforces that req.user possesses one of the allowed roles
 * @param  {...string} allowedRoles - e.g. 'admin', 'staff', 'student'
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before authorization.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
