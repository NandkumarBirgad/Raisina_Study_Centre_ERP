import { Router } from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  getCenterAdmins,
  resetCenterAdminPassword,
} from "../controllers/auth.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Public route
router.post("/login", login);

// Protected routes
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

// Only SUPER_ADMIN can create users
router.post("/register", protect, authorize("SUPER_ADMIN"), register);

// Only SUPER_ADMIN can view and reset center admin accounts
router.get(
  "/center-admins",
  protect,
  authorize("SUPER_ADMIN"),
  getCenterAdmins
);

router.patch(
  "/center-admins/:id/reset-password",
  protect,
  authorize("SUPER_ADMIN"),
  resetCenterAdminPassword
);

export default router;