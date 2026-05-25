import asyncHandler from 'express-async-handler';
import Center from '../models/Center.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { generateCenterCode } from '../utils/centerCode.js';
import { ensureDefaultCenters } from '../services/centerBootstrap.js';

// GET /api/centers  — SUPER_ADMIN: all; CENTER_ADMIN: own
export const getCenters = asyncHandler(async (req, res) => {
  await ensureDefaultCenters();

  const filter = { deleted: false };
  if (req.user.role === 'CENTER_ADMIN') filter._id = req.user.center;

  const centers = await Center.find(filter).sort('centerName');
  return sendSuccess(res, 200, 'Centers fetched', centers);
});

// GET /api/centers/:id
export const getCenterById = asyncHandler(async (req, res) => {
  const center = await Center.findOne({ _id: req.params.id, deleted: false });
  if (!center) return sendError(res, 404, 'Center not found');

  if (req.user.role === 'CENTER_ADMIN' && center._id.toString() !== req.user.center?.toString()) {
    return sendError(res, 403, 'Access denied');
  }

  return sendSuccess(res, 200, 'Center fetched', center);
});

// POST /api/centers  — SUPER_ADMIN only
export const createCenter = asyncHandler(async (req, res) => {
  const { centerName, name, city, state, address, phone, contactNumber, email, centerCode } = req.body;
  const finalCenterName = (centerName || name || '').trim();

  if (!finalCenterName || !city || !state) {
    return sendError(res, 400, 'centerName, city, and state are required');
  }

  const finalCenterCode = centerCode?.trim()?.toUpperCase() || await generateCenterCode(finalCenterName);

  const center = await Center.create({
    centerName: finalCenterName,
    city,
    state,
    address,
    phone: phone || contactNumber,
    email,
    centerCode: finalCenterCode,
  });

  return sendSuccess(res, 201, 'Center created', center);
});

// PUT /api/centers/:id  — SUPER_ADMIN only
export const updateCenter = asyncHandler(async (req, res) => {
  const { centerName, name, city, state, address, phone, contactNumber, email, centerCode } = req.body;
  const center = await Center.findOne({ _id: req.params.id, deleted: false });
  if (!center) return sendError(res, 404, 'Center not found');

  if (centerName || name) center.centerName = centerName || name;
  if (city) center.city = city;
  if (state) center.state = state;
  if (address !== undefined) center.address = address;
  if (phone !== undefined || contactNumber !== undefined) center.phone = phone || contactNumber;
  if (email !== undefined) center.email = email;
  if (centerCode) center.centerCode = centerCode.trim().toUpperCase();

  await center.save();
  return sendSuccess(res, 200, 'Center updated', center);
});

// DELETE /api/centers/:id  — SUPER_ADMIN only
export const deleteCenter = asyncHandler(async (req, res) => {
  const center = await Center.findOne({ _id: req.params.id, deleted: false });
  if (!center) return sendError(res, 404, 'Center not found');

  center.deleted = true;
  await center.save();
  return sendSuccess(res, 200, 'Center deleted');
});