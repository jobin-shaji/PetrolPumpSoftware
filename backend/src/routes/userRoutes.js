import express from 'express';
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '../controllers/userController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.post('/', protect, authorize('admin'), createUser);
router.patch('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

export default router;
