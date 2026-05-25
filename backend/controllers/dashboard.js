import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { sendSuccess } from "../utils/responseHandler.js";

import Student from "../models/Student.js";
import Hostel from "../models/Hostel.js";
import Mess from "../models/Mess.js";
import Transaction from "../models/Transaction.js";
import LibraryIssue from "../models/LibraryIssue.js";
import Center from "../models/Center.js";

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

const collectionExists = async (collectionName) => {
  const collections = await mongoose.connection.db
    .listCollections({ name: collectionName })
    .toArray();

  return collections.length > 0;
};

const safeCount = async (collectionNames, query = {}) => {
  for (const collectionName of collectionNames) {
    const exists = await collectionExists(collectionName);

    if (exists) {
      return mongoose.connection.db
        .collection(collectionName)
        .countDocuments(query);
    }
  }

  return 0;
};

const getCenterIdFromReq = (req) => {
  return req.user?.center?._id || req.user?.center || req.user?.centerId || null;
};

const getYearRange = (year) => {
  const selectedYear = Number(year) || new Date().getFullYear();

  return {
    selectedYear,
    start: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
    end: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
  };
};

const buildExamRegistrationFilter = (centerId = null, extraQuery = {}) => {
  const conditions = [{ deleted: false }];

  if (Object.keys(extraQuery).length > 0) {
    conditions.push(extraQuery);
  }

  if (centerId) {
    conditions.push({
      $or: [
        { preferredExamCenter: centerId },
        { preferredAdmissionCenter: centerId },
        { preferredCenter: centerId },
      ],
    });
  }

  return { $and: conditions };
};

const getTransactionTotal = async (match = {}) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        deleted: false,
        ...match,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return result[0]?.total || 0;
};

const formatRecentTransactions = (transactions = []) => {
  return transactions.map((transaction) => ({
    title: transaction.receiptNumber
      ? `Receipt ${transaction.receiptNumber} generated`
      : `${transaction.type || "Transaction"} recorded`,
    message: `${transaction.source || "ERP"} - ₹${transaction.amount || 0}`,
    date: transaction.date,
  }));
};

const buildPendingActions = ({
  pendingExamRegistrations,
  pendingAdmissions,
  pendingDues,
  pendingFacilityAllocations,
  overdueBooks,
}) => {
  return [
    {
      title: "Review exam registrations",
      description: "Exam applications waiting for review",
      count: pendingExamRegistrations,
    },
    {
      title: "Complete pending admissions",
      description: "Admissions not yet confirmed",
      count: pendingAdmissions,
    },
    {
      title: "Collect pending fees",
      description: "Outstanding student fee amount",
      count: pendingDues,
      type: "currency",
    },
    {
      title: "Allocate facilities",
      description: "Hostel, mess or library allocation pending",
      count: pendingFacilityAllocations,
    },
    {
      title: "Review overdue library books",
      description: "Books that are not returned on time",
      count: overdueBooks,
    },
  ].filter((item) => Number(item.count) > 0);
};

const buildMonthlyDepositSheet = async (centerFilter, year) => {
  const { selectedYear, start, end } = getYearRange(year);

  const transactions = await Transaction.find({
    ...centerFilter,
    type: "CREDIT",
    deleted: false,
    date: { $gte: start, $lte: end },
  }).lean();

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

  return {
    year: selectedYear,
    rows,
    totals,
  };
};

const buildMonthlyExpenditureSheet = async (centerFilter, year) => {
  const { selectedYear, start, end } = getYearRange(year);

  const transactions = await Transaction.find({
    ...centerFilter,
    type: "DEBIT",
    source: "EXPENSE",
    deleted: false,
    date: { $gte: start, $lte: end },
  }).lean();

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

  return {
    year: selectedYear,
    rows,
    totals,
  };
};

const buildAdmissionFacilityReport = async (centerFilter) => {
  const students = await Student.find({
    ...centerFilter,
    deleted: false,
  })
    .populate("center", "centerName centerCode city")
    .populate("hostel", "name type")
    .populate("mess", "messName")
    .sort({ admissionDate: -1, createdAt: -1 })
    .lean();

  const studentIds = students.map((student) => student._id);

  const feeTransactions = await Transaction.find({
    ...centerFilter,
    source: "STUDENT_FEE",
    student: { $in: studentIds },
    deleted: false,
  })
    .sort({ date: -1 })
    .select("student receiptNumber category amount date")
    .lean();

  const receiptByStudent = {};

  feeTransactions.forEach((txn) => {
    const studentId = txn.student?.toString();

    if (!studentId) return;

    if (!receiptByStudent[studentId]) {
      receiptByStudent[studentId] = txn;
      return;
    }

    if (
      txn.category === "ADMISSION_FEE" &&
      receiptByStudent[studentId].category !== "ADMISSION_FEE"
    ) {
      receiptByStudent[studentId] = txn;
    }
  });

  return students.map((student) => {
    const receipt = receiptByStudent[student._id.toString()];

    return {
      rscNumber: student.rscNumber || "",
      studentName: student.studentName || "",
      mobileNumber: student.mobileNumber || "",
      admissionDate: student.admissionDate || student.createdAt || null,
      receiptNumber: receipt?.receiptNumber || "",
      receiptAmount: receipt?.amount || 0,
      studentType: student.studentType || "",
      centerName: student.center?.centerName || "",
      hostelRequested: Boolean(student.facilities?.hostel),
      messRequested: Boolean(student.facilities?.mess),
      libraryRequested: Boolean(student.facilities?.library),
      hostelAllocated: Boolean(student.hostel),
      hostelName: student.hostel?.name || "",
      messAllocated: Boolean(student.mess),
      messName: student.mess?.messName || "",
      studySpaceAssigned: Boolean(student.libraryProfile?.isAssigned),
      libraryStatus: student.libraryProfile?.status || "INACTIVE",
    };
  });
};

const buildDashboardData = async (centerId = null, year = null) => {
  const now = new Date();

  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const centerFilter = centerId ? { center: centerId } : {};

  const examFilter = (extraQuery = {}) =>
    buildExamRegistrationFilter(centerId, extraQuery);

  const [
    totalStudents,
    scholarshipCount,
    nonScholarshipCount,
    examRegistrations,
    meritListed,
    pendingExamRegistrations,
    confirmedAdmissionsFromAdmissionCollection,
    pendingAdmissions,
    hostels,
    activeMess,
    monthlyCollections,
    totalFeeCollection,
    totalExpenses,
    recentTransactions,
    overdueBooks,
    hostelRequestedStudents,
    messRequestedStudents,
    libraryRequestedStudents,
    hostelStudents,
    messStudents,
    libraryMembers,
    admissionFacilityReport,
    monthlyDepositSheet,
    monthlyExpenditureSheet,
  ] = await Promise.all([
    Student.countDocuments({
      ...centerFilter,
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      studentType: "SCHOLARSHIP",
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      studentType: "NON_SCHOLARSHIP",
      deleted: false,
    }),

    safeCount(["examregistrations", "publicexamregistrations"], examFilter()),

    safeCount(
      ["examregistrations", "publicexamregistrations"],
      examFilter({
        $or: [{ meritStatus: "MERIT_LISTED" }, { status: "MERIT_LISTED" }],
      })
    ),

    safeCount(
      ["examregistrations", "publicexamregistrations"],
      examFilter({
        $or: [{ status: "PENDING" }, { status: "REGISTERED" }],
      })
    ),

    safeCount(["admissions"], {
      ...centerFilter,
      status: "CONFIRMED",
      deleted: false,
    }),

    safeCount(["admissions"], {
      ...centerFilter,
      status: "PENDING",
      deleted: false,
    }),

    Hostel.find({
      ...centerFilter,
      deleted: false,
    }).select("name type capacity occupancy"),

    Mess.findOne({
      ...centerFilter,
      status: "ACTIVE",
      deleted: false,
    }).select("messName monthlyFee capacity"),

    Transaction.aggregate([
      {
        $match: {
          ...centerFilter,
          type: "CREDIT",
          date: { $gte: monthStart, $lte: monthEnd },
          deleted: false,
        },
      },
      {
        $group: {
          _id: "$source",
          total: { $sum: "$amount" },
        },
      },
    ]),

    Transaction.aggregate([
      {
        $match: {
          ...centerFilter,
          type: "CREDIT",
          deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),

    Transaction.aggregate([
      {
        $match: {
          ...centerFilter,
          type: "DEBIT",
          deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),

    Transaction.find({
      ...centerFilter,
      deleted: false,
    })
      .sort({ date: -1 })
      .limit(10)
      .select("type source category amount date receiptNumber"),

    LibraryIssue.countDocuments({
      ...centerFilter,
      status: "OVERDUE",
    }),

    Student.countDocuments({
      ...centerFilter,
      "facilities.hostel": true,
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      "facilities.mess": true,
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      "facilities.library": true,
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      hostel: { $ne: null },
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      mess: { $ne: null },
      deleted: false,
    }),

    Student.countDocuments({
      ...centerFilter,
      "libraryProfile.isAssigned": true,
      deleted: false,
    }),

    buildAdmissionFacilityReport(centerFilter),

    buildMonthlyDepositSheet(centerFilter, year),

    buildMonthlyExpenditureSheet(centerFilter, year),
  ]);

  const hostelSummary = hostels.map((hostel) => ({
    name: hostel.name,
    type: hostel.type,
    capacity: hostel.capacity || 0,
    occupancy: hostel.occupancy || 0,
    available: Math.max((hostel.capacity || 0) - (hostel.occupancy || 0), 0),
  }));

  const collectionsBySource = {};

  monthlyCollections.forEach((record) => {
    collectionsBySource[record._id || "OTHER"] = record.total || 0;
  });

  const totalCollectionAmount = totalFeeCollection[0]?.total || 0;
  const totalExpenseAmount = totalExpenses[0]?.total || 0;

  const admissionsCompleted =
    confirmedAdmissionsFromAdmissionCollection > 0
      ? confirmedAdmissionsFromAdmissionCollection
      : totalStudents;

  const actualPendingExamRegistrations =
    pendingExamRegistrations > 0
      ? pendingExamRegistrations
      : Math.max(examRegistrations - meritListed, 0);

  const pendingFacilityAllocations =
    Math.max(hostelRequestedStudents - hostelStudents, 0) +
    Math.max(messRequestedStudents - messStudents, 0) +
    Math.max(libraryRequestedStudents - libraryMembers, 0);

  const recentActivity = formatRecentTransactions(recentTransactions);

  const pendingActions = buildPendingActions({
    pendingExamRegistrations: actualPendingExamRegistrations,
    pendingAdmissions,
    pendingDues: 0,
    pendingFacilityAllocations,
    overdueBooks,
  });

  return {
    totalStudents,
    examRegistrations,
    meritListed,
    admissionsCompleted,
    pendingAdmissions,

    totalFeeCollection: totalCollectionAmount,
    totalExpenses: totalExpenseAmount,
    netBalance: totalCollectionAmount - totalExpenseAmount,

    pendingDues: 0,

    hostelStudents,
    messStudents,
    libraryMembers,

    hostelRequestedStudents,
    messRequestedStudents,
    libraryRequestedStudents,

    pendingExamRegistrations: actualPendingExamRegistrations,
    pendingFacilityAllocations,
    pendingActions,
    recentActivity,

    currentMonth: monthStr,

    students: {
      total: totalStudents,
      scholarship: scholarshipCount,
      nonScholarship: nonScholarshipCount,
    },

    facilities: {
      hostelRequested: hostelRequestedStudents,
      hostelAllocated: hostelStudents,
      messRequested: messRequestedStudents,
      messAllocated: messStudents,
      libraryRequested: libraryRequestedStudents,
      libraryAssigned: libraryMembers,
    },

    accountsSummary: {
      totalIncome: totalCollectionAmount,
      totalExpenses: totalExpenseAmount,
      netBalance: totalCollectionAmount - totalExpenseAmount,
    },

    reports: {
      admissionFacilityReport,
      monthlyDepositSheet,
      monthlyExpenditureSheet,
    },

    hostels: hostelSummary,
    mess: activeMess,
    monthlyCollections: collectionsBySource,
    overdueBooks,
  };
};

export const getDashboard = asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const year = req.query.year;

  if (role === "SUPER_ADMIN") {
    const data = await buildDashboardData(null, year);
    return sendSuccess(res, 200, "Dashboard data fetched successfully", data);
  }

  const centerId = getCenterIdFromReq(req);

  const data = await buildDashboardData(centerId, year);
  return sendSuccess(res, 200, "Dashboard data fetched successfully", data);
});

export const getCenterDashboard = asyncHandler(async (req, res) => {
  const centerId = getCenterIdFromReq(req);
  const year = req.query.year;

  const data = await buildDashboardData(centerId, year);

  return sendSuccess(res, 200, "Center dashboard fetched successfully", data);
});

export const getSuperDashboard = asyncHandler(async (req, res) => {
  const year = req.query.year;
  const dashboardData = await buildDashboardData(null, year);

  const now = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const centers = await Center.find({ deleted: false })
    .select("centerName city state centerCode status")
    .sort({ centerName: 1 });

  const [
    totalCenters,
    activeCenters,
    totalStudents,
    scholarshipStudents,
    nonScholarshipStudents,
    examRegistrations,
    meritListed,
    admittedRegistrations,
    cancelledRegistrations,
    totalFeeCollected,
    monthlyCollection,
    donationsReceived,
    totalExpenses,
  ] = await Promise.all([
    Center.countDocuments({ deleted: false }),

    // Safe active center count:
    // if your Center model has no status field, all non-deleted centers are active.
    Center.countDocuments({ deleted: false }),

    Student.countDocuments({ deleted: false }),

    Student.countDocuments({
      studentType: "SCHOLARSHIP",
      deleted: false,
    }),

    Student.countDocuments({
      studentType: "NON_SCHOLARSHIP",
      deleted: false,
    }),

    safeCount(["examregistrations", "publicexamregistrations"], {
      deleted: false,
    }),

    safeCount(["examregistrations", "publicexamregistrations"], {
      status: "MERIT_LISTED",
      deleted: false,
    }),

    safeCount(["examregistrations", "publicexamregistrations"], {
      status: "ADMITTED",
      deleted: false,
    }),

    safeCount(["examregistrations", "publicexamregistrations"], {
      status: "CANCELLED",
      deleted: false,
    }),

    getTransactionTotal({
      type: "CREDIT",
      source: "STUDENT_FEE",
    }),

    getTransactionTotal({
      type: "CREDIT",
      date: { $gte: monthStart, $lte: monthEnd },
    }),

    getTransactionTotal({
      type: "CREDIT",
      source: "EXTERNAL_DONATION",
    }),

    getTransactionTotal({
      type: "DEBIT",
      source: "EXPENSE",
    }),
  ]);

  const centerWiseSummary = await Promise.all(
    centers.map(async (center) => {
      const centerId = center._id;

      const centerExamFilter = (extraQuery = {}) =>
        buildExamRegistrationFilter(centerId, extraQuery);

      const [
        students,
        scholarship,
        nonScholarship,
        registrations,
        meritListedCount,
        admittedCount,
        feeCollected,
        donations,
        expenses,
      ] = await Promise.all([
        Student.countDocuments({
          center: centerId,
          deleted: false,
        }),

        Student.countDocuments({
          center: centerId,
          studentType: "SCHOLARSHIP",
          deleted: false,
        }),

        Student.countDocuments({
          center: centerId,
          studentType: "NON_SCHOLARSHIP",
          deleted: false,
        }),

        safeCount(
          ["examregistrations", "publicexamregistrations"],
          centerExamFilter()
        ),

        safeCount(
          ["examregistrations", "publicexamregistrations"],
          centerExamFilter({
            status: "MERIT_LISTED",
          })
        ),

        safeCount(
          ["examregistrations", "publicexamregistrations"],
          buildExamRegistrationFilter(null, {
            status: "ADMITTED",
            $or: [
              { preferredAdmissionCenter: centerId },
              { preferredCenter: centerId },
            ],
          })
        ),

        getTransactionTotal({
          center: centerId,
          type: "CREDIT",
          source: "STUDENT_FEE",
        }),

        getTransactionTotal({
          center: centerId,
          type: "CREDIT",
          source: "EXTERNAL_DONATION",
        }),

        getTransactionTotal({
          center: centerId,
          type: "DEBIT",
          source: "EXPENSE",
        }),
      ]);

      const admissionConversion =
        registrations > 0 ? Math.round((admittedCount / registrations) * 100) : 0;

      return {
        centerId,
        centerName: center.centerName,
        centerCode: center.centerCode,
        city: center.city || "",
        state: center.state || "",
        status: center.status || "ACTIVE",

        students,
        scholarshipStudents: scholarship,
        nonScholarshipStudents: nonScholarship,

        registrations,
        meritListed: meritListedCount,
        admitted: admittedCount,
        admissionConversion,

        feeCollected,
        donationsReceived: donations,
        expenses,
        netBalance: feeCollected + donations - expenses,

        pendingFees: 0,
      };
    })
  );

  const pendingFees = 0;
  const netBalance = totalFeeCollected + donationsReceived - totalExpenses;

  return sendSuccess(res, 200, "Super admin dashboard fetched successfully", {
    ...dashboardData,

    totalCenters,
    activeCenters,

    totalStudents,
    scholarshipStudents,
    nonScholarshipStudents,

    examRegistrations,
    meritListed,
    admittedRegistrations,
    cancelledRegistrations,

    totalFeeCollected,
    pendingFees,
    pendingFeesAvailable: false,

    monthlyCollection,
    donationsReceived,
    totalExpenses,
    netBalance,

    academicSnapshot: {
      examRegistrations,
      meritListed,
      scholarshipStudents,
      nonScholarshipStudents,
      admittedRegistrations,
      cancelledRegistrations,
    },

    financialSnapshot: {
      monthlyCollection,
      totalFeeCollected,
      pendingFees,
      donationsReceived,
      totalExpenses,
      netBalance,
    },

    centerWiseSummary,
  });
});