import { Router } from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import {
  getCenters,
  getCenterById,
  createCenter,
  updateCenter,
  deleteCenter,
} from '../controllers/center.js';

const router = Router();

router.use(protect); // all center routes require auth

router.get('/', getCenters);
router.get('/:id', getCenterById);

// Super admin only mutations
router.post('/', authorizeRoles('SUPER_ADMIN'), createCenter);
router.put('/:id', authorizeRoles('SUPER_ADMIN'), updateCenter);
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), deleteCenter);

export default router;