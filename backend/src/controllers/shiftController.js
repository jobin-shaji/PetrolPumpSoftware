import { getDb } from '../config/db.js';
import { listShifts } from '../services/dataService.js';
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
  const db = getDb();

  const shifts = await listShifts(db, {
    status: req.query.status || null,
    unitId: req.user.role === 'pumpOperator' ? null : req.query.unitId || null,
    startedByUserId: req.user.role === 'pumpOperator' ? req.user._id : null,
  });

  res.json(shifts);
});
