import { getDb } from '../config/db.js';
import { handleUniqueViolation } from '../db/helpers.js';
import { getNozzleById, listNozzles } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { refreshUnitNozzles } from '../services/unitService.js';

const validateReferences = async (tankId, unitId) => {
  const db = getDb();
  const { rowCount: tankCount } = await db.query(
    `
      SELECT 1
      FROM tanks
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [tankId]
  );

  if (tankCount === 0) {
    const error = new Error('Selected tank is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (unitId) {
    const { rows: unitRows } = await db.query(
      `
        SELECT status
        FROM pump_units
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1
      `,
      [unitId]
    );

    if (!unitRows[0]) {
      const error = new Error('Selected unit is invalid');
      error.statusCode = 400;
      throw error;
    }

    if (unitRows[0].status === 'occupied') {
      const error = new Error('Cannot assign a nozzle to an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }
};

export const createNozzle = asyncHandler(async (req, res) => {
  const { tank, nozzleNumber, unit } = req.body;

  if (!tank || !nozzleNumber) {
    const error = new Error('Tank and nozzle number are required');
    error.statusCode = 400;
    throw error;
  }

  await validateReferences(tank, unit);

  const db = getDb();
  let nozzleId;

  try {
    const { rows } = await db.query(
      `
        INSERT INTO nozzles (tank_id, nozzle_number, unit_id)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [tank, nozzleNumber.trim(), unit || null]
    );

    nozzleId = rows[0]?.id;
  } catch (error) {
    handleUniqueViolation(error, 'Nozzle number already exists');
  }

  if (unit) {
    await refreshUnitNozzles(unit);
  }

  const nozzle = await getNozzleById(db, nozzleId);
  res.status(201).json(nozzle);
});

export const getNozzles = asyncHandler(async (_req, res) => {
  const db = getDb();
  const nozzles = await listNozzles(db, { activeOnly: true });
  res.json(nozzles);
});

export const updateNozzle = asyncHandler(async (req, res) => {
  const db = getDb();
  const nozzle = await getNozzleById(db, req.params.id);

  if (!nozzle) {
    const error = new Error('Nozzle not found');
    error.statusCode = 404;
    throw error;
  }

  const nextTank = req.body.tank || nozzle.tank?._id || nozzle.tank;
  const nextUnit =
    req.body.unit !== undefined ? req.body.unit : nozzle.unit?._id || nozzle.unit;
  await validateReferences(nextTank, nextUnit);

  if (req.body.nozzleNumber && req.body.nozzleNumber !== nozzle.nozzleNumber) {
    // uniqueness enforced in DB; map unique violation below
  }

  const previousUnitId = nozzle.unit?._id || nozzle.unit || null;

  if (previousUnitId && previousUnitId !== nextUnit?.toString()) {
    const { rows: previousUnitRows } = await db.query(
      `
        SELECT status
        FROM pump_units
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1
      `,
      [previousUnitId]
    );

    if (previousUnitRows[0]?.status === 'occupied') {
      const error = new Error('Cannot move a nozzle out of an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }

  try {
    await db.query(
      `
        UPDATE nozzles
        SET
          tank_id = $2,
          unit_id = $3,
          nozzle_number = COALESCE($4, nozzle_number),
          updated_at = NOW()
        WHERE id = $1 AND is_active = TRUE
      `,
      [req.params.id, nextTank, nextUnit || null, req.body.nozzleNumber?.trim() || null]
    );
  } catch (error) {
    handleUniqueViolation(error, 'Another nozzle already uses that number');
  }

  const unitIds = [previousUnitId, nextUnit].filter(Boolean);
  await Promise.all([...new Set(unitIds)].map((item) => refreshUnitNozzles(item)));

  const updatedNozzle = await getNozzleById(db, req.params.id);
  res.json(updatedNozzle);
});

export const deleteNozzle = asyncHandler(async (req, res) => {
  const db = getDb();
  const nozzle = await getNozzleById(db, req.params.id);

  if (!nozzle) {
    const error = new Error('Nozzle not found');
    error.statusCode = 404;
    throw error;
  }

  const { rowCount: readingCount } = await db.query(
    `
      SELECT 1
      FROM unit_session_nozzle_readings
      WHERE nozzle_id = $1
        AND closing_reading IS NOT NULL
      LIMIT 1
    `,
    [req.params.id]
  );

  if (readingCount > 0) {
    const error = new Error('Nozzle cannot be deleted because financial readings exist');
    error.statusCode = 400;
    throw error;
  }

  const previousUnitId = nozzle.unit?._id || nozzle.unit || null;

  if (previousUnitId) {
    const { rows: previousUnitRows } = await db.query(
      `
        SELECT status
        FROM pump_units
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1
      `,
      [previousUnitId]
    );

    if (previousUnitRows[0]?.status === 'occupied') {
      const error = new Error('Cannot delete a nozzle from an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }

  await db.query(
    `
      UPDATE nozzles
      SET is_active = FALSE, unit_id = NULL, updated_at = NOW()
      WHERE id = $1
    `,
    [req.params.id]
  );

  if (previousUnitId) {
    await refreshUnitNozzles(previousUnitId);
  }

  res.json({ message: 'Nozzle deleted successfully' });
});
