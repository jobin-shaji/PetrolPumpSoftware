import FuelType from '../models/FuelType.js';
import Tank from '../models/Tank.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createFuelType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    const error = new Error('Fuel type name is required');
    error.statusCode = 400;
    throw error;
  }

  const existingFuelType = await FuelType.findOne({ name: name.trim() });

  if (existingFuelType) {
    const error = new Error('Fuel type already exists');
    error.statusCode = 400;
    throw error;
  }

  const fuelType = await FuelType.create({
    name,
    description,
  });

  res.status(201).json(fuelType);
});

export const getFuelTypes = asyncHandler(async (_req, res) => {
  const fuelTypes = await FuelType.find({ isActive: true }).sort({ name: 1 });
  res.json(fuelTypes);
});

export const updateFuelType = asyncHandler(async (req, res) => {
  const fuelType = await FuelType.findOne({ _id: req.params.id, isActive: true });

  if (!fuelType) {
    const error = new Error('Fuel type not found');
    error.statusCode = 404;
    throw error;
  }

  const { name, description } = req.body;

  if (name && name !== fuelType.name) {
    const existingFuelType = await FuelType.findOne({
      name: name.trim(),
      _id: { $ne: fuelType._id },
    });

    if (existingFuelType) {
      const error = new Error('Another fuel type already uses that name');
      error.statusCode = 400;
      throw error;
    }

    fuelType.name = name;
  }

  if (description !== undefined) {
    fuelType.description = description;
  }

  await fuelType.save();
  res.json(fuelType);
});

export const deleteFuelType = asyncHandler(async (req, res) => {
  const fuelType = await FuelType.findOne({ _id: req.params.id, isActive: true });

  if (!fuelType) {
    const error = new Error('Fuel type not found');
    error.statusCode = 404;
    throw error;
  }

  const linkedTank = await Tank.findOne({ fuelType: fuelType._id, isActive: true });

  if (linkedTank) {
    const error = new Error('Cannot delete a fuel type that is linked to an active tank');
    error.statusCode = 400;
    throw error;
  }

  fuelType.isActive = false;
  await fuelType.save();
  res.json({ message: 'Fuel type deleted successfully' });
});
