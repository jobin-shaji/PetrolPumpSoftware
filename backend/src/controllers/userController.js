import bcrypt from 'bcryptjs';
import { getDb } from '../config/db.js';
import { handleUniqueViolation, mapId, normalizeBoolean } from '../db/helpers.js';
import { getUserById, listUsers } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    const error = new Error('Name, email, password, and role are required');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const db = getDb();

  let createdUserId;

  try {
    const { rows } = await db.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [name, email.toLowerCase().trim(), passwordHash, role]
    );

    createdUserId = rows[0]?.id;
  } catch (error) {
    handleUniqueViolation(error, 'A user with that email already exists');
  }

  const createdUser = await getUserById(db, createdUserId);
  res.status(201).json(createdUser ? mapId(createdUser) : null);
});

export const getUsers = asyncHandler(async (_req, res) => {
  const db = getDb();
  const users = await listUsers(db, { activeOnly: true });
  res.json(users);
});

export const updateUser = asyncHandler(async (req, res) => {
  const db = getDb();
  const existing = await getUserById(db, req.params.id);

  if (!existing || existing.isActive === false) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { name, email, password, role, isActive } = req.body;

  const nextEmail = email ? email.toLowerCase().trim() : existing.email;
  const nextPasswordHash = password ? await bcrypt.hash(password, 10) : null;
  const nextIsActive = normalizeBoolean(isActive);

  try {
    await db.query(
      `
        UPDATE users
        SET
          name = COALESCE($2, name),
          email = COALESCE($3, email),
          password_hash = COALESCE($4, password_hash),
          role = COALESCE($5, role),
          is_active = COALESCE($6::boolean, is_active),
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        req.params.id,
        name ?? null,
        nextEmail ?? null,
        nextPasswordHash ?? null,
        role ?? null,
        typeof nextIsActive === 'boolean' ? nextIsActive : null,
      ]
    );
  } catch (error) {
    handleUniqueViolation(error, 'Another user already uses that email');
  }

  const updatedUser = await getUserById(db, req.params.id);
  res.json(updatedUser);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const db = getDb();
  const user = await getUserById(db, req.params.id);

  if (!user || !user.isActive) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  await db.query(
    `
      UPDATE users
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [req.params.id]
  );

  res.json({ message: 'User deactivated successfully' });
});
