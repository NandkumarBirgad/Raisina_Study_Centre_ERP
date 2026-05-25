import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import {
  getDashboard,
  getCenterDashboard,
  getSuperDashboard,
} from '../controllers/dashboard.js';

const router = express.Router();

router.use(protect);

// Main route used by frontend: GET /api/dashboard
router.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'CENTER_ADMIN'),
  getDashboard
);

// Optional separate routes if you want to use them later
router.get(
  '/center',
  authorizeRoles('CENTER_ADMIN'),
  getCenterDashboard
);

router.get(
  '/super',
  authorizeRoles('SUPER_ADMIN'),
  getSuperDashboard
);

export default router;