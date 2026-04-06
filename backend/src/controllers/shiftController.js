import Shift from '../models/Shift.js';
import asyncHandler from '../utils/asyncHandler.js';

export const startShift = asyncHandler(async (req, res) => {
  res.status(410).json({
    message: 'Shift start is now handled by POST /api/unit-session/start',
  });
});

export const endShift = asyncHandler(async (req, res) => {
  res.status(410).json({
    message: 'Shift end is now handled by POST /api/unit-session/end',
  });
});

export const getShifts = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.user.role === 'pumpOperator') {
    filter.startedBy = req.user._id;
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
