import PumpUnit from '../models/PumpUnit.js';
import Shift from '../models/Shift.js';
import asyncHandler from '../utils/asyncHandler.js';

const resolveShiftUnit = async (req, unitId) => {
  if (req.user.role === 'pumper') {
    const assignedUnitId = req.user.assignedUnit?._id?.toString();

    if (!assignedUnitId) {
      const error = new Error('Pumper does not have an assigned unit');
      error.statusCode = 400;
      throw error;
    }

    if (unitId && unitId.toString() !== assignedUnitId) {
      const error = new Error('Pumpers can only manage shifts for their assigned unit');
      error.statusCode = 403;
      throw error;
    }

    return assignedUnitId;
  }

  return unitId;
};

export const startShift = asyncHandler(async (req, res) => {
  const resolvedUnitId = await resolveShiftUnit(req, req.body.unitId);

  if (!resolvedUnitId) {
    const error = new Error('Unit is required to start a shift');
    error.statusCode = 400;
    throw error;
  }

  const unit = await PumpUnit.findOne({ _id: resolvedUnitId, isActive: true });

  if (!unit) {
    const error = new Error('Selected unit is invalid');
    error.statusCode = 400;
    throw error;
  }

  const existingShift = await Shift.findOne({
    unit: resolvedUnitId,
    status: 'active',
  });

  if (existingShift) {
    const error = new Error('An active shift already exists for this unit');
    error.statusCode = 400;
    throw error;
  }

  const shift = await Shift.create({
    unit: resolvedUnitId,
    startedBy: req.user._id,
  });

  const populatedShift = await Shift.findById(shift._id)
    .populate('unit', 'name')
    .populate('startedBy', 'name role');

  res.status(201).json(populatedShift);
});

export const endShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.id, status: 'active' }).populate(
    'unit',
    'name'
  );

  if (!shift) {
    const error = new Error('Active shift not found');
    error.statusCode = 404;
    throw error;
  }

  if (req.user.role === 'pumper') {
    const assignedUnitId = req.user.assignedUnit?._id?.toString();

    if (!assignedUnitId || shift.unit._id.toString() !== assignedUnitId) {
      const error = new Error('Pumpers can only end shifts for their assigned unit');
      error.statusCode = 403;
      throw error;
    }
  }

  shift.status = 'closed';
  shift.endTime = new Date();
  shift.endedBy = req.user._id;
  await shift.save();

  const updatedShift = await Shift.findById(shift._id)
    .populate('unit', 'name')
    .populate('startedBy', 'name role')
    .populate('endedBy', 'name role');

  res.json(updatedShift);
});

export const getShifts = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.user.role === 'pumper') {
    if (!req.user.assignedUnit?._id) {
      return res.json([]);
    }

    filter.unit = req.user.assignedUnit._id;
  } else if (req.query.unitId) {
    filter.unit = req.query.unitId;
  }

  const shifts = await Shift.find(filter)
    .populate('unit', 'name')
    .populate('startedBy', 'name role')
    .populate('endedBy', 'name role')
    .sort({ startTime: -1 });

  res.json(shifts);
});
