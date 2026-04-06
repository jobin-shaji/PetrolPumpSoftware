import Assignment from '../models/Assignment.js';
import PumpUnit from '../models/PumpUnit.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const assignPumperToUnit = asyncHandler(async (req, res) => {
  const { pumperId, unitId } = req.body;

  if (!pumperId || !unitId) {
    const error = new Error('Pumper and unit are required');
    error.statusCode = 400;
    throw error;
  }

  const [pumper, unit] = await Promise.all([
    User.findOne({ _id: pumperId, role: 'pumper', isActive: true }),
    PumpUnit.findOne({ _id: unitId, isActive: true }),
  ]);

  if (!pumper) {
    const error = new Error('Selected employee is not an active pumper');
    error.statusCode = 400;
    throw error;
  }

  if (!unit) {
    const error = new Error('Selected unit is invalid');
    error.statusCode = 400;
    throw error;
  }

  await Assignment.updateMany({ pumper: pumper._id, active: true }, { $set: { active: false } });

  pumper.assignedUnit = unit._id;
  await pumper.save();

  const assignment = await Assignment.create({
    pumper: pumper._id,
    unit: unit._id,
    assignedBy: req.user._id,
  });

  const populatedAssignment = await Assignment.findById(assignment._id)
    .populate('pumper', 'name email role')
    .populate('unit', 'name')
    .populate('assignedBy', 'name');

  res.status(201).json(populatedAssignment);
});
