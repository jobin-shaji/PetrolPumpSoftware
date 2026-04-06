import express from 'express';
import {
  endShift,
  getShifts,
  startShift,
} from '../controllers/shiftController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumper'), getShifts);
router.post('/start', protect, authorize('admin', 'manager', 'pumper'), startShift);
router.post('/:id/end', protect, authorize('admin', 'manager', 'pumper'), endShift);

export default router;
