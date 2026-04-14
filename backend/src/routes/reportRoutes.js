import express from 'express';
import {
  getDailySummary,
  getFuelSummary,
  getProfitReport,
} from '../controllers/reportController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profit', protect, authorize('admin', 'manager'), getProfitReport);
router.get('/daily', protect, authorize('admin', 'manager'), getDailySummary);
router.get('/fuel', protect, authorize('admin', 'manager'), getFuelSummary);

export default router;
