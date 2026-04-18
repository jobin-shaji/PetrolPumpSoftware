import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listAll,
  getById,
  create,
  update,
} from '../controllers/customerController.js';

const router = Router();

// Read access is needed on the operator session page; edits stay manager/admin only.
router.use(protect);

router.get('/', authorize('admin', 'manager', 'pumpOperator'), listAll);
router.get('/:id', authorize('admin', 'manager', 'pumpOperator'), getById);
router.post('/', authorize('admin', 'manager'), create);
router.patch('/:id', authorize('admin', 'manager'), update);

export default router;
