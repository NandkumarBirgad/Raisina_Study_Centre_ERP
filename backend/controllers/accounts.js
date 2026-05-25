import asyncHandler from "express-async-handler";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope } from "../utils/accessControl.js";
import Transaction from "../models/Transaction.js";
import Student from "../models/Student.js";

const MONTHS = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buildCenterFilter = (req, overrideCenterId = null) => {
  const centerId = resolveCenterScope(req, overrideCenterId);
  return centerId ? { center: centerId } : {};
};

const getCenterIdForWrite = (req, overrideCenterId = null) => {
  return resolveCenterScope(req, overrideCenterId);
};

const getYearRange = (year) => {
  const selectedYear = Number(year) || new Date().getFullYear();

  return {
    selectedYear,
    start: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
    end: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
  };
};

const validateAmount = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? value : null;
};

// ─── STUDENT FEES / RECEIPTS ──────────────────────────────

export const collectStudentFee = asyncHandler(async (req, res) => {
  const {
    centerId,
    studentId,
    amount,
    category = "ADMISSION_FEE",
    date,
    paymentMode = "CASH",
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  const allowedCategories = [
    "ADMISSION_FEE",
    "STUDENT_FEES",
    "HOSTEL_FEE",
    "MESS_FEE",
    "LIBRARY_FEE",
    "OTHER_FEE",
  ];

  if (!allowedCategories.includes(category)) {
    return sendError(res, 400, "Invalid student fee category");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const student = await Student.findOne({
    _id: studentId,
    center: finalCenterId,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  const txnDate = date ? new Date(date) : new Date();

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "CREDIT",
    source: "STUDENT_FEE",
    category,
    amount: finalAmount,
    date: txnDate,
    student: student._id,
    month: txnDate.toISOString().slice(0, 7),
    paymentMode,
    notes,
  });

  const populatedTxn = await Transaction.findById(txn._id)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber");

  return sendSuccess(res, 201, "Student fee collected", populatedTxn);
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const { from, to, category, studentId, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: "STUDENT_FEE",
    deleted: false,
  };

  if (category) filter.category = category;
  if (studentId) filter.student = studentId;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const fees = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber")
    .sort({ date: -1 });

  const totalAmount = fees.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Student fees fetched", {
    fees,
    totalAmount,
  });
});

// ─── DONATIONS / DEPOSITS ─────────────────────────────────

export const addDonation = asyncHandler(async (req, res) => {
  const {
    centerId,
    donorName,
    donorDesignation,
    amount,
    date,
    category = "EXTERNAL_DONATION",
    paymentMode = "CASH",
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  const allowedCategories = [
    "EXTERNAL_DONATION",
    "GRANT",
    "OFFICER",
    "SOBTI",
    "ALUMNI",
    "AMERICA",
    "OTHER",
  ];

  if (!allowedCategories.includes(category)) {
    return sendError(res, 400, "Invalid category for donation/deposit");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "CREDIT",
    source: category === "GRANT" ? "OTHER_INCOME" : "EXTERNAL_DONATION",
    category,
    amount: finalAmount,
    date: date || new Date(),
    donorName,
    donorDesignation,
    paymentMode,
    notes,
  });

  return sendSuccess(res, 201, "Donation/deposit recorded", txn);
});

export const getDonations = asyncHandler(async (req, res) => {
  const { from, to, category, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: { $in: ["EXTERNAL_DONATION", "OTHER_INCOME"] },
    deleted: false,
  };

  if (category) filter.category = category;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const donations = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .sort({ date: -1 });

  const totalAmount = donations.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Donations/deposits fetched", {
    donations,
    totalAmount,
  });
});

// ─── EXPENSES ─────────────────────────────────────────────

export const addExpense = asyncHandler(async (req, res) => {
  const {
    centerId,
    amount,
    category,
    date,
    paymentMode = "CASH",
    paidTo,
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  const expenseCategories = [
    "NEWSPAPER",
    "MAINTENANCE",
    "RAISINA",
    "RENT",
    "LIGHT_BILL",
    "OFFICE_BOY",
    "UTILITIES",
    "SALARIES",
    "MESS_SUPPLIES",
    "OTHER",
  ];

  if (!expenseCategories.includes(category)) {
    return sendError(res, 400, "Invalid expense category");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "DEBIT",
    source: "EXPENSE",
    category,
    amount: finalAmount,
    date: date || new Date(),
    paymentMode,
    paidTo,
    notes,
  });

  return sendSuccess(res, 201, "Expense recorded", txn);
});

export const getExpenses = asyncHandler(async (req, res) => {
  const { from, to, category, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: "EXPENSE",
    deleted: false,
  };

  if (category) filter.category = category;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const expenses = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .sort({ date: -1 });

  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Expenses fetched", {
    expenses,
    totalAmount,
  });
});

// ─── GENERAL LEDGER ───────────────────────────────────────

export const getLedger = asyncHandler(async (req, res) => {
  const { from, to, type, source, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    deleted: false,
  };

  if (type) filter.type = type;
  if (source) filter.source = source;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber")
    .sort({ date: -1 });

  const totalCredits = transactions
    .filter((item) => item.type === "CREDIT")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalDebits = transactions
    .filter((item) => item.type === "DEBIT")
    .reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Ledger fetched", {
    transactions,
    summary: {
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
    },
  });
});

export const getTransactionById = asyncHandler(async (req, res) => {
  const txn = await Transaction.findOne({
    _id: req.params.id,
    ...buildCenterFilter(req),
    deleted: false,
  })
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber");

  if (!txn) {
    return sendError(res, 404, "Transaction not found");
  }

  return sendSuccess(res, 200, "Transaction fetched", txn);
});

// ─── MONTHLY REPORTS ──────────────────────────────────────

export const getMonthlyDepositSheet = asyncHandler(async (req, res) => {
  const { year, centerId } = req.query;
  const { selectedYear, start, end } = getYearRange(year);

  const transactions = await Transaction.find({
    ...buildCenterFilter(req, centerId),
    type: "CREDIT",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const rows = MONTHS.map((month) => ({
    month,
    officer: 0,
    sobti: 0,
    alumni: 0,
    studentFees: 0,
    america: 0,
    other: 0,
    total: 0,
  }));

  transactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    if (txn.source === "STUDENT_FEE") {
      rows[index].studentFees += amount;
    } else if (txn.category === "OFFICER") {
      rows[index].officer += amount;
    } else if (txn.category === "SOBTI") {
      rows[index].sobti += amount;
    } else if (txn.category === "ALUMNI") {
      rows[index].alumni += amount;
    } else if (txn.category === "AMERICA") {
      rows[index].america += amount;
    } else {
      rows[index].other += amount;
    }

    rows[index].total += amount;
  });

  const totals = rows.reduce(
    (sum, row) => ({
      officer: sum.officer + row.officer,
      sobti: sum.sobti + row.sobti,
      alumni: sum.alumni + row.alumni,
      studentFees: sum.studentFees + row.studentFees,
      america: sum.america + row.america,
      other: sum.other + row.other,
      total: sum.total + row.total,
    }),
    {
      officer: 0,
      sobti: 0,
      alumni: 0,
      studentFees: 0,
      america: 0,
      other: 0,
      total: 0,
    }
  );

  return sendSuccess(res, 200, "Monthly deposit sheet fetched", {
    year: selectedYear,
    rows,
    totals,
  });
});

export const getMonthlyExpenditureSheet = asyncHandler(async (req, res) => {
  const { year, centerId } = req.query;
  const { selectedYear, start, end } = getYearRange(year);

  const transactions = await Transaction.find({
    ...buildCenterFilter(req, centerId),
    type: "DEBIT",
    source: "EXPENSE",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const rows = MONTHS.map((month) => ({
    month,
    newspaper: 0,
    maintenance: 0,
    raisina: 0,
    rent: 0,
    lightBill: 0,
    officeBoy: 0,
    other: 0,
    total: 0,
    remark: "",
  }));

  transactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    if (txn.category === "NEWSPAPER") {
      rows[index].newspaper += amount;
    } else if (txn.category === "MAINTENANCE") {
      rows[index].maintenance += amount;
    } else if (txn.category === "RAISINA") {
      rows[index].raisina += amount;
    } else if (txn.category === "RENT") {
      rows[index].rent += amount;
    } else if (txn.category === "LIGHT_BILL") {
      rows[index].lightBill += amount;
    } else if (txn.category === "OFFICE_BOY") {
      rows[index].officeBoy += amount;
    } else {
      rows[index].other += amount;
    }

    rows[index].total += amount;
  });

  const totals = rows.reduce(
    (sum, row) => ({
      newspaper: sum.newspaper + row.newspaper,
      maintenance: sum.maintenance + row.maintenance,
      raisina: sum.raisina + row.raisina,
      rent: sum.rent + row.rent,
      lightBill: sum.lightBill + row.lightBill,
      officeBoy: sum.officeBoy + row.officeBoy,
      other: sum.other + row.other,
      total: sum.total + row.total,
    }),
    {
      newspaper: 0,
      maintenance: 0,
      raisina: 0,
      rent: 0,
      lightBill: 0,
      officeBoy: 0,
      other: 0,
      total: 0,
    }
  );

  return sendSuccess(res, 200, "Monthly expenditure sheet fetched", {
    year: selectedYear,
    rows,
    totals,
  });
});