import express from 'express';
import {
  createTank,
  deleteTank,
  getTanks,
  updateTank,
} from '../controllers/tankController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumpOperator'), getTanks);
router.post('/', protect, authorize('admin'), createTank);
router.patch('/:id', protect, authorize('admin'), updateTank);
router.delete('/:id', protect, authorize('admin'), deleteTank);

export default router;
