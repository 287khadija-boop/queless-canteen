/**
 * Custom application error with HTTP status, error code, and details
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler for undefined API routes
 */
export function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
        details: null,
      },
    });
  }
  // For static requests, fallback to normal express static handling or next
  next();
}

/**
 * Centralized error-handling middleware
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log error details internally (never expose internal trace to client)
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}]`, err.message, err.stack);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    statusCode >= 500 && isProduction
      ? 'An unexpected internal error occurred. Please contact canteen support.'
      : err.message || 'Something went wrong.';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || null,
    },
  });
}
