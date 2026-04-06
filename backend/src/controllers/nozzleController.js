import Nozzle from '../models/Nozzle.js';
import NozzleReading from '../models/NozzleReading.js';
import PumpUnit from '../models/PumpUnit.js';
import Tank from '../models/Tank.js';
import asyncHandler from '../utils/asyncHandler.js';
import { refreshUnitNozzles } from '../services/unitService.js';

const validateReferences = async (tankId, unitId) => {
  const tank = await Tank.findOne({ _id: tankId, isActive: true });

  if (!tank) {
    const error = new Error('Selected tank is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (unitId) {
    const unit = await PumpUnit.findOne({ _id: unitId, isActive: true });

    if (!unit) {
      const error = new Error('Selected unit is invalid');
      error.statusCode = 400;
      throw error;
    }

    if (unit.status === 'occupied') {
      const error = new Error('Cannot assign a nozzle to an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }
};

export const createNozzle = asyncHandler(async (req, res) => {
  const { tank, nozzleNumber, unit } = req.body;

  if (!tank || !nozzleNumber) {
    const error = new Error('Tank and nozzle number are required');
    error.statusCode = 400;
    throw error;
  }

  await validateReferences(tank, unit);

  const existingNozzle = await Nozzle.findOne({ nozzleNumber: nozzleNumber.trim() });

  if (existingNozzle) {
    const error = new Error('Nozzle number already exists');
    error.statusCode = 400;
    throw error;
  }

  const nozzle = await Nozzle.create({
    tank,
    nozzleNumber,
    unit: unit || null,
  });

  if (unit) {
    await refreshUnitNozzles(unit);
  }

  const populatedNozzle = await Nozzle.findById(nozzle._id)
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name' },
    })
    .populate('unit', 'name');

  res.status(201).json(populatedNozzle);
});

export const getNozzles = asyncHandler(async (_req, res) => {
  const nozzles = await Nozzle.find({ isActive: true })
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name description' },
    })
    .populate('unit', 'name')
    .sort({ nozzleNumber: 1 });

  res.json(nozzles);
});

export const updateNozzle = asyncHandler(async (req, res) => {
  const nozzle = await Nozzle.findOne({ _id: req.params.id, isActive: true });

  if (!nozzle) {
    const error = new Error('Nozzle not found');
    error.statusCode = 404;
    throw error;
  }

  const nextTank = req.body.tank || nozzle.tank;
  const nextUnit = req.body.unit !== undefined ? req.body.unit : nozzle.unit;
  await validateReferences(nextTank, nextUnit);

  if (req.body.nozzleNumber && req.body.nozzleNumber !== nozzle.nozzleNumber) {
    const existingNozzle = await Nozzle.findOne({
      nozzleNumber: req.body.nozzleNumber.trim(),
      _id: { $ne: nozzle._id },
    });

    if (existingNozzle) {
      const error = new Error('Another nozzle already uses that number');
      error.statusCode = 400;
      throw error;
    }
  }

  const previousUnitId = nozzle.unit?.toString() || null;

  if (previousUnitId && previousUnitId !== nextUnit?.toString()) {
    const previousUnit = await PumpUnit.findOne({ _id: previousUnitId, isActive: true });

    if (previousUnit?.status === 'occupied') {
      const error = new Error('Cannot move a nozzle out of an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }

  nozzle.tank = nextTank;
  nozzle.unit = nextUnit || null;

  if (req.body.nozzleNumber) {
    nozzle.nozzleNumber = req.body.nozzleNumber;
  }

  await nozzle.save();

  const unitIds = [previousUnitId, nozzle.unit?.toString()].filter(Boolean);
  await Promise.all([...new Set(unitIds)].map((item) => refreshUnitNozzles(item)));

  const updatedNozzle = await Nozzle.findById(nozzle._id)
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name description' },
    })
    .populate('unit', 'name');

  res.json(updatedNozzle);
});

export const deleteNozzle = asyncHandler(async (req, res) => {
  const nozzle = await Nozzle.findOne({ _id: req.params.id, isActive: true });

  if (!nozzle) {
    const error = new Error('Nozzle not found');
    error.statusCode = 404;
    throw error;
  }

  const reading = await NozzleReading.findOne({ nozzle: nozzle._id });

  if (reading) {
    const error = new Error('Nozzle cannot be deleted because financial readings exist');
    error.statusCode = 400;
    throw error;
  }

  const previousUnitId = nozzle.unit?.toString() || null;

  if (previousUnitId) {
    const previousUnit = await PumpUnit.findOne({ _id: previousUnitId, isActive: true });

    if (previousUnit?.status === 'occupied') {
      const error = new Error('Cannot delete a nozzle from an occupied unit');
      error.statusCode = 400;
      throw error;
    }
  }

  nozzle.isActive = false;
  nozzle.unit = null;
  await nozzle.save();

  if (previousUnitId) {
    await refreshUnitNozzles(previousUnitId);
  }

  res.json({ message: 'Nozzle deleted successfully' });
});
