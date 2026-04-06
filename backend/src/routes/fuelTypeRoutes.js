import express from 'express';
import {
  createFuelType,
  deleteFuelType,
  getFuelTypes,
  updateFuelType,
} from '../controllers/fuelTypeController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumpOperator'), getFuelTypes);
router.post('/', protect, authorize('admin'), createFuelType);
router.patch('/:id', protect, authorize('admin'), updateFuelType);
router.delete('/:id', protect, authorize('admin'), deleteFuelType);

export default router;
