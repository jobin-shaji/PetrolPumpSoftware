import { getDb } from '../config/db.js';
import { getFuelTypeById, getTankById, listTanks } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

const validateTankPayload = async ({ fuelType, capacity, currentLevel }) => {
  if (fuelType) {
    const db = getDb();
    const existingFuelType = await getFuelTypeById(db, fuelType);

    if (!existingFuelType) {
      const error = new Error('Selected fuel type is invalid');
      error.statusCode = 400;
      throw error;
    }
  }

  if (capacity !== undefined && Number(capacity) < 0) {
    const error = new Error('Capacity must be zero or greater');
    error.statusCode = 400;
    throw error;
  }

  if (currentLevel !== undefined && Number(currentLevel) < 0) {
    const error = new Error('Current level must be zero or greater');
    error.statusCode = 400;
    throw error;
  }

  if (
    capacity !== undefined &&
    currentLevel !== undefined &&
    Number(currentLevel) > Number(capacity)
  ) {
    const error = new Error('Current level cannot exceed tank capacity');
    error.statusCode = 400;
    throw error;
  }
};

export const createTank = asyncHandler(async (req, res) => {
  const { fuelType, capacity, currentLevel = 0 } = req.body;

  if (!fuelType || capacity === undefined) {
    const error = new Error('Fuel type and capacity are required');
    error.statusCode = 400;
    throw error;
  }

  await validateTankPayload({ fuelType, capacity, currentLevel });

  const db = getDb();
  const { rows } = await db.query(
    `
      INSERT INTO tanks (fuel_type_id, capacity, current_level)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [fuelType, Number(capacity), Number(currentLevel)]
  );

  const tank = await getTankById(db, rows[0]?.id);
  res.status(201).json(tank);
});

export const getTanks = asyncHandler(async (_req, res) => {
  const db = getDb();
  const tanks = await listTanks(db, { activeOnly: true });
  res.json(tanks);
});

export const updateTank = asyncHandler(async (req, res) => {
  const db = getDb();
  const tank = await getTankById(db, req.params.id);

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const nextFuelType = req.body.fuelType || tank.fuelType;
  const nextCapacity =
    req.body.capacity !== undefined ? Number(req.body.capacity) : tank.capacity;
  const nextCurrentLevel =
    req.body.currentLevel !== undefined ? Number(req.body.currentLevel) : tank.currentLevel;

  await validateTankPayload({
    fuelType: nextFuelType,
    capacity: nextCapacity,
    currentLevel: nextCurrentLevel,
  });

  await db.query(
    `
      UPDATE tanks
      SET
        fuel_type_id = $2,
        capacity = $3,
        current_level = $4,
        updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `,
    [req.params.id, nextFuelType._id || nextFuelType, nextCapacity, nextCurrentLevel]
  );

  const updatedTank = await getTankById(db, req.params.id);
  res.json(updatedTank);
});

export const deleteTank = asyncHandler(async (req, res) => {
  const db = getDb();
  const tank = await getTankById(db, req.params.id);

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const [{ rowCount: nozzleCount }, { rowCount: purchaseCount }] = await Promise.all([
    db.query(
      `
        SELECT 1
        FROM nozzles
        WHERE tank_id = $1 AND is_active = TRUE
        LIMIT 1
      `,
      [req.params.id]
    ),
    db.query(
      `
        SELECT 1
        FROM purchases
        WHERE tank_id = $1 AND is_deleted = FALSE
        LIMIT 1
      `,
      [req.params.id]
    ),
  ]);

  if (nozzleCount > 0 || purchaseCount > 0) {
    const error = new Error('Tank cannot be deleted while linked to nozzles or purchases');
    error.statusCode = 400;
    throw error;
  }

  await db.query(
    `
      UPDATE tanks
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [req.params.id]
  );
  res.json({ message: 'Tank deleted successfully' });
});
