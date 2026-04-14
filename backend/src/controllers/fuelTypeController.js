import { getDb } from '../config/db.js';
import { handleUniqueViolation } from '../db/helpers.js';
import { getFuelTypeById, listFuelTypes } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createFuelType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    const error = new Error('Fuel type name is required');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();

  let fuelTypeId;

  try {
    const { rows } = await db.query(
      `
        INSERT INTO fuel_types (name, description)
        VALUES ($1, $2)
        RETURNING id
      `,
      [name.trim(), description ?? '']
    );
    fuelTypeId = rows[0]?.id;
  } catch (error) {
    handleUniqueViolation(error, 'Fuel type already exists');
  }

  const fuelType = await getFuelTypeById(db, fuelTypeId);

  res.status(201).json(fuelType);
});

export const getFuelTypes = asyncHandler(async (_req, res) => {
  const db = getDb();
  const fuelTypes = await listFuelTypes(db, { activeOnly: true });
  res.json(fuelTypes);
});

export const updateFuelType = asyncHandler(async (req, res) => {
  const db = getDb();
  const fuelType = await getFuelTypeById(db, req.params.id);

  if (!fuelType) {
    const error = new Error('Fuel type not found');
    error.statusCode = 404;
    throw error;
  }

  const { name, description } = req.body;

  try {
    await db.query(
      `
        UPDATE fuel_types
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          updated_at = NOW()
        WHERE id = $1 AND is_active = TRUE
      `,
      [req.params.id, name ? name.trim() : null, description ?? null]
    );
  } catch (error) {
    handleUniqueViolation(error, 'Another fuel type already uses that name');
  }

  const updatedFuelType = await getFuelTypeById(db, req.params.id);
  res.json(updatedFuelType);
});

export const deleteFuelType = asyncHandler(async (req, res) => {
  const db = getDb();
  const fuelType = await getFuelTypeById(db, req.params.id);

  if (!fuelType) {
    const error = new Error('Fuel type not found');
    error.statusCode = 404;
    throw error;
  }

  const { rowCount } = await db.query(
    `
      SELECT 1
      FROM tanks
      WHERE fuel_type_id = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [req.params.id]
  );

  if (rowCount > 0) {
    const error = new Error('Cannot delete a fuel type that is linked to an active tank');
    error.statusCode = 400;
    throw error;
  }

  await db.query(
    `
      UPDATE fuel_types
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [req.params.id]
  );

  res.json({ message: 'Fuel type deleted successfully' });
});
