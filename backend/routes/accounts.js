import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import {
  collectStudentFee,
  getStudentFees,
  addDonation,
  getDonations,
  addExpense,
  getExpenses,
  getLedger,
  getTransactionById,
  getMonthlyDepositSheet,
  getMonthlyExpenditureSheet,
} from "../controllers/accounts.js";

const router = express.Router();

router.use(protect);

// Student fees / receipts
router.post("/student-fees", authorizeRoles("CENTER_ADMIN"), collectStudentFee);
router.get("/student-fees", getStudentFees);

// Donations / deposits
router.post("/donations", authorizeRoles("CENTER_ADMIN"), addDonation);
router.get("/donations", getDonations);

// Expenses
router.post("/expenses", authorizeRoles("CENTER_ADMIN"), addExpense);
router.get("/expenses", getExpenses);

// Monthly sheets
router.get("/reports/deposit-sheet", getMonthlyDepositSheet);
router.get("/reports/expenditure-sheet", getMonthlyExpenditureSheet);

// General ledger
router.get("/ledger", getLedger);
router.get("/transactions/:id", getTransactionById);

export default router;