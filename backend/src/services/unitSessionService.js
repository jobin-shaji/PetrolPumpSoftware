import { getDb, withTransaction } from '../config/db.js';
import { createHttpError, normalizeNumeric } from '../db/helpers.js';
import {
  getCurrentUnitSessionByUserId,
  getUnitSessionById,
  listUnitSessions,
} from './dataService.js';
import { decreaseTankLevel, increaseTankLevel } from './stockService.js';

const toIdString = (value) => (value === null || value === undefined ? null : value.toString());

const buildReadingMap = (items = [], { requirePrice = false } = {}) => {
  if (!Array.isArray(items) || !items.length) {
    throw createHttpError('Reading values are required for all nozzles', 400);
  }

  const readingMap = new Map();

  for (const item of items) {
    const nozzleId = toIdString(item?.nozzleId || item?.nozzle?._id || item?.nozzle);

    if (!nozzleId) {
      throw createHttpError('Each reading must include a nozzle identifier', 400);
    }

    if (readingMap.has(nozzleId)) {
      throw createHttpError('Duplicate nozzle readings are not allowed', 400);
    }

    const rawReading = item?.reading;
    if (rawReading === '' || rawReading === null || rawReading === undefined) {
      throw createHttpError('Reading values are required for every nozzle', 400);
    }

    const reading = Number(rawReading);
    if (!Number.isFinite(reading) || reading < 0) {
      throw createHttpError('Reading values must be zero or greater', 400);
    }

    const normalized = { nozzleId, reading };

    if (requirePrice) {
      const rawPricePerLitre = item?.pricePerLitre;
      if (
        rawPricePerLitre === '' ||
        rawPricePerLitre === null ||
        rawPricePerLitre === undefined
      ) {
        throw createHttpError('Price per litre is required for every nozzle', 400);
      }

      const pricePerLitre = Number(rawPricePerLitre);
      if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
        throw createHttpError('Price per litre must be greater than zero', 400);
      }

      normalized.pricePerLitre = pricePerLitre;
    }

    readingMap.set(nozzleId, normalized);
  }

  return readingMap;
};

const ensureCoverage = (readingMap, nozzleIds, message) => {
  const expectedIds = [...new Set(nozzleIds.map((id) => id.toString()))];

  if (!expectedIds.length) {
    throw createHttpError('The selected unit does not have any active nozzles', 400);
  }

  if (readingMap.size !== expectedIds.length) {
    throw createHttpError(message, 400);
  }

  for (const nozzleId of expectedIds) {
    if (!readingMap.has(nozzleId)) {
      throw createHttpError(message, 400);
    }
  }
};

const loadUnitForUpdate = async (db, unitId) => {
  const { rows } = await db.query(
    `
      SELECT id, status, is_active AS "isActive"
      FROM pump_units
      WHERE id = $1
      FOR UPDATE
    `,
    [unitId]
  );

  return rows[0] || null;
};

const loadActiveUnitNozzles = async (db, unitId) => {
  const { rows } = await db.query(
    `
      SELECT
        n.id,
        n.nozzle_number AS "nozzleNumber",
        n.latest_reading AS "latestReading",
        n.tank_id AS "tankId"
      FROM nozzles n
      WHERE n.unit_id = $1 AND n.is_active = TRUE
      ORDER BY n.nozzle_number ASC
    `,
    [unitId]
  );

  if (!rows.length) {
    throw createHttpError('The selected unit does not have any active nozzles', 400);
  }

  return rows;
};

const loadSessionClosingRows = async (db, sessionId) => {
  const { rows } = await db.query(
    `
      SELECT
        r.nozzle_id AS "nozzleId",
        r.opening_reading AS "openingReading",
        r.closing_reading AS "closingReading",
        n.nozzle_number AS "nozzleNumber",
        n.tank_id AS "tankId",
        ft.id AS "fuelTypeId",
        ft.name AS "fuelTypeName"
      FROM unit_session_nozzle_readings r
      JOIN nozzles n ON n.id = r.nozzle_id
      JOIN tanks t ON t.id = n.tank_id
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      WHERE r.unit_session_id = $1
      ORDER BY n.nozzle_number ASC
    `,
    [sessionId]
  );

  return rows;
};

const persistClosingReadings = async (tx, sessionId, readingRows, closingMap, timestamp) => {
  ensureCoverage(
    closingMap,
    readingRows.map((row) => row.nozzleId),
    'Closing readings must be provided once for every nozzle opened in the session'
  );

  for (const row of readingRows) {
    const openingReading = normalizeNumeric(row.openingReading) ?? 0;
    const previousClosingReading = normalizeNumeric(row.closingReading);
    const closing = closingMap.get(row.nozzleId);
    const nextClosingReading = closing.reading;
    const nextLitresSold = nextClosingReading - openingReading;

    if (nextLitresSold < 0) {
      throw createHttpError(
        `Closing reading cannot be less than opening reading for nozzle ${row.nozzleNumber}`,
        400
      );
    }

    const previousLitresSold = Number.isFinite(previousClosingReading)
      ? previousClosingReading - openingReading
      : 0;
    const litresDelta = nextLitresSold - previousLitresSold;

    if (litresDelta > 0) {
      await decreaseTankLevel(row.tankId, litresDelta, { client: tx });
    } else if (litresDelta < 0) {
      await increaseTankLevel(row.tankId, Math.abs(litresDelta), { client: tx });
    }

    const { rows: priceRows } = await tx.query(
      `
        SELECT price_per_litre AS "pricePerLitre"
        FROM daily_fuel_prices
        WHERE fuel_type_id = $1
          AND price_date <= $2::date
        ORDER BY price_date DESC, created_at DESC
        LIMIT 1
      `,
      [row.fuelTypeId, timestamp]
    );

    const pricePerLitre = normalizeNumeric(priceRows[0]?.pricePerLitre);

    if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
      throw createHttpError(
        `Daily fuel price is not configured for ${row.fuelTypeName} on ${timestamp.toISOString().slice(0, 10)}`,
        400
      );
    }

    const totalAmount = nextLitresSold * pricePerLitre;

    await tx.query(
      `
        UPDATE unit_session_nozzle_readings
        SET
          closing_reading = $3,
          price_per_litre = $4,
          litres_sold = $5,
          total_amount = $6,
          closed_at = $7,
          updated_at = NOW()
        WHERE unit_session_id = $1 AND nozzle_id = $2
      `,
      [sessionId, row.nozzleId, nextClosingReading, pricePerLitre, nextLitresSold, totalAmount, timestamp]
    );

    await tx.query(
      `
        UPDATE nozzles
        SET latest_reading = $2, latest_reading_updated_at = $3, updated_at = NOW()
        WHERE id = $1
      `,
      [row.nozzleId, nextClosingReading, timestamp]
    );
  }
};

export const startUnitSession = async ({ unitId, pumpOperatorId, openingReadings }) => {
  const db = getDb();
  const openingMap = buildReadingMap(openingReadings);

  const sessionId = await withTransaction(async (tx) => {
    const unit = await loadUnitForUpdate(tx, unitId);

    if (!unit || unit.isActive === false) {
      throw createHttpError('Selected unit is invalid', 400);
    }

    if (unit.status === 'occupied') {
      throw createHttpError('This unit is currently occupied', 400);
    }

    const nozzles = await loadActiveUnitNozzles(tx, unitId);
    ensureCoverage(
      openingMap,
      nozzles.map((n) => n.id),
      'Opening readings must be provided once for every active nozzle in the unit'
    );

    for (const nozzle of nozzles) {
      const openingReading = openingMap.get(nozzle.id)?.reading;
      const latestReading = normalizeNumeric(nozzle.latestReading) ?? 0;

      if (openingReading < latestReading) {
        throw createHttpError(
          `Opening reading for nozzle ${nozzle.nozzleNumber} must be at least ${latestReading}`,
          400
        );
      }
    }

    let shiftId;
    try {
      const { rows } = await tx.query(
        `
          INSERT INTO shifts (unit_id, status, started_by_user_id, start_time)
          VALUES ($1, 'active', $2, NOW())
          RETURNING id
        `,
        [unitId, pumpOperatorId]
      );
      shiftId = rows[0]?.id;
    } catch (error) {
      if (error?.code === '23505') {
        throw createHttpError('This unit already has an active shift', 400);
      }
      throw error;
    }

    let createdSessionId;
    try {
      const { rows } = await tx.query(
        `
          INSERT INTO unit_sessions (unit_id, pump_operator_id, shift_id, status, start_time)
          VALUES ($1, $2, $3, 'open', NOW())
          RETURNING id
        `,
        [unitId, pumpOperatorId, shiftId]
      );
      createdSessionId = rows[0]?.id;
    } catch (error) {
      if (error?.code === '23505') {
        throw createHttpError('This unit already has an open session', 400);
      }
      throw error;
    }

    const readingValues = nozzles.map((nozzle) => {
      const reading = openingMap.get(nozzle.id)?.reading;
      return { nozzleId: nozzle.id, reading };
    });

    await Promise.all(
      readingValues.map((reading) =>
        tx.query(
          `
            INSERT INTO unit_session_nozzle_readings (unit_session_id, nozzle_id, opening_reading)
            VALUES ($1, $2, $3)
          `,
          [createdSessionId, reading.nozzleId, reading.reading]
        )
      )
    );

    await tx.query(
      `
        UPDATE pump_units
        SET status = 'occupied', assigned_to_user_id = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [unitId, pumpOperatorId]
    );

    return createdSessionId;
  });

  return getUnitSessionById(db, sessionId);
};

export const recordUnitSessionReadings = async ({ sessionId, closingReadings, actingUser }) => {
  const db = getDb();
  const closingMap = buildReadingMap(closingReadings);

  await withTransaction(async (tx) => {
    const { rows: sessionRows } = await tx.query(
      `
        SELECT
          id,
          unit_id AS "unitId",
          pump_operator_id AS "pumpOperatorId",
          status
        FROM unit_sessions
        WHERE id = $1
        FOR UPDATE
      `,
      [sessionId]
    );

    const session = sessionRows[0];

    if (!session || session.status !== 'open') {
      throw createHttpError('Open unit session not found', 404);
    }

    const isOwner = session.pumpOperatorId === actingUser._id;
    if (!isOwner && actingUser.role !== 'admin') {
      throw createHttpError('You are not allowed to update this unit session', 403);
    }

    const unit = await loadUnitForUpdate(tx, session.unitId);

    if (!unit || unit.isActive === false || unit.status !== 'occupied') {
      throw createHttpError('Unit lock is no longer valid for this session', 400);
    }

    const readingRows = await loadSessionClosingRows(tx, sessionId);

    if (!readingRows.length) {
      throw createHttpError('The selected session does not have any nozzles', 400);
    }

    await persistClosingReadings(tx, sessionId, readingRows, closingMap, new Date());
  });

  return getUnitSessionById(db, sessionId);
};

export const endUnitSession = async ({
  sessionId,
  closingReadings,
  actingUser,
  forceClose = false,
  closeReason = '',
}) => {
  const db = getDb();

  await withTransaction(async (tx) => {
    const { rows: sessionRows } = await tx.query(
      `
        SELECT
          id,
          unit_id AS "unitId",
          pump_operator_id AS "pumpOperatorId",
          shift_id AS "shiftId",
          status
        FROM unit_sessions
        WHERE id = $1
        FOR UPDATE
      `,
      [sessionId]
    );

    const session = sessionRows[0];

    if (!session || session.status !== 'open') {
      throw createHttpError('Open unit session not found', 404);
    }

    const isOwner = session.pumpOperatorId === actingUser._id;
    if (!isOwner && !(forceClose && actingUser.role === 'admin')) {
      throw createHttpError('You are not allowed to close this unit session', 403);
    }

    const unit = await loadUnitForUpdate(tx, session.unitId);
    if (!unit || unit.isActive === false || unit.status !== 'occupied') {
      throw createHttpError('Unit lock is no longer valid for this session', 400);
    }

    const timestamp = new Date();
    const readingRows = await loadSessionClosingRows(tx, sessionId);

    if (!readingRows.length) {
      throw createHttpError('The selected session does not have any nozzles', 400);
    }

    if (Array.isArray(closingReadings) && closingReadings.length > 0) {
      const closingMap = buildReadingMap(closingReadings);
      await persistClosingReadings(tx, sessionId, readingRows, closingMap, timestamp);
    } else if (readingRows.some((row) => row.closingReading === null)) {
      throw createHttpError('Record closing readings before ending the unit session', 400);
    }

    await tx.query(
      `
        UPDATE unit_sessions
        SET
          status = 'closed',
          end_time = $2,
          ended_by_user_id = $3,
          forced_close = $4,
          close_reason = $5,
          updated_at = NOW()
        WHERE id = $1
      `,
      [sessionId, timestamp, actingUser._id, forceClose, forceClose ? closeReason ?? '' : '']
    );

    await tx.query(
      `
        UPDATE shifts
        SET
          status = 'closed',
          end_time = $2,
          ended_by_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [session.shiftId, timestamp, actingUser._id]
    );

    await tx.query(
      `
        UPDATE pump_units
        SET status = 'available', assigned_to_user_id = NULL, updated_at = NOW()
        WHERE id = $1
      `,
      [session.unitId]
    );
  });

  return getUnitSessionById(db, sessionId);
};

export const getCurrentUnitSessionForUser = async (userId) => {
  const db = getDb();
  return getCurrentUnitSessionByUserId(db, userId);
};

export const getUnitSessions = async ({ user, query }) => {
  const db = getDb();

  const status = query?.status || null;
  const unitId = query?.unitId || null;

  const pumpOperatorId =
    user?.role === 'pumpOperator' ? user._id : query?.pumpOperatorId || null;

  return listUnitSessions(db, { status, unitId, pumpOperatorId });
};

