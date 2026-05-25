import { Router } from "express";

import { protect, authorizeRoles } from "../middleware/auth.js";

import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/student.js";

const router = Router();

router.use(protect);

// Read students
router.get("/", getStudents);
router.get("/:id", getStudentById);

// CENTER_ADMIN can create, update, and delete students
router.post("/", authorizeRoles("CENTER_ADMIN"), createStudent);
router.put("/:id", authorizeRoles("CENTER_ADMIN"), updateStudent);
router.delete("/:id", authorizeRoles("CENTER_ADMIN"), deleteStudent);

export default router;