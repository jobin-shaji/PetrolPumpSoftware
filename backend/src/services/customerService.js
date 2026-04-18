import { getDb, withTransaction } from '../config/db.js';
import { createHttpError, normalizeNumeric } from '../db/helpers.js';

export const listCustomers = async (filters = {}) => {
  const db = getDb();
  const { isActive = true, searchTerm = '' } = filters;

  let query = `
    SELECT id, name, phone, vehicle_number, credit_limit, current_balance, is_active,
           created_at, updated_at
    FROM customers
    WHERE 1=1
  `;
  const params = [];

  if (isActive !== undefined) {
    query += ` AND is_active = $${params.length + 1}`;
    params.push(isActive);
  }

  if (searchTerm) {
    query += ` AND (name ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1} OR vehicle_number ILIKE $${params.length + 1})`;
    const likePattern = `%${searchTerm}%`;
    params.push(likePattern, likePattern, likePattern);
  }

  query += ` ORDER BY name ASC`;

  const { rows } = await db.query(query, params);
  return rows.map(mapCustomer);
};

export const getCustomerById = async (id) => {
  const db = getDb();
  const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
  return rows[0] ? mapCustomer(rows[0]) : null;
};

export const createCustomer = async (data) => {
  const db = getDb();
  const { name, phone, vehicleNumber, creditLimit } = data;

  if (!name || !name.trim()) {
    throw createHttpError('Customer name is required', 400);
  }

  const creditLimitNum = normalizeNumeric(creditLimit) ?? 0;
  if (creditLimitNum < 0) {
    throw createHttpError('Credit limit cannot be negative', 400);
  }

  const { rows } = await db.query(
    `
      INSERT INTO customers (name, phone, vehicle_number, credit_limit, current_balance)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING *
    `,
    [name.trim(), phone || null, vehicleNumber || null, creditLimitNum]
  );

  return mapCustomer(rows[0]);
};

export const updateCustomer = async (id, data) => {
  const db = getDb();
  const { name, phone, vehicleNumber, creditLimit, isActive } = data;

  const customer = await getCustomerById(id);
  if (!customer) {
    throw createHttpError('Customer not found', 404);
  }

  const updates = [];
  const params = [];
  let paramNum = 1;

  if (name !== undefined && name !== null) {
    if (!name.trim()) {
      throw createHttpError('Customer name cannot be empty', 400);
    }
    updates.push(`name = $${paramNum}`);
    params.push(name.trim());
    paramNum++;
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramNum}`);
    params.push(phone || null);
    paramNum++;
  }

  if (vehicleNumber !== undefined) {
    updates.push(`vehicle_number = $${paramNum}`);
    params.push(vehicleNumber || null);
    paramNum++;
  }

  if (creditLimit !== undefined) {
    const creditLimitNum = normalizeNumeric(creditLimit);
    if (creditLimitNum !== null && creditLimitNum < 0) {
      throw createHttpError('Credit limit cannot be negative', 400);
    }
    updates.push(`credit_limit = $${paramNum}`);
    params.push(creditLimitNum ?? 0);
    paramNum++;
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${paramNum}`);
    params.push(isActive);
    paramNum++;
  }

  if (!updates.length) {
    return customer;
  }

  updates.push(`updated_at = NOW()`);

  params.push(id);

  const { rows } = await db.query(
    `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`,
    params
  );

  return mapCustomer(rows[0]);
};

export const updateCustomerBalance = async (customerId, amount, description = '') => {
  return withTransaction(async (tx) => {
    const { rows: balanceRows } = await tx.query(
      `SELECT current_balance FROM customers WHERE id = $1 FOR UPDATE`,
      [customerId]
    );

    if (!balanceRows.length) {
      throw createHttpError('Customer not found', 404);
    }

    const newBalance = normalizeNumeric(balanceRows[0].current_balance) + amount;

    const { rows: updateRows } = await tx.query(
      `UPDATE customers SET current_balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newBalance, customerId]
    );

    // Log transaction
    await tx.query(
      `INSERT INTO credit_transactions (customer_id, transaction_type, amount, description)
       VALUES ($1, $2, $3, $4)`,
      [customerId, amount > 0 ? 'debit' : 'credit', Math.abs(amount), description]
    );

    return mapCustomer(updateRows[0]);
  });
};

const mapCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  vehicleNumber: row.vehicle_number,
  creditLimit: normalizeNumeric(row.credit_limit),
  currentBalance: normalizeNumeric(row.current_balance),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
