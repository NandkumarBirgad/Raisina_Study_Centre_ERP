import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { sendError } from '../utils/responseHandler.js';

/**
 * protect — verifies JWT and attaches req.user
 */
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Not authorised — no token');
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return sendError(res, 401, 'Not authorised — invalid or expired token');
  }

  const user = await User.findById(decoded.id).select('-password').populate('center', 'centerName centerCode');
  if (!user || user.deleted) return sendError(res, 401, 'User not found or deactivated');

  req.user = user;
  next();
});

/**
 * authorizeRoles(...roles) — restricts access to specific roles
 * Usage: authorizeRoles('SUPER_ADMIN') or authorizeRoles('SUPER_ADMIN', 'CENTER_ADMIN')
 */
export const authorizeRoles = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Role '${req.user.role}' is not permitted to access this resource`);
    }
    next();
  };

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no user found",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission.",
      });
    }

    next();
  };
};