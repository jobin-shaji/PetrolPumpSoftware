import express from 'express';
import {
  createNozzle,
  deleteNozzle,
  getNozzles,
  updateNozzle,
} from '../controllers/nozzleController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager', 'pumper'), getNozzles);
router.post('/', protect, authorize('admin'), createNozzle);
router.patch('/:id', protect, authorize('admin'), updateNozzle);
router.delete('/:id', protect, authorize('admin'), deleteNozzle);

export default router;
