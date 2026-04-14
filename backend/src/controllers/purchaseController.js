import { getDb, withTransaction } from '../config/db.js';
import { mapId } from '../db/helpers.js';
import { getPurchaseById, listPurchases } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { increaseTankLevel } from '../services/stockService.js';

export const createPurchase = asyncHandler(async (req, res) => {
  const { tankId, quantityLitres, pricePerLitre, supplier, invoiceNumber, date } = req.body;

  if (!tankId || quantityLitres === undefined || pricePerLitre === undefined) {
    const error = new Error('Tank, quantity, and price are required');
    error.statusCode = 400;
    throw error;
  }

  if (Number(quantityLitres) <= 0 || Number(pricePerLitre) <= 0) {
    const error = new Error('Quantity and price must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const totalCost = Number(quantityLitres) * Number(pricePerLitre);
  const db = getDb();

  const purchaseId = await withTransaction(async (tx) => {
    const { rowCount: tankCount } = await tx.query(
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

    await increaseTankLevel(tankId, Number(quantityLitres), { client: tx });

    const { rows } = await tx.query(
      `
        INSERT INTO purchases (
          tank_id,
          quantity_litres,
          price_per_litre,
          total_cost,
          supplier,
          invoice_number,
          date,
          entered_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        tankId,
        Number(quantityLitres),
        Number(pricePerLitre),
        totalCost,
        supplier ?? '',
        invoiceNumber ?? '',
        date ? new Date(date) : new Date(),
        req.user._id,
      ]
    );

    return rows[0]?.id;
  });

  const purchase = await getPurchaseById(db, purchaseId);
  res.status(201).json(purchase ? mapId(purchase) : null);
});

export const getPurchases = asyncHandler(async (_req, res) => {
  const db = getDb();
  const purchases = await listPurchases(db, { includeDeleted: false });
  res.json(purchases);
});
