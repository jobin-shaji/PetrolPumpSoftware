import express from 'express';
import {
  endSession,
  forceCloseSession,
  getCurrentSession,
  listSessions,
  recordReadings,
  startSession,
} from '../controllers/unitSessionController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumpOperator'), listSessions);
router.get('/current', protect, authorize('pumpOperator'), getCurrentSession);
router.post('/start', protect, authorize('pumpOperator'), startSession);
router.post('/record-readings', protect, authorize('pumpOperator', 'admin'), recordReadings);
router.post('/end', protect, authorize('pumpOperator', 'admin'), endSession);
router.post('/:id/force-close', protect, authorize('admin'), forceCloseSession);

export default router;
