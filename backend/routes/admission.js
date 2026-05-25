import express from "express";
import multer from "multer";
import { protect, authorizeRoles } from "../middleware/auth.js";

import {
  getMeritList,
  getMeritListById,
  uploadMeritList,
  setCutoff,
  deleteMeritList,
  getNextRSC,
  admitStudent,
} from "../controllers/admission.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.use(protect);

// Merit list routes
router.get(
  "/merit-list",
  authorizeRoles("SUPER_ADMIN", "CENTER_ADMIN"),
  getMeritList
);

router.get(
  "/merit-list/:id",
  authorizeRoles("SUPER_ADMIN", "CENTER_ADMIN"),
  getMeritListById
);

router.post(
  "/merit-list",
  authorizeRoles("SUPER_ADMIN"),
  upload.single("file"),
  uploadMeritList
);

router.put(
  "/merit-list/:id/cutoff",
  authorizeRoles("SUPER_ADMIN"),
  setCutoff
);

router.delete(
  "/merit-list/:id",
  authorizeRoles("SUPER_ADMIN"),
  deleteMeritList
);

// RSC preview
router.get(
  "/next-rsc",
  authorizeRoles("SUPER_ADMIN", "CENTER_ADMIN"),
  getNextRSC
);

// Student admission
router.post(
  "/admit",
  authorizeRoles("CENTER_ADMIN"),
  admitStudent
);

export default router;