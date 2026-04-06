import Purchase from '../models/Purchase.js';
import Tank from '../models/Tank.js';
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

  const tank = await Tank.findOne({ _id: tankId, isActive: true }).populate('fuelType');

  if (!tank) {
    const error = new Error('Selected tank is invalid');
    error.statusCode = 400;
    throw error;
  }

  const totalCost = Number(quantityLitres) * Number(pricePerLitre);
  await increaseTankLevel(tank._id, Number(quantityLitres));

  const purchase = await Purchase.create({
    tank: tank._id,
    quantityLitres: Number(quantityLitres),
    pricePerLitre: Number(pricePerLitre),
    totalCost,
    supplier,
    invoiceNumber,
    date: date ? new Date(date) : new Date(),
    enteredBy: req.user._id,
  });

  const populatedPurchase = await Purchase.findById(purchase._id)
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name' },
    })
    .populate('enteredBy', 'name role');

  res.status(201).json(populatedPurchase);
});

export const getPurchases = asyncHandler(async (_req, res) => {
  const purchases = await Purchase.find({ isDeleted: false })
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name description' },
    })
    .populate('enteredBy', 'name role')
    .sort({ date: -1 });

  res.json(purchases);
});
