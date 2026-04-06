import express from 'express';
import { createReading, getReadings } from '../controllers/readingController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('admin', 'manager', 'pumpOperator'), createReading)
  .get(protect, authorize('admin', 'manager', 'pumpOperator'), getReadings);

export default router;
