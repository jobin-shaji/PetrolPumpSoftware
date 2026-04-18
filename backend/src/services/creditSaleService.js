import { getDb, withTransaction } from '../config/db.js';
import { createHttpError, normalizeNumeric } from '../db/helpers.js';
import { updateCustomerBalance } from './customerService.js';

export const listCreditSales = async (filters = {}) => {
  const db = getDb();
  const { sessionId, customerId } = filters;

  let query = `
    SELECT 
      cs.id,
      cs.unit_session_id,
      cs.nozzle_id,
      cs.customer_id,
      cs.litres,
      cs.price_per_litre,
      cs.total_amount,
      cs.created_at,
      c.name as customer_name,
      c.phone as customer_phone,
      n.nozzle_number,
      ft.name as fuel_type_name
    FROM credit_sales cs
    JOIN customers c ON cs.customer_id = c.id
    JOIN nozzles n ON cs.nozzle_id = n.id
    JOIN tanks t ON n.tank_id = t.id
    JOIN fuel_types ft ON t.fuel_type_id = ft.id
    WHERE 1=1
  `;
  const params = [];

  if (sessionId) {
    query += ` AND cs.unit_session_id = $${params.length + 1}`;
    params.push(sessionId);
  }

  if (customerId) {
    query += ` AND cs.customer_id = $${params.length + 1}`;
    params.push(customerId);
  }

  query += ` ORDER BY cs.created_at DESC`;

  const { rows } = await db.query(query, params);
  return rows.map(mapCreditSale);
};

export const getCreditSaleById = async (id) => {
  const db = getDb();
  const { rows } = await db.query(
    `
      SELECT 
        cs.*,
        c.name as customer_name,
        c.phone as customer_phone,
        n.nozzle_number,
        ft.name as fuel_type_name
      FROM credit_sales cs
      JOIN customers c ON cs.customer_id = c.id
      JOIN nozzles n ON cs.nozzle_id = n.id
      JOIN tanks t ON n.tank_id = t.id
      JOIN fuel_types ft ON t.fuel_type_id = ft.id
      WHERE cs.id = $1
    `,
    [id]
  );

  return rows[0] ? mapCreditSale(rows[0]) : null;
};

export const createCreditSale = async (data) => {
  const { unitSessionId, nozzleId, customerId, litres, pricePerLitre } = data;

  // Validation
  if (!unitSessionId || !nozzleId || !customerId) {
    throw createHttpError('Session, nozzle, and customer are required', 400);
  }

  const litresNum = normalizeNumeric(litres);
  if (!litresNum || litresNum <= 0) {
    throw createHttpError('Litres must be greater than zero', 400);
  }

  const priceNum = normalizeNumeric(pricePerLitre);
  if (!priceNum || priceNum <= 0) {
    throw createHttpError('Price per litre must be greater than zero', 400);
  }

  const totalAmount = litresNum * priceNum;

  return withTransaction(async (tx) => {
    // Verify session exists and is open
    const { rows: sessionRows } = await tx.query(
      `SELECT id FROM unit_sessions WHERE id = $1 AND status = 'open'`,
      [unitSessionId]
    );

    if (!sessionRows.length) {
      throw createHttpError('Session not found or is already closed', 404);
    }

    // Verify customer exists and has credit limit
    const { rows: customerRows } = await tx.query(
      `SELECT id, current_balance, credit_limit FROM customers WHERE id = $1 AND is_active = TRUE`,
      [customerId]
    );

    if (!customerRows.length) {
      throw createHttpError('Customer not found or is inactive', 404);
    }

    const customer = customerRows[0];
    const newBalance = normalizeNumeric(customer.current_balance) + totalAmount;
    const creditLimit = normalizeNumeric(customer.credit_limit);

    if (newBalance > creditLimit) {
      throw createHttpError(
        `Credit limit exceeded. Remaining limit: ₹${(creditLimit - normalizeNumeric(customer.current_balance)).toFixed(2)}`,
        400
      );
    }

    // Verify nozzle exists
    const { rows: nozzleRows } = await tx.query(
      `SELECT id FROM nozzles WHERE id = $1 AND is_active = TRUE`,
      [nozzleId]
    );

    if (!nozzleRows.length) {
      throw createHttpError('Nozzle not found or is inactive', 404);
    }

    // Create credit sale
    const { rows: saleRows } = await tx.query(
      `
        INSERT INTO credit_sales (unit_session_id, nozzle_id, customer_id, litres, price_per_litre, total_amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [unitSessionId, nozzleId, customerId, litresNum, priceNum, totalAmount]
    );

    // Update customer balance and log transaction
    await tx.query(
      `UPDATE customers SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`,
      [totalAmount, customerId]
    );

    await tx.query(
      `INSERT INTO credit_transactions (customer_id, credit_sale_id, transaction_type, amount, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [customerId, saleRows[0].id, 'debit', totalAmount, 'Credit sale']
    );

    return mapCreditSale(saleRows[0]);
  });
};

export const getSessionCreditTotal = async (sessionId) => {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM credit_sales WHERE unit_session_id = $1`,
    [sessionId]
  );

  return normalizeNumeric(rows[0]?.total) ?? 0;
};

export const getSessionCreditSales = async (sessionId) => {
  return listCreditSales({ sessionId });
};

const mapCreditSale = (row) => ({
  id: row.id,
  unitSessionId: row.unit_session_id,
  nozzleId: row.nozzle_id,
  customerId: row.customer_id,
  litres: normalizeNumeric(row.litres),
  pricePerLitre: normalizeNumeric(row.price_per_litre),
  totalAmount: normalizeNumeric(row.total_amount),
  createdAt: row.created_at,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  nozzleNumber: row.nozzle_number,
  fuelTypeName: row.fuel_type_name,
});
