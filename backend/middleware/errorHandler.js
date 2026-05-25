/**
 * asyncHandler — wraps async route handlers, forwards errors to express error handler
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;

/**
 * 404 handler — mount AFTER all routes
 */
export const notFound = (req, res, next) => {
  const err = new Error(`Not Found — ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

/**
 * Global error handler — mount last
 */
export const errorHandler = (err, req, res, _next) => {
  // http-errors or manually set status
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${status} — ${message}\n`, err.stack);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};