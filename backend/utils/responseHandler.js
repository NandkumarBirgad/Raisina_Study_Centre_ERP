/**
 * Uniform response shape:
 * { success, message, data }
 */

export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendError = (res, statusCode = 500, message = 'Something went wrong', errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });