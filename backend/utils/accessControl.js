/**
 * accessControl.js
 * Copied + adapted from reference repo.
 *
 * Two helpers used by every controller:
 *
 *  resolveCenterScope(req, overrideCenterId?)
 *    - CENTER_ADMIN → always returns their own centerId (override ignored)
 *    - SUPER_ADMIN   → returns overrideCenterId if provided, else null (all centers)
 *
 *  ensureCenterScope(req, resourceCenterId)
 *    - Throws 403 if a CENTER_ADMIN tries to access a resource from another center
 */

import createError from 'http-errors';

/**
 * @param {import('express').Request} req
 * @param {string|null} [overrideCenterId] - Only used for SUPER_ADMIN to filter by a specific center
 * @returns {string|null} centerId or null (null = all centers, SUPER_ADMIN only)
 */
export function resolveCenterScope(req, overrideCenterId = null) {
  if (req.user.role === 'CENTER_ADMIN') {
    // Center admin is always locked to their own center
    return req.user.center?._id?.toString() ?? req.user.center?.toString();
  }

  // SUPER_ADMIN — use override if provided
  return overrideCenterId ? overrideCenterId.toString() : null;
}

/**
 * @param {import('express').Request} req
 * @param {string|import('mongoose').Types.ObjectId} resourceCenterId
 * @throws {HttpError} 403 if CENTER_ADMIN accessing another center's resource
 */
export function ensureCenterScope(req, resourceCenterId) {
  if (req.user.role !== 'CENTER_ADMIN') return; // SUPER_ADMIN passes always

  const userCenter = req.user.center?._id?.toString() ?? req.user.center?.toString();
  const resourceCenter = resourceCenterId?.toString();

  if (userCenter !== resourceCenter) {
    throw createError(403, 'Access denied — resource belongs to a different center');
  }
}