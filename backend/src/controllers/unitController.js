import { getDb } from '../config/db.js';
import { getUnitById, listUnits } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assignNozzlesToUnit, clearUnitNozzles } from '../services/unitService.js';

export const createUnit = asyncHandler(async (req, res) => {
  const { name, nozzleIds = [] } = req.body;

  if (!name) {
    const error = new Error('Unit name is required');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  let unitId;

  try {
    const { rows } = await db.query(
      `
        INSERT INTO pump_units (name, status)
        VALUES ($1, 'available')
        RETURNING id
      `,
      [name.trim()]
    );
    unitId = rows[0]?.id;
  } catch (error) {
    if (error?.code === '23505') {
      const err = new Error('Unit name already exists');
      err.statusCode = 400;
      throw err;
    }

    throw error;
  }

  await assignNozzlesToUnit(unitId, nozzleIds);

  const unit = await getUnitById(db, unitId);
  res.status(201).json(unit);
});

export const getUnits = asyncHandler(async (_req, res) => {
  const db = getDb();
  const units = await listUnits(db, { activeOnly: true });
  res.json(units);
});

export const updateUnit = asyncHandler(async (req, res) => {
  const db = getDb();
  const unit = await getUnitById(db, req.params.id);

  if (!unit) {
    const error = new Error('Unit not found');
    error.statusCode = 404;
    throw error;
  }

  if (unit.status === 'occupied' && req.body.nozzleIds) {
    const error = new Error('Cannot reconfigure nozzles while a unit session is active');
    error.statusCode = 400;
    throw error;
  }

  if (req.body.name && req.body.name !== unit.name) {
    try {
      await db.query(
        `
          UPDATE pump_units
          SET name = $2, updated_at = NOW()
          WHERE id = $1 AND is_active = TRUE
        `,
        [req.params.id, req.body.name.trim()]
      );
    } catch (error) {
      if (error?.code === '23505') {
        const err = new Error('Another unit already uses that name');
        err.statusCode = 400;
        throw err;
      }

      throw error;
    }
  }

  if (req.body.nozzleIds) {
    await assignNozzlesToUnit(req.params.id, req.body.nozzleIds);
  }

  const updatedUnit = await getUnitById(db, req.params.id);
  res.json(updatedUnit);
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const db = getDb();
  const unit = await getUnitById(db, req.params.id);

  if (!unit) {
    const error = new Error('Unit not found');
    error.statusCode = 404;
    throw error;
  }

  const [{ rowCount: openSessionCount }, { rowCount: activeShiftCount }] = await Promise.all([
    db.query(
      `
        SELECT 1
        FROM unit_sessions
        WHERE unit_id = $1 AND status = 'open'
        LIMIT 1
      `,
      [req.params.id]
    ),
    db.query(
      `
        SELECT 1
        FROM shifts
        WHERE unit_id = $1 AND status = 'active'
        LIMIT 1
      `,
      [req.params.id]
    ),
  ]);

  if (unit.status === 'occupied' || openSessionCount > 0 || activeShiftCount > 0) {
    const error = new Error('Unit cannot be deleted while an active session or shift exists');
    error.statusCode = 400;
    throw error;
  }

  await clearUnitNozzles(req.params.id);

  await db.query(
    `
      UPDATE pump_units
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [req.params.id]
  );

  res.json({ message: 'Unit deleted successfully' });
});
