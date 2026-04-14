import { getDb } from '../config/db.js';
import { createHttpError } from '../db/helpers.js';

const normalizeIds = (items = []) => [...new Set(items.map((item) => item.toString()))];

const ensureUnitsAvailable = async (unitIds = []) => {
  const normalizedIds = normalizeIds(unitIds.filter(Boolean));

  if (!normalizedIds.length) {
    return;
  }

  const db = getDb();
  const { rows } = await db.query(
    `
      SELECT name
      FROM pump_units
      WHERE id = ANY($1::uuid[])
        AND is_active = TRUE
        AND status = 'occupied'
    `,
    [normalizedIds]
  );

  if (rows.length) {
    throw createHttpError(
      `Cannot modify nozzles while unit is occupied: ${rows.map((row) => row.name).join(', ')}`,
      400
    );
  }
};

export const refreshUnitNozzles = async (unitId) => {
  if (!unitId) {
    return;
  }

  // nozzles are derived via queries in PostgreSQL; no denormalized list stored.
};

export const assignNozzlesToUnit = async (unitId, nozzleIds = []) => {
  const normalizedIds = normalizeIds(nozzleIds);
  const db = getDb();
  const { rowCount: unitCount } = await db.query(
    `
      SELECT 1
      FROM pump_units
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [unitId]
  );

  if (unitCount === 0) {
    throw createHttpError('Pump unit not found', 404);
  }

  await ensureUnitsAvailable([unitId]);

  if (normalizedIds.length) {
    const { rows: nozzleRows } = await db.query(
      `
        SELECT id, unit_id AS "unitId"
        FROM nozzles
        WHERE id = ANY($1::uuid[])
          AND is_active = TRUE
      `,
      [normalizedIds]
    );

    if (nozzleRows.length !== normalizedIds.length) {
      throw createHttpError('One or more nozzles are invalid', 400);
    }

    const previousUnitIds = normalizeIds(nozzleRows.map((row) => row.unitId).filter(Boolean));

    await ensureUnitsAvailable(previousUnitIds);

    await db.query(
      `
        UPDATE nozzles
        SET unit_id = NULL, updated_at = NOW()
        WHERE unit_id = $1
          AND is_active = TRUE
          AND NOT (id = ANY($2::uuid[]))
      `,
      [unitId, normalizedIds]
    );

    await db.query(
      `
        UPDATE nozzles
        SET unit_id = $2, updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `,
      [normalizedIds, unitId]
    );

    return;
  }

  await db.query(
    `
      UPDATE nozzles
      SET unit_id = NULL, updated_at = NOW()
      WHERE unit_id = $1 AND is_active = TRUE
    `,
    [unitId]
  );
};

export const clearUnitNozzles = async (unitId) => {
  await ensureUnitsAvailable([unitId]);
  const db = getDb();
  await db.query(
    `
      UPDATE nozzles
      SET unit_id = NULL, updated_at = NOW()
      WHERE unit_id = $1 AND is_active = TRUE
    `,
    [unitId]
  );
};
