import PumpUnit from '../models/PumpUnit.js';
import Shift from '../models/Shift.js';
import UnitSession from '../models/UnitSession.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assignNozzlesToUnit, clearUnitNozzles } from '../services/unitService.js';

export const createUnit = asyncHandler(async (req, res) => {
  const { name, nozzleIds = [] } = req.body;

  if (!name) {
    const error = new Error('Unit name is required');
    error.statusCode = 400;
    throw error;
  }

  const existingUnit = await PumpUnit.findOne({ name: name.trim() });

  if (existingUnit) {
    const error = new Error('Unit name already exists');
    error.statusCode = 400;
    throw error;
  }

  const unit = await PumpUnit.create({
    name,
    nozzles: [],
    status: 'available',
  });

  await assignNozzlesToUnit(unit._id, nozzleIds);

  const populatedUnit = await PumpUnit.findById(unit._id).populate({
    path: 'nozzles',
    populate: {
      path: 'tank',
      populate: { path: 'fuelType', select: 'name' },
    },
  })
    .populate('assignedTo', 'name email role')
    .populate('activeSession', 'status startTime pumpOperator');

  res.status(201).json(populatedUnit);
});

export const getUnits = asyncHandler(async (_req, res) => {
  const units = await PumpUnit.find({ isActive: true })
    .populate({
      path: 'nozzles',
      populate: {
        path: 'tank',
        populate: { path: 'fuelType', select: 'name description' },
      },
    })
    .populate('assignedTo', 'name email role')
    .populate({
      path: 'activeSession',
      populate: { path: 'pumpOperator', select: 'name email role' },
    })
    .sort({ name: 1 });

  res.json(units);
});

export const updateUnit = asyncHandler(async (req, res) => {
  const unit = await PumpUnit.findOne({ _id: req.params.id, isActive: true });

  if (!unit) {
    const error = new Error('Unit not found');
    error.statusCode = 404;
    throw error;
  }

  if (unit.status === 'occupied' && req.body.nozzleIds) {
    const error = new Error('Cannot reconfigure nozzles while a unit session is active');
    error.statusCode = 400;
    throw error;
  }

  if (req.body.name && req.body.name !== unit.name) {
    const existingUnit = await PumpUnit.findOne({
      name: req.body.name.trim(),
      _id: { $ne: unit._id },
    });

    if (existingUnit) {
      const error = new Error('Another unit already uses that name');
      error.statusCode = 400;
      throw error;
    }

    unit.name = req.body.name;
    await unit.save();
  }

  if (req.body.nozzleIds) {
    await assignNozzlesToUnit(unit._id, req.body.nozzleIds);
  }

  const updatedUnit = await PumpUnit.findById(unit._id).populate({
    path: 'nozzles',
    populate: {
      path: 'tank',
      populate: { path: 'fuelType', select: 'name description' },
    },
  })
    .populate('assignedTo', 'name email role')
    .populate({
      path: 'activeSession',
      populate: { path: 'pumpOperator', select: 'name email role' },
    });

  res.json(updatedUnit);
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const unit = await PumpUnit.findOne({ _id: req.params.id, isActive: true });

  if (!unit) {
    const error = new Error('Unit not found');
    error.statusCode = 404;
    throw error;
  }

  const [openSession, activeShift] = await Promise.all([
    UnitSession.findOne({ unit: unit._id, status: 'open' }),
    Shift.findOne({ unit: unit._id, status: 'active' }),
  ]);

  if (unit.status === 'occupied' || openSession || activeShift) {
    const error = new Error('Unit cannot be deleted while an active session or shift exists');
    error.statusCode = 400;
    throw error;
  }

  await clearUnitNozzles(unit._id);
  unit.nozzles = [];
  unit.isActive = false;
  await unit.save();

  res.json({ message: 'Unit deleted successfully' });
});
