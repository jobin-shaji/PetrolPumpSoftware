import express from 'express';
import { createPurchase, getPurchases } from '../controllers/purchaseController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('admin', 'manager'), createPurchase)
  .get(protect, authorize('admin', 'manager'), getPurchases);

export default router;
