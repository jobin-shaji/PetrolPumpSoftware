import NozzleReading from '../models/NozzleReading.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createReading = asyncHandler(async (req, res) => {
  res.status(410).json({
    message: 'Nozzle readings are now stored through the unit session start/end workflow',
  });
});

export const getReadings = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.shiftId) {
    filter.shift = req.query.shiftId;
  }

  if (req.query.nozzleId) {
    filter.nozzle = req.query.nozzleId;
  }

  let readings = await NozzleReading.find(filter)
    .populate({
      path: 'nozzle',
      populate: {
        path: 'tank',
        populate: { path: 'fuelType', select: 'name description' },
      },
    })
    .populate({
      path: 'shift',
      populate: { path: 'unit', select: 'name' },
    })
    .populate('recordedBy', 'name role')
    .sort({ timestamp: -1 });

  if (req.user.role === 'pumpOperator') {
    readings = readings.filter(
      (reading) => reading.recordedBy?._id?.toString() === req.user._id.toString()
    );
  }

  res.json(readings);
});
