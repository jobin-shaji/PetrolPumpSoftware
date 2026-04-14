import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../config/db.js';
import {
  getActiveUserRowByEmail,
  getUserRowById,
  mapUserRecord,
} from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

const buildToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  const userRow = await getActiveUserRowByEmail(db, email.toLowerCase().trim());
  const user = mapUserRecord(userRow);

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, userRow.passwordHash);

  if (!passwordMatches) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  res.json({
    token: buildToken(user),
    user,
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const db = getDb();
  const userRow = await getUserRowById(db, req.user._id);
  const user = mapUserRecord(userRow);

  res.json({
    user,
  });
});
