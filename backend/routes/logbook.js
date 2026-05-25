import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import {
  upsertLogbookEntry,
  getLogbookByMonth,
  getLogbookByStudent,
  markLogbookPaid,
} from '../controllers/logbook.js';

const router = express.Router();

router.use(protect, authorizeRoles('CENTER_ADMIN', 'SUPER_ADMIN'));

router.post('/entry', authorizeRoles('CENTER_ADMIN'), upsertLogbookEntry);
router.get('/month/:month', getLogbookByMonth);           // month = 'YYYY-MM'
router.get('/student/:studentId', getLogbookByStudent);
router.put('/pay/:id', authorizeRoles('CENTER_ADMIN'), markLogbookPaid);

export default router;