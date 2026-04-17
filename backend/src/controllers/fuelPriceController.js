import { getDb } from '../config/db.js';
import { getFuelTypeById, listCurrentFuelPrices, upsertDailyFuelPrice } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCurrentFuelPrices = asyncHandler(async (_req, res) => {
  const db = getDb();
  const prices = await listCurrentFuelPrices(db);
  res.json(prices);
});

export const saveFuelPrice = asyncHandler(async (req, res) => {
  const { fuelTypeId, pricePerLitre } = req.body;

  if (!fuelTypeId || pricePerLitre === undefined) {
    const error = new Error('Fuel type and price are required');
    error.statusCode = 400;
    throw error;
  }

  if (Number(pricePerLitre) <= 0) {
    const error = new Error('Price must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  const fuelType = await getFuelTypeById(db, fuelTypeId);

  if (!fuelType || fuelType.isActive === false) {
    const error = new Error('Selected fuel type is invalid');
    error.statusCode = 400;
    throw error;
  }

  await upsertDailyFuelPrice(db, {
    fuelTypeId,
    pricePerLitre: Number(pricePerLitre),
    updatedByUserId: req.user._id,
  });

  const prices = await listCurrentFuelPrices(db);
  res.status(201).json(prices);
});