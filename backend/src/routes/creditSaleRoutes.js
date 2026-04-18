import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listAll,
  getById,
  create,
  listBySession,
} from '../controllers/creditSaleController.js';

const router = Router();

// All credit sale routes require authentication and pumpOperator/manager role
router.use(protect);

router.get('/', authorize('pumpOperator', 'manager', 'admin'), listAll);
router.post('/', authorize('pumpOperator', 'manager'), create);
router.get('/session/:sessionId', authorize('pumpOperator', 'manager', 'admin'), listBySession);
router.get('/:id', authorize('pumpOperator', 'manager', 'admin'), getById);

export default router;
