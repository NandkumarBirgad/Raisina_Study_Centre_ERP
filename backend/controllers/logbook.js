import asyncHandler from "express-async-handler";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope } from "../utils/accessControl.js";
import Logbook from "../models/LogBook.js";
import Transaction from "../models/Transaction.js";
import Student from "../models/Student.js";
import Mess from "../models/Mess.js";

const LIBRARY_MONTHLY_FEE = 100;
const HOSTEL_MONTHLY_FEE = 1500;

const buildCenterFilter = (req, overrideCenterId = null) => {
  const centerId = resolveCenterScope(req, overrideCenterId);
  return centerId ? { center: centerId } : {};
};

const getCenterIdForWrite = (req, overrideCenterId = null) => {
  return resolveCenterScope(req, overrideCenterId);
};

const isValidMonth = (month) => {
  return /^\d{4}-\d{2}$/.test(month);
};

// Create or update a monthly logbook entry
export const upsertLogbookEntry = asyncHandler(async (req, res) => {
  const { centerId, studentId, month, services = {}, fees = {} } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  if (!month || !isValidMonth(month)) {
    return sendError(res, 400, "month must be in YYYY-MM format");
  }

  const student = await Student.findOne({
    _id: studentId,
    center: finalCenterId,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  if (student.studentType !== "NON_SCHOLARSHIP") {
    return sendError(
      res,
      400,
      "Logbook entries only apply to NON_SCHOLARSHIP students"
    );
  }

  const finalServices = {
    hostel: Boolean(services?.hostel ?? student.facilities?.hostel),
    mess: Boolean(services?.mess ?? student.facilities?.mess),
    library: Boolean(services?.library ?? student.facilities?.library),
  };

  let messFee = 0;

  if (finalServices.mess) {
    const mess = student.mess
      ? await Mess.findOne({
          _id: student.mess,
          center: finalCenterId,
          deleted: false,
        })
      : await Mess.findOne({
          center: finalCenterId,
          status: "ACTIVE",
          deleted: false,
        });

    messFee = Number(mess?.monthlyFee || 0);
  }

  const finalFees = {
    hostel: finalServices.hostel
      ? Number(fees?.hostel ?? HOSTEL_MONTHLY_FEE)
      : 0,

    mess: finalServices.mess ? Number(fees?.mess ?? messFee) : 0,

    library: finalServices.library
      ? Number(fees?.library ?? student.libraryProfile?.monthlyFee ?? LIBRARY_MONTHLY_FEE)
      : 0,
  };

  const totalAmount =
    (finalServices.hostel ? finalFees.hostel : 0) +
    (finalServices.mess ? finalFees.mess : 0) +
    (finalServices.library ? finalFees.library : 0);

  const entry = await Logbook.findOneAndUpdate(
    {
      student: studentId,
      month,
    },
    {
      center: finalCenterId,
      student: studentId,
      month,
      services: finalServices,
      fees: finalFees,
      totalAmount,
      deleted: false,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).populate("student", "studentName rscNumber mobileNumber studentType");

  return sendSuccess(res, 200, "Logbook entry saved", entry);
});

// Get all logbook entries for a month
export const getLogbookByMonth = asyncHandler(async (req, res) => {
  const { month } = req.params;
  const { centerId } = req.query;

  if (!month || !isValidMonth(month)) {
    return sendError(res, 400, "month must be in YYYY-MM format");
  }

  const filter = {
    ...buildCenterFilter(req, centerId),
    month,
    deleted: false,
  };

  const entries = await Logbook.find(filter)
    .populate("student", "studentName rscNumber mobileNumber studentType")
    .populate("center", "centerName centerCode city")
    .sort({ createdAt: 1 });

  const totalDue = entries.reduce(
    (sum, entry) => sum + Number(entry.totalAmount || 0),
    0
  );

  const totalCollected = entries
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0);

  const pendingAmount = totalDue - totalCollected;

  return sendSuccess(res, 200, "Logbook fetched", {
    entries,
    totalDue,
    totalCollected,
    pendingAmount,
  });
});

// Get logbook entries for a specific student
export const getLogbookByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    student: studentId,
    deleted: false,
  };

  const entries = await Logbook.find(filter)
    .populate("student", "studentName rscNumber mobileNumber studentType")
    .populate("center", "centerName centerCode city")
    .sort({ month: -1 });

  return sendSuccess(res, 200, "Student logbook fetched", entries);
});

// Mark a logbook entry as paid and create receipt transaction
export const markLogbookPaid = asyncHandler(async (req, res) => {
  const { paymentMode = "CASH", paidDate, notes } = req.body;

  const entry = await Logbook.findOne({
    _id: req.params.id,
    ...buildCenterFilter(req),
    paid: false,
    deleted: false,
  }).populate("student", "studentName rscNumber");

  if (!entry) {
    return sendError(res, 404, "Logbook entry not found or already paid");
  }

  if (Number(entry.totalAmount || 0) <= 0) {
    return sendError(res, 400, "No payable amount for this entry");
  }

  const txnDate = paidDate ? new Date(paidDate) : new Date();

  const txn = await Transaction.create({
    center: entry.center,
    type: "CREDIT",
    source: "STUDENT_FEE",
    category: "STUDENT_FEES",
    amount: entry.totalAmount,
    date: txnDate,
    student: entry.student._id,
    month: entry.month,
    paymentMode,
    notes:
      notes ||
      `Monthly fee for ${entry.student.studentName} - ${entry.month}`,
  });

  entry.paid = true;
  entry.paidDate = txnDate;
  entry.transactionId = txn._id;
  entry.receiptNumber = txn.receiptNumber;

  await entry.save();

  const populatedTxn = await Transaction.findById(txn._id)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber");

  return sendSuccess(res, 200, "Payment recorded", {
    entry,
    transaction: populatedTxn,
  });
});