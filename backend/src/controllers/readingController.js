import { getDb } from '../config/db.js';
import { listReadings } from '../services/dataService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createReading = asyncHandler(async (req, res) => {
  res.status(410).json({
    message: 'Nozzle readings are now stored through the unit session start/end workflow',
  });
});

export const getReadings = asyncHandler(async (req, res) => {
  const db = getDb();
  const readings = await listReadings(db, {
    shiftId: req.query.shiftId || null,
    nozzleId: req.query.nozzleId || null,
    pumpOperatorId: req.user.role === 'pumpOperator' ? req.user._id : null,
  });

  res.json(readings);
});
