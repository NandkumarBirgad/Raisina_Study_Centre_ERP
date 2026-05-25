import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  downloadReceipt,
  deleteReceipt,
} from "../controllers/receipt.js";

const router = Router();

router.use(protect);

router.get("/", getReceipts);
router.post("/", authorize("SUPER_ADMIN", "CENTER_ADMIN"), createReceipt);

router.get("/:id", getReceiptById);
router.get("/:id/download", downloadReceipt);

router.delete("/:id", authorize("SUPER_ADMIN", "CENTER_ADMIN"), deleteReceipt);

export default router;