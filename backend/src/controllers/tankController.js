import FuelType from '../models/FuelType.js';
import Nozzle from '../models/Nozzle.js';
import Purchase from '../models/Purchase.js';
import Tank from '../models/Tank.js';
import asyncHandler from '../utils/asyncHandler.js';

const validateTankPayload = async ({ fuelType, capacity, currentLevel }) => {
  if (fuelType) {
    const existingFuelType = await FuelType.findOne({ _id: fuelType, isActive: true });

    if (!existingFuelType) {
      const error = new Error('Selected fuel type is invalid');
      error.statusCode = 400;
      throw error;
    }
  }

  if (capacity !== undefined && Number(capacity) < 0) {
    const error = new Error('Capacity must be zero or greater');
    error.statusCode = 400;
    throw error;
  }

  if (currentLevel !== undefined && Number(currentLevel) < 0) {
    const error = new Error('Current level must be zero or greater');
    error.statusCode = 400;
    throw error;
  }

  if (
    capacity !== undefined &&
    currentLevel !== undefined &&
    Number(currentLevel) > Number(capacity)
  ) {
    const error = new Error('Current level cannot exceed tank capacity');
    error.statusCode = 400;
    throw error;
  }
};

export const createTank = asyncHandler(async (req, res) => {
  const { fuelType, capacity, currentLevel = 0 } = req.body;

  if (!fuelType || capacity === undefined) {
    const error = new Error('Fuel type and capacity are required');
    error.statusCode = 400;
    throw error;
  }

  await validateTankPayload({ fuelType, capacity, currentLevel });

  const tank = await Tank.create({
    fuelType,
    capacity,
    currentLevel,
  });

  const populatedTank = await Tank.findById(tank._id).populate('fuelType', 'name description');
  res.status(201).json(populatedTank);
});

export const getTanks = asyncHandler(async (_req, res) => {
  const tanks = await Tank.find({ isActive: true })
    .populate('fuelType', 'name description')
    .sort({ createdAt: -1 });

  res.json(tanks);
});

export const updateTank = asyncHandler(async (req, res) => {
  const tank = await Tank.findOne({ _id: req.params.id, isActive: true });

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const nextFuelType = req.body.fuelType || tank.fuelType;
  const nextCapacity =
    req.body.capacity !== undefined ? Number(req.body.capacity) : tank.capacity;
  const nextCurrentLevel =
    req.body.currentLevel !== undefined ? Number(req.body.currentLevel) : tank.currentLevel;

  await validateTankPayload({
    fuelType: nextFuelType,
    capacity: nextCapacity,
    currentLevel: nextCurrentLevel,
  });

  tank.fuelType = nextFuelType;
  tank.capacity = nextCapacity;
  tank.currentLevel = nextCurrentLevel;
  await tank.save();

  const updatedTank = await Tank.findById(tank._id).populate('fuelType', 'name description');
  res.json(updatedTank);
});

export const deleteTank = asyncHandler(async (req, res) => {
  const tank = await Tank.findOne({ _id: req.params.id, isActive: true });

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const [linkedNozzle, linkedPurchase] = await Promise.all([
    Nozzle.findOne({ tank: tank._id, isActive: true }),
    Purchase.findOne({ tank: tank._id, isDeleted: false }),
  ]);

  if (linkedNozzle || linkedPurchase) {
    const error = new Error('Tank cannot be deleted while linked to nozzles or purchases');
    error.statusCode = 400;
    throw error;
  }

  tank.isActive = false;
  await tank.save();
  res.json({ message: 'Tank deleted successfully' });
});
