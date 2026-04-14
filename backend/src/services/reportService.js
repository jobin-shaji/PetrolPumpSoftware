import { getDb } from '../config/db.js';
import { normalizeNumeric } from '../db/helpers.js';

export const parseDateRange = (query) => {
  const { date, startDate, endDate } = query;

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = startDate ? new Date(startDate) : new Date('1970-01-01');
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getProfitSummary = async (query) => {
  const { start, end } = parseDateRange(query);

  const db = getDb();

  const [{ rows: salesRows }, { rows: purchaseRows }] = await Promise.all([
    db.query(
      `
        SELECT
          COALESCE(SUM(r.total_amount), 0) AS revenue,
          COALESCE(SUM(r.litres_sold), 0) AS "litresSold"
        FROM unit_session_nozzle_readings r
        WHERE r.closed_at >= $1
          AND r.closed_at <= $2
          AND r.closing_reading IS NOT NULL
      `,
      [start, end]
    ),
    db.query(
      `
        SELECT
          COALESCE(SUM(p.total_cost), 0) AS cost,
          COALESCE(SUM(p.quantity_litres), 0) AS "litresPurchased"
        FROM purchases p
        WHERE p.is_deleted = FALSE
          AND p.date >= $1
          AND p.date <= $2
      `,
      [start, end]
    ),
  ]);

  const revenue = normalizeNumeric(salesRows[0]?.revenue) || 0;
  const cost = normalizeNumeric(purchaseRows[0]?.cost) || 0;
  const litresSold = normalizeNumeric(salesRows[0]?.litresSold) || 0;
  const litresPurchased = normalizeNumeric(purchaseRows[0]?.litresPurchased) || 0;

  return {
    range: { start, end },
    revenue,
    cost,
    profit: revenue - cost,
    litresSold,
    litresPurchased,
  };
};

export const getDailyReport = async (query) => {
  const { start, end } = parseDateRange(query);

  const db = getDb();

  const [{ rows: salesRows }, { rows: purchaseRows }] = await Promise.all([
    db.query(
      `
        SELECT
          TO_CHAR(r.closed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COALESCE(SUM(r.total_amount), 0) AS revenue,
          COALESCE(SUM(r.litres_sold), 0) AS "litresSold"
        FROM unit_session_nozzle_readings r
        WHERE r.closed_at >= $1
          AND r.closed_at <= $2
          AND r.closing_reading IS NOT NULL
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      [start, end]
    ),
    db.query(
      `
        SELECT
          TO_CHAR(p.date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COALESCE(SUM(p.total_cost), 0) AS cost,
          COALESCE(SUM(p.quantity_litres), 0) AS "litresPurchased"
        FROM purchases p
        WHERE p.is_deleted = FALSE
          AND p.date >= $1
          AND p.date <= $2
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      [start, end]
    ),
  ]);

  const dailyMap = new Map();

  salesRows.forEach((row) => {
    dailyMap.set(row.date, {
      date: row.date,
      revenue: normalizeNumeric(row.revenue) || 0,
      cost: 0,
      profit: normalizeNumeric(row.revenue) || 0,
      litresSold: normalizeNumeric(row.litresSold) || 0,
      litresPurchased: 0,
    });
  });

  purchaseRows.forEach((row) => {
    const existing = dailyMap.get(row.date) || {
      date: row.date,
      revenue: 0,
      cost: 0,
      profit: 0,
      litresSold: 0,
      litresPurchased: 0,
    };

    existing.cost = normalizeNumeric(row.cost) || 0;
    existing.litresPurchased = normalizeNumeric(row.litresPurchased) || 0;
    existing.profit = existing.revenue - existing.cost;
    dailyMap.set(row.date, existing);
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getFuelWiseReport = async (query) => {
  const { start, end } = parseDateRange(query);

  const db = getDb();

  const [{ rows: salesRows }, { rows: purchaseRows }] = await Promise.all([
    db.query(
      `
        SELECT
          ft.name AS "fuelType",
          COALESCE(SUM(r.total_amount), 0) AS revenue,
          COALESCE(SUM(r.litres_sold), 0) AS "litresSold"
        FROM unit_session_nozzle_readings r
        JOIN nozzles n ON n.id = r.nozzle_id
        JOIN tanks t ON t.id = n.tank_id
        JOIN fuel_types ft ON ft.id = t.fuel_type_id
        WHERE r.closed_at >= $1
          AND r.closed_at <= $2
          AND r.closing_reading IS NOT NULL
        GROUP BY ft.name
        ORDER BY ft.name ASC
      `,
      [start, end]
    ),
    db.query(
      `
        SELECT
          ft.name AS "fuelType",
          COALESCE(SUM(p.total_cost), 0) AS cost,
          COALESCE(SUM(p.quantity_litres), 0) AS "litresPurchased"
        FROM purchases p
        JOIN tanks t ON t.id = p.tank_id
        JOIN fuel_types ft ON ft.id = t.fuel_type_id
        WHERE p.is_deleted = FALSE
          AND p.date >= $1
          AND p.date <= $2
        GROUP BY ft.name
        ORDER BY ft.name ASC
      `,
      [start, end]
    ),
  ]);

  const fuelMap = new Map();

  salesRows.forEach((row) => {
    const revenue = normalizeNumeric(row.revenue) || 0;
    fuelMap.set(row.fuelType, {
      fuelType: row.fuelType,
      revenue,
      cost: 0,
      profit: revenue,
      litresSold: normalizeNumeric(row.litresSold) || 0,
      litresPurchased: 0,
    });
  });

  purchaseRows.forEach((row) => {
    const existing = fuelMap.get(row.fuelType) || {
      fuelType: row.fuelType,
      revenue: 0,
      cost: 0,
      profit: 0,
      litresSold: 0,
      litresPurchased: 0,
    };

    existing.cost = normalizeNumeric(row.cost) || 0;
    existing.litresPurchased = normalizeNumeric(row.litresPurchased) || 0;
    existing.profit = existing.revenue - existing.cost;
    fuelMap.set(row.fuelType, existing);
  });

  return Array.from(fuelMap.values()).sort((a, b) => a.fuelType.localeCompare(b.fuelType));
};
