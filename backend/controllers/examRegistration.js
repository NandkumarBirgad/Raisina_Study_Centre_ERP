import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Center from "../models/Center.js";
import ExamRegistration from "../models/ExamRegistration.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope, ensureCenterScope } from "../utils/accessControl.js";
import { generateExamRegistrationNumber } from "../utils/examRegistrationNumber.js";
import { ensureDefaultCenters } from "../services/centerBootstrap.js";

// Public: GET /api/public/centers
export const getPublicCenters = asyncHandler(async (req, res) => {
  await ensureDefaultCenters();

  const centers = await Center.find({ deleted: false })
    .select("centerName city state centerCode address phone contactNumber email")
    .sort({ centerName: 1 });

  return sendSuccess(res, 200, "Centers fetched", centers);
});

// Public: POST /api/public/exam-register
export const registerCandidate = asyncHandler(async (req, res) => {
  const {
    fullName,
    mobileNumber,
    dob,
    addressLine,

    // New frontend fields
    preferredExamCenter,
    preferredAdmissionCenter,

    // Old frontend / backward compatibility
    preferredCenter,

    year,
  } = req.body;

  const examCenterId = preferredExamCenter || preferredCenter;
  const admissionCenterId =
    preferredAdmissionCenter || preferredCenter || preferredExamCenter;

  if (
    !fullName ||
    !mobileNumber ||
    !dob ||
    !addressLine ||
    !examCenterId ||
    !admissionCenterId
  ) {
    return sendError(
      res,
      400,
      "fullName, mobileNumber, dob, addressLine, preferredExamCenter, and preferredAdmissionCenter are required"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(examCenterId) ||
    !mongoose.Types.ObjectId.isValid(admissionCenterId)
  ) {
    return sendError(res, 400, "Invalid center selected");
  }

  const examYear = year ? Number(year) : new Date().getFullYear();

  const [examCenter, admissionCenter] = await Promise.all([
    Center.findOne({
      _id: examCenterId,
      deleted: false,
    }),

    Center.findOne({
      _id: admissionCenterId,
      deleted: false,
    }),
  ]);

  if (!examCenter) {
    return sendError(res, 404, "Preferred exam center not found");
  }

  if (!admissionCenter) {
    return sendError(res, 404, "Preferred admission center not found");
  }

  const existing = await ExamRegistration.findOne({
    mobileNumber,
    year: examYear,
    deleted: false,
    $or: [
      { preferredExamCenter: examCenterId },
      { preferredCenter: examCenterId },
    ],
  });

  if (existing) {
    return sendError(
      res,
      409,
      "Candidate is already registered for this exam center and year",
      {
        registrationNumber: existing.registrationNumber,
      }
    );
  }

  const registrationNumber = await generateExamRegistrationNumber(
    examCenterId,
    examYear
  );

  const registration = await ExamRegistration.create({
    registrationNumber,
    year: examYear,
    fullName: fullName.trim(),
    mobileNumber: mobileNumber.trim(),
    dob,
    addressLine: addressLine.trim(),

    // Legacy compatibility
    preferredCenter: examCenterId,

    // New fields
    preferredExamCenter: examCenterId,
    preferredAdmissionCenter: admissionCenterId,
  });

  return sendSuccess(res, 201, "Exam registration successful", registration);
});

// Admin: GET /api/exam-registrations?centerId=&year=&status=
export const getExamRegistrations = asyncHandler(async (req, res) => {
  const { centerId, year, status } = req.query;

  const scopeCenterId = resolveCenterScope(req, centerId);

  const filter = { deleted: false };

  if (scopeCenterId) {
    filter.$or = [
      { preferredExamCenter: scopeCenterId },
      { preferredCenter: scopeCenterId },
    ];
  }

  if (year) {
    filter.year = Number(year);
  }

  if (status) {
    filter.status = status;
  }

  const registrations = await ExamRegistration.find(filter)
    .populate("preferredCenter", "centerName centerCode city")
    .populate("preferredExamCenter", "centerName centerCode city")
    .populate("preferredAdmissionCenter", "centerName centerCode city")
    .populate("linkedStudent", "studentName rscNumber prn studentType")
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, "Exam registrations fetched", registrations);
});

// Admin: GET /api/exam-registrations/:id
export const getExamRegistrationById = asyncHandler(async (req, res) => {
  const registration = await ExamRegistration.findOne({
    _id: req.params.id,
    deleted: false,
  })
    .populate("preferredCenter", "centerName centerCode city")
    .populate("preferredExamCenter", "centerName centerCode city")
    .populate("preferredAdmissionCenter", "centerName centerCode city")
    .populate("linkedStudent", "studentName rscNumber prn studentType")
    .populate("linkedMeritList", "year scholarshipCutoffRank");

  if (!registration) {
    return sendError(res, 404, "Exam registration not found");
  }

  const scopedCenterId =
    registration.preferredExamCenter?._id ||
    registration.preferredCenter?._id ||
    registration.preferredCenter;

  ensureCenterScope(req, scopedCenterId);

  return sendSuccess(res, 200, "Exam registration fetched", registration);
});

// Admin: PATCH /api/exam-registrations/:id/status
export const updateExamRegistrationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const allowedStatuses = [
    "REGISTERED",
    "MERIT_LISTED",
    "ADMITTED",
    "CANCELLED",
  ];

  if (!allowedStatuses.includes(status)) {
    return sendError(res, 400, "Invalid registration status");
  }

  const registration = await ExamRegistration.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!registration) {
    return sendError(res, 404, "Exam registration not found");
  }

  const scopedCenterId =
    registration.preferredExamCenter ||
    registration.preferredCenter;

  ensureCenterScope(req, scopedCenterId);

  registration.status = status;
  await registration.save();

  return sendSuccess(res, 200, "Registration status updated", registration);
});