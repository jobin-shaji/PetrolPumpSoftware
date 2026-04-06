import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    const error = new Error('Name, email, password, and role are required');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

  if (existingUser) {
    const error = new Error('A user with that email already exists');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
  });

  const createdUser = await User.findById(user._id);
  res.status(201).json(createdUser);
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true }).sort({ createdAt: -1 });

  res.json(users);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isActive: true });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { name, email, password, role, isActive } = req.body;

  if (email && email !== user.email) {
    const existingEmail = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: user._id },
    });

    if (existingEmail) {
      const error = new Error('Another user already uses that email');
      error.statusCode = 400;
      throw error;
    }
  }

  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  if (name) {
    user.name = name;
  }

  if (email) {
    user.email = email.toLowerCase().trim();
  }

  if (role) {
    user.role = role;
  }

  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
  }

  await user.save();

  const updatedUser = await User.findById(user._id);
  res.json(updatedUser);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || !user.isActive) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.isActive = false;
  await user.save();

  res.json({ message: 'User deactivated successfully' });
});
