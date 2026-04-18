import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  savePayment,
  getPayment,
  getReconciliation,
} from '../controllers/sessionPaymentController.js';

const router = Router();

// All payment routes require authentication
router.use(protect);

// Pump operators can save and view their payments
router.post('/:sessionId', authorize('pumpOperator', 'manager'), savePayment);
router.get('/:sessionId', authorize('pumpOperator', 'manager', 'admin'), getPayment);
router.get('/:sessionId/reconciliation', authorize('pumpOperator', 'manager', 'admin'), getReconciliation);

export default router;
