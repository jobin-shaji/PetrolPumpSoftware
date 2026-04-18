import { getDb, withTransaction } from '../config/db.js';
import { createHttpError, normalizeNumeric } from '../db/helpers.js';
import { getSessionCreditTotal } from './creditSaleService.js';

export const calculateSessionPaymentReconciliation = async (sessionId, closingReadings) => {
  const db = getDb();
  const closingReadingMap = Array.isArray(closingReadings) && closingReadings.length
    ? new Map(
        closingReadings.map((reading) => [
          reading.nozzleId?.toString?.() || reading.nozzleId,
          normalizeNumeric(reading.reading),
        ])
      )
    : null;

  // Get session readings
  const { rows: readingRows } = await db.query(
    `
      SELECT
        unr.id,
        unr.nozzle_id,
        unr.opening_reading,
        unr.closing_reading,
        unr.price_per_litre,
        unr.total_amount,
        n.tank_id,
        ft.id as fuel_type_id
      FROM unit_session_nozzle_readings unr
      JOIN nozzles n ON unr.nozzle_id = n.id
      JOIN tanks t ON n.tank_id = t.id
      JOIN fuel_types ft ON t.fuel_type_id = ft.id
      WHERE unr.unit_session_id = $1 AND unr.closing_reading IS NOT NULL
    `,
    [sessionId]
  );

  const readingIds = readingRows.map((row) => row.nozzle_id);

  if (closingReadingMap && readingIds.some((nozzleId) => !closingReadingMap.has(nozzleId))) {
    throw createHttpError('Closing readings are required for every nozzle in the session', 400);
  }

  const { rows: priceRows } = await db.query(
    `
      SELECT
        ft.id AS "fuelTypeId",
        p.price_per_litre AS "pricePerLitre"
      FROM fuel_types ft
      LEFT JOIN LATERAL (
        SELECT price_per_litre
        FROM daily_fuel_prices dp
        WHERE dp.fuel_type_id = ft.id
          AND dp.price_date <= CURRENT_DATE
        ORDER BY dp.price_date DESC, dp.created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE ft.id = ANY($1::uuid[])
    `,
    [readingRows.map((row) => row.fuel_type_id)]
  );

  const priceByFuelTypeId = new Map(
    priceRows.map((row) => [row.fuelTypeId, normalizeNumeric(row.pricePerLitre)])
  );

  // Calculate total sales from all nozzles
  let totalSales = 0;
  for (const reading of readingRows) {
    const nozzleId = reading.nozzle_id.toString();
    const openingReading = normalizeNumeric(reading.opening_reading) ?? 0;
    const closingReading = closingReadingMap
      ? closingReadingMap.get(nozzleId)
      : normalizeNumeric(reading.closing_reading);

    if (!Number.isFinite(closingReading)) {
      throw createHttpError('Closing readings are required for every nozzle in the session', 400);
    }

    if (closingReading < openingReading) {
      throw createHttpError('Closing reading cannot be less than opening reading', 400);
    }

    const litresSold = closingReading - openingReading;
    const pricePerLitre = priceByFuelTypeId.get(reading.fuel_type_id);

    if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
      throw createHttpError('Daily fuel price is not configured for one or more fuels', 400);
    }

    totalSales += litresSold * pricePerLitre;
  }

  // Get credit sales total
  const creditSalesTotal = await getSessionCreditTotal(sessionId);

  // Calculate expected collection
  const expectedCollection = totalSales - creditSalesTotal;

  return {
    totalSales: normalizeNumeric(totalSales),
    creditSalesTotal: normalizeNumeric(creditSalesTotal),
    expectedCollection: normalizeNumeric(expectedCollection),
  };
};

export const saveSessionPayment = async (sessionId, paymentData) => {
  const { cashCollected, upiCollected, cardCollected, closingReadings } = paymentData;

  const cashNum = normalizeNumeric(cashCollected) ?? 0;
  const upiNum = normalizeNumeric(upiCollected) ?? 0;
  const cardNum = normalizeNumeric(cardCollected) ?? 0;

  if (cashNum < 0 || upiNum < 0 || cardNum < 0) {
    throw createHttpError('Payment amounts cannot be negative', 400);
  }

  return withTransaction(async (tx) => {
    // Get reconciliation data
    const reconciliation = await calculateSessionPaymentReconciliation(sessionId, closingReadings);

    const totalCollected = cashNum + upiNum + cardNum;
    const difference = totalCollected - reconciliation.expectedCollection;

    // Check if payment already exists
    const { rows: existingRows } = await tx.query(
      `SELECT id FROM session_payments WHERE unit_session_id = $1`,
      [sessionId]
    );

    if (existingRows.length) {
      // Update existing payment
      const { rows } = await tx.query(
        `
          UPDATE session_payments
          SET cash_collected = $1,
              upi_collected = $2,
              card_collected = $3,
              total_collected = $4,
              total_sales = $5,
              credit_sales_total = $6,
              expected_collection = $7,
              difference = $8,
              reconciled = TRUE,
              updated_at = NOW()
          WHERE unit_session_id = $9
          RETURNING *
        `,
        [
          cashNum,
          upiNum,
          cardNum,
          totalCollected,
          reconciliation.totalSales,
          reconciliation.creditSalesTotal,
          reconciliation.expectedCollection,
          difference,
          sessionId,
        ]
      );

      return mapSessionPayment(rows[0]);
    } else {
      // Create new payment
      const { rows } = await tx.query(
        `
          INSERT INTO session_payments 
          (unit_session_id, cash_collected, upi_collected, card_collected, total_collected, 
           total_sales, credit_sales_total, expected_collection, difference, reconciled)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
          RETURNING *
        `,
        [
          sessionId,
          cashNum,
          upiNum,
          cardNum,
          totalCollected,
          reconciliation.totalSales,
          reconciliation.creditSalesTotal,
          reconciliation.expectedCollection,
          difference,
        ]
      );

      return mapSessionPayment(rows[0]);
    }
  });
};

export const getSessionPayment = async (sessionId) => {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT * FROM session_payments WHERE unit_session_id = $1`,
    [sessionId]
  );

  return rows[0] ? mapSessionPayment(rows[0]) : null;
};

export const getSessionPaymentBySessionId = async (sessionId) => {
  return getSessionPayment(sessionId);
};

const mapSessionPayment = (row) => ({
  id: row.id,
  unitSessionId: row.unit_session_id,
  cashCollected: normalizeNumeric(row.cash_collected),
  upiCollected: normalizeNumeric(row.upi_collected),
  cardCollected: normalizeNumeric(row.card_collected),
  totalCollected: normalizeNumeric(row.total_collected),
  totalSales: normalizeNumeric(row.total_sales),
  creditSalesTotal: normalizeNumeric(row.credit_sales_total),
  expectedCollection: normalizeNumeric(row.expected_collection),
  difference: normalizeNumeric(row.difference),
  reconciled: row.reconciled,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
