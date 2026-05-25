import asyncHandler from "express-async-handler";
import Receipt from "../models/Receipt.js";
import Center from "../models/Center.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { generateDonationReceipt } from "../utils/receiptGenerator.js";

const getUserCenterId = (req) => {
  return req.user?.center?._id || req.user?.center || null;
};

const generateReceiptNumber = async (type = "DONATION") => {
  const prefixMap = {
    DONATION: "DON",
    STUDENT_FEE: "FEE",
    EXPENSE: "EXP",
  };

  const prefix = prefixMap[type] || "REC";
  const year = new Date().getFullYear();

  const count = await Receipt.countDocuments({
    type,
    receiptNumber: new RegExp(`^${prefix}-${year}-`),
  });

  const sequence = String(count + 1).padStart(4, "0");

  return `${prefix}-${year}-${sequence}`;
};

// POST /api/receipts
export const createReceipt = asyncHandler(async (req, res) => {
  const {
    type = "DONATION",
    center,
    donorName,
    donorAddress,
    student,
    studentName,
    rscNumber,
    amount,
    paymentMode = "CASH",
    purpose = "Donation",
    notes,
    receiptDate,
  } = req.body;

  if (!amount || Number(amount) <= 0) {
    return sendError(res, 400, "Valid amount is required");
  }

  const finalType = type || "DONATION";

  if (!["DONATION", "STUDENT_FEE", "EXPENSE"].includes(finalType)) {
    return sendError(res, 400, "Invalid receipt type");
  }

  let finalCenterId = null;

  if (req.user.role === "CENTER_ADMIN") {
    finalCenterId = getUserCenterId(req);
  } else {
    finalCenterId = center;
  }

  if (!finalCenterId) {
    return sendError(res, 400, "Center is required for receipt");
  }

  const centerExists = await Center.findOne({
    _id: finalCenterId,
    deleted: false,
  });

  if (!centerExists) {
    return sendError(res, 404, "Center not found");
  }

  if (finalType === "DONATION" && !donorName) {
    return sendError(res, 400, "Donor name is required");
  }

  const receiptNumber = await generateReceiptNumber(finalType);

  const receipt = await Receipt.create({
    receiptNumber,
    type: finalType,
    center: finalCenterId,
    donorName,
    donorAddress,
    student: student || null,
    studentName,
    rscNumber,
    amount: Number(amount),
    paymentMode,
    purpose,
    notes,
    receiptDate: receiptDate || new Date(),
    createdBy: req.user._id,
  });

  const populatedReceipt = await Receipt.findById(receipt._id)
    .populate("center", "centerName centerCode city state")
    .populate("createdBy", "firstName lastName email role");

  return sendSuccess(res, 201, "Receipt created successfully", {
    receipt: populatedReceipt,
  });
});

// GET /api/receipts
export const getReceipts = asyncHandler(async (req, res) => {
  const { type, search } = req.query;

  const filter = {
    deleted: false,
  };

  if (req.user.role === "CENTER_ADMIN") {
    filter.center = getUserCenterId(req);
  }

  if (type) {
    filter.type = type;
  }

  if (search) {
    filter.$or = [
      { receiptNumber: new RegExp(search, "i") },
      { donorName: new RegExp(search, "i") },
      { studentName: new RegExp(search, "i") },
      { rscNumber: new RegExp(search, "i") },
    ];
  }

  const receipts = await Receipt.find(filter)
    .populate("center", "centerName centerCode city state")
    .populate("createdBy", "firstName lastName email role")
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, "Receipts fetched successfully", {
    receipts,
  });
});

// GET /api/receipts/:id
export const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    deleted: false,
  })
    .populate("center", "centerName centerCode city state")
    .populate("createdBy", "firstName lastName email role");

  if (!receipt) {
    return sendError(res, 404, "Receipt not found");
  }

  if (
    req.user.role === "CENTER_ADMIN" &&
    String(receipt.center?._id || receipt.center) !==
      String(getUserCenterId(req))
  ) {
    return sendError(res, 403, "You are not allowed to view this receipt");
  }

  return sendSuccess(res, 200, "Receipt fetched successfully", {
    receipt,
  });
});

// GET /api/receipts/:id/download
// GET /api/receipts/:id/download
export const downloadReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    deleted: false,
  }).populate("center", "centerName centerCode city state");

  if (!receipt) {
    return sendError(res, 404, "Receipt not found");
  }

  if (
    req.user.role === "CENTER_ADMIN" &&
    String(receipt.center?._id || receipt.center) !== String(getUserCenterId(req))
  ) {
    return sendError(res, 403, "You are not allowed to download this receipt");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${receipt.receiptNumber || "receipt"}.pdf`
  );

  return generateDonationReceipt(res, {
    receiptNumber: receipt.receiptNumber,

    donorName:
      receipt.donorName ||
      receipt.studentName ||
      "N/A",

    donorAddress:
      receipt.donorAddress ||
      receipt.rscNumber ||
      "",

    amount: receipt.amount,
    date: receipt.receiptDate || receipt.createdAt,
    category: receipt.purpose || receipt.type || "Donation",
    notes: receipt.notes,
    centerName: receipt.center?.centerName || "RAISINA STUDY CENTER",
  });
});

// DELETE /api/receipts/:id
export const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!receipt) {
    return sendError(res, 404, "Receipt not found");
  }

  if (
    req.user.role === "CENTER_ADMIN" &&
    String(receipt.center) !== String(getUserCenterId(req))
  ) {
    return sendError(res, 403, "You are not allowed to delete this receipt");
  }

  receipt.deleted = true;
  await receipt.save();

  return sendSuccess(res, 200, "Receipt deleted successfully");
});
