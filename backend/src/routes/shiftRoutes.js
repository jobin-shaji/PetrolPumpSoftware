import express from 'express';
import {
  endShift,
  getShifts,
  startShift,
} from '../controllers/shiftController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumpOperator'), getShifts);
router.post('/start', protect, authorize('admin', 'manager', 'pumpOperator'), startShift);
router.post('/:id/end', protect, authorize('admin', 'manager', 'pumpOperator'), endShift);

export default router;
