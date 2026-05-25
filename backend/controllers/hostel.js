import asyncHandler from "express-async-handler";
import Hostel from "../models/Hostel.js";
import Student from "../models/Student.js";
import HostelAllocation from "../models/HostelAllocation.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope, ensureCenterScope } from "../utils/accessControl.js";

// GET /api/hostels?centerId=
export const getHostels = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  const filter = { deleted: false };
  if (centerId) filter.center = centerId;

  const hostels = await Hostel.find(filter)
    .populate("center", "centerName centerCode")
    .sort("name");

  return sendSuccess(res, 200, "Hostels fetched", hostels);
});

// GET /api/hostels/eligible-students
// Students who selected hostel facility during admission
export const getEligibleHostelStudents = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const students = await Student.find({
    center: centerId,
    deleted: false,
    "facilities.hostel": true,
  })
    .select(
      "studentName rscNumber prn studentType mobileNumber facilities hostel admissionDate"
    )
    .populate("hostel", "name type")
    .sort({ admissionDate: -1 });

  return sendSuccess(res, 200, "Hostel facility students fetched", students);
});

// GET /api/hostels/allocations
export const getHostelAllocations = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const allocations = await HostelAllocation.find({
    center: centerId,
    deleted: false,
  })
    .populate("hostel", "name type")
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    )
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, "Hostel allocations fetched", allocations);
});

// GET /api/hostels/:id
export const getHostelById = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  }).populate("center", "centerName centerCode");

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center._id);

  return sendSuccess(res, 200, "Hostel fetched", hostel);
});

// POST /api/hostels
export const createHostel = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const { name, type, address, totalRooms, bedsPerRoom, monthlyFee } = req.body;

  if (!name || !type || !totalRooms || !bedsPerRoom) {
    return sendError(
      res,
      400,
      "name, type, totalRooms, bedsPerRoom are required"
    );
  }

  const capacity = parseInt(totalRooms) * parseInt(bedsPerRoom);

  const hostel = await Hostel.create({
    name,
    type,
    address,
    totalRooms,
    bedsPerRoom,
    capacity,
    occupancy: 0,
    monthlyFee: Number(monthlyFee) || 0,
    center: centerId,
  });

  return sendSuccess(res, 201, "Hostel created", hostel);
});

// PUT /api/hostels/:id
export const updateHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center);

  const { name, type, address, totalRooms, bedsPerRoom, monthlyFee } = req.body;

  if (name) hostel.name = name;
  if (type) hostel.type = type;
  if (address !== undefined) hostel.address = address;
  if (monthlyFee !== undefined) hostel.monthlyFee = Number(monthlyFee) || 0;

  if (totalRooms) hostel.totalRooms = parseInt(totalRooms);
  if (bedsPerRoom) hostel.bedsPerRoom = parseInt(bedsPerRoom);

  if (totalRooms || bedsPerRoom) {
    hostel.capacity = hostel.totalRooms * hostel.bedsPerRoom;

    if (hostel.occupancy > hostel.capacity) {
      return sendError(
        res,
        400,
        "New capacity cannot be less than current occupancy"
      );
    }
  }

  await hostel.save();

  return sendSuccess(res, 200, "Hostel updated", hostel);
});

// DELETE /api/hostels/:id
export const deleteHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center);

  const activeAllocations = await HostelAllocation.countDocuments({
    hostel: hostel._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (activeAllocations > 0 || hostel.occupancy > 0) {
    return sendError(
      res,
      400,
      `Cannot delete hostel with ${activeAllocations || hostel.occupancy} students assigned. Deallocate them first.`
    );
  }

  hostel.deleted = true;
  await hostel.save();

  return sendSuccess(res, 200, "Hostel deleted");
});

// POST /api/hostels/:id/allocate
// Body: { studentId, roomNumber, bedNumber, joiningDate, monthlyFee, remarks }
export const allocateStudent = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center);

  const {
    studentId,
    roomNumber,
    bedNumber,
    joiningDate,
    monthlyFee,
    remarks,
  } = req.body;

  if (!studentId || !roomNumber || !bedNumber) {
    return sendError(
      res,
      400,
      "studentId, roomNumber and bedNumber are required"
    );
  }

  const student = await Student.findOne({
    _id: studentId,
    deleted: false,
  });

  if (!student) return sendError(res, 404, "Student not found");

  ensureCenterScope(req, student.center);

  if (student.center.toString() !== hostel.center.toString()) {
    return sendError(
      res,
      400,
      "Student and hostel must belong to the same center"
    );
  }

  if (!student.facilities?.hostel) {
    return sendError(
      res,
      400,
      "This student has not selected hostel facility during admission"
    );
  }

  if (student.hostel) {
    return sendError(
      res,
      400,
      "Student is already allocated to a hostel. Deallocate first."
    );
  }

  if (hostel.occupancy >= hostel.capacity) {
    return sendError(res, 400, "Hostel is at full capacity");
  }

  const activeStudentAllocation = await HostelAllocation.findOne({
    student: student._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (activeStudentAllocation) {
    return sendError(
      res,
      400,
      "Student already has an active hostel allocation"
    );
  }

  const occupiedBed = await HostelAllocation.findOne({
    hostel: hostel._id,
    roomNumber: roomNumber.trim(),
    bedNumber: bedNumber.trim(),
    status: "ACTIVE",
    deleted: false,
  });

  if (occupiedBed) {
    return sendError(res, 400, "This room and bed is already occupied");
  }

  const allocation = await HostelAllocation.create({
    center: hostel.center,
    hostel: hostel._id,
    student: student._id,
    roomNumber: roomNumber.trim(),
    bedNumber: bedNumber.trim(),
    joiningDate: joiningDate || Date.now(),
    monthlyFee:
      monthlyFee !== undefined && monthlyFee !== ""
        ? Number(monthlyFee)
        : hostel.monthlyFee || 0,
    remarks,
    status: "ACTIVE",
  });

  student.hostel = hostel._id;
  hostel.occupancy += 1;

  await Promise.all([student.save(), hostel.save()]);

  const populatedAllocation = await HostelAllocation.findById(allocation._id)
    .populate("hostel", "name type")
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    );

  return sendSuccess(
    res,
    200,
    "Student allocated to hostel",
    populatedAllocation
  );
});

// POST /api/hostels/:id/deallocate
// Body: { studentId, remarks }
export const deallocateStudent = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center);

  const { studentId, remarks } = req.body;

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  const student = await Student.findOne({
    _id: studentId,
    deleted: false,
  });

  if (!student) return sendError(res, 404, "Student not found");

  ensureCenterScope(req, student.center);

  if (!student.hostel || student.hostel.toString() !== hostel._id.toString()) {
    return sendError(res, 400, "Student is not allocated to this hostel");
  }

  const allocation = await HostelAllocation.findOne({
    hostel: hostel._id,
    student: student._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (!allocation) {
    return sendError(res, 404, "Active hostel allocation not found");
  }

  allocation.status = "LEFT";
  allocation.leftDate = new Date();
  if (remarks) allocation.remarks = remarks;

  student.hostel = null;
  hostel.occupancy = Math.max(0, hostel.occupancy - 1);

  await Promise.all([allocation.save(), student.save(), hostel.save()]);

  return sendSuccess(res, 200, "Student deallocated from hostel", {
    student,
    hostel,
    allocation,
  });
});

// GET /api/hostels/:id/students
export const getHostelStudents = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!hostel) return sendError(res, 404, "Hostel not found");

  ensureCenterScope(req, hostel.center);

  const allocations = await HostelAllocation.find({
    hostel: hostel._id,
    status: "ACTIVE",
    deleted: false,
  })
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    )
    .sort("roomNumber bedNumber");

  return sendSuccess(res, 200, "Hostel students fetched", allocations);
});