import express from 'express';
import {
  createUnit,
  deleteUnit,
  getUnits,
  updateUnit,
} from '../controllers/unitController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumper'), getUnits);
router.post('/', protect, authorize('admin'), createUnit);
router.patch('/:id', protect, authorize('admin'), updateUnit);
router.delete('/:id', protect, authorize('admin'), deleteUnit);

export default router;
