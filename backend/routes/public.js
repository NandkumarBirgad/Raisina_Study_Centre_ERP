import express from "express";
import {
  getPublicCenters,
  registerCandidate,
} from "../controllers/examRegistration.js";

const router = express.Router();

router.get("/centers", getPublicCenters);
router.post("/exam-register", registerCandidate);

export default router;