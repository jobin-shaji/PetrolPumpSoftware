import express from 'express';
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '../controllers/userController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.route('/').post(createUser).get(getUsers);
router.route('/:id').patch(updateUser).delete(deleteUser);

export default router;
