import express from 'express';
import { getCurrentFuelPrices, saveFuelPrice } from '../controllers/fuelPriceController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/current', protect, authorize('admin', 'manager', 'pumpOperator'), getCurrentFuelPrices);
router.post('/', protect, authorize('admin', 'manager'), saveFuelPrice);

export default router;