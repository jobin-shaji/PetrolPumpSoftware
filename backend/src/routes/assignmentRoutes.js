import express from 'express';
import { assignPumperToUnit } from '../controllers/assignmentController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('admin', 'manager'), assignPumperToUnit);

export default router;
