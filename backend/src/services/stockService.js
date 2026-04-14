import { createHttpError, normalizeNumeric } from '../db/helpers.js';
import { getDb, withTransaction } from '../config/db.js';

const loadTankForUpdate = async (db, tankId) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        capacity,
        current_level AS "currentLevel",
        is_active AS "isActive"
      FROM tanks
      WHERE id = $1
      FOR UPDATE
    `,
    [tankId]
  );

  return rows[0] || null;
};

export const increaseTankLevel = async (tankId, quantityLitres, { client = null } = {}) => {
  const qty = Number(quantityLitres);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw createHttpError('Quantity must be greater than zero', 400);
  }

  const runner = async (db) => {
    const tank = await loadTankForUpdate(db, tankId);

    if (!tank || tank.isActive === false) {
      throw createHttpError('Selected tank is invalid', 400);
    }

    const capacity = normalizeNumeric(tank.capacity) ?? 0;
    const currentLevel = normalizeNumeric(tank.currentLevel) ?? 0;
    const nextLevel = currentLevel + qty;

    if (nextLevel > capacity) {
      throw createHttpError('Tank level cannot exceed capacity', 400);
    }

    await db.query(
      `
        UPDATE tanks
        SET current_level = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [tankId, nextLevel]
    );
  };

  if (client) {
    await runner(client);
    return;
  }

  await withTransaction(async (tx) => runner(tx));
};

export const decreaseTankLevel = async (tankId, quantityLitres, { client = null } = {}) => {
  const qty = Number(quantityLitres);

  if (!Number.isFinite(qty) || qty < 0) {
    throw createHttpError('Quantity must be zero or greater', 400);
  }

  const runner = async (db) => {
    const tank = await loadTankForUpdate(db, tankId);

    if (!tank || tank.isActive === false) {
      throw createHttpError('Selected tank is invalid', 400);
    }

    const currentLevel = normalizeNumeric(tank.currentLevel) ?? 0;
    const nextLevel = currentLevel - qty;

    if (nextLevel < 0) {
      throw createHttpError('Tank level cannot be negative', 400);
    }

    await db.query(
      `
        UPDATE tanks
        SET current_level = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [tankId, nextLevel]
    );
  };

  if (client) {
    await runner(client);
    return;
  }

  await withTransaction(async (tx) => runner(tx));
};

export const getTankLevel = async (tankId) => {
  const db = getDb();
  const { rows } = await db.query(
    `
      SELECT current_level AS "currentLevel"
      FROM tanks
      WHERE id = $1
      LIMIT 1
    `,
    [tankId]
  );
  return normalizeNumeric(rows[0]?.currentLevel) ?? null;
};

