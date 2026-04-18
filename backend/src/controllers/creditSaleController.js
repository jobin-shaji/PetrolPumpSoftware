import asyncHandler from '../utils/asyncHandler.js';
import {
  listCreditSales,
  getCreditSaleById,
  createCreditSale,
  getSessionCreditSales,
} from '../services/creditSaleService.js';

export const listAll = asyncHandler(async (req, res) => {
  const { sessionId, customerId } = req.query;
  const sales = await listCreditSales({ sessionId, customerId });
  res.json(sales);
});

export const getById = asyncHandler(async (req, res) => {
  const sale = await getCreditSaleById(req.params.id);

  if (!sale) {
    const error = new Error('Credit sale not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(sale);
});

export const create = asyncHandler(async (req, res) => {
  const { unitSessionId, nozzleId, customerId, litres, pricePerLitre } = req.body;

  const sale = await createCreditSale({
    unitSessionId,
    nozzleId,
    customerId,
    litres,
    pricePerLitre,
  });

  res.status(201).json(sale);
});

export const listBySession = asyncHandler(async (req, res) => {
  const sales = await getSessionCreditSales(req.params.sessionId);
  res.json(sales);
});
