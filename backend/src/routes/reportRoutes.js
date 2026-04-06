import express from 'express';
import {
  getDailySummary,
  getFuelSummary,
  getProfitReport,
} from '../controllers/reportController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profit', protect, authorize('admin'), getProfitReport);
router.get('/daily', protect, authorize('admin'), getDailySummary);
router.get('/fuel', protect, authorize('admin'), getFuelSummary);

export default router;
