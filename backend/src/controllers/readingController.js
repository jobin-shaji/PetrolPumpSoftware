import Nozzle from '../models/Nozzle.js';
import NozzleReading from '../models/NozzleReading.js';
import Shift from '../models/Shift.js';
import asyncHandler from '../utils/asyncHandler.js';
import { decreaseTankLevel } from '../services/stockService.js';

export const createReading = asyncHandler(async (req, res) => {
  const { nozzleId, shiftId, openingReading, closingReading, pricePerLitre } = req.body;

  if (
    !nozzleId ||
    !shiftId ||
    openingReading === undefined ||
    closingReading === undefined ||
    pricePerLitre === undefined
  ) {
    const error = new Error('Nozzle, shift, readings, and price are required');
    error.statusCode = 400;
    throw error;
  }

  if (Number(closingReading) <= Number(openingReading)) {
    const error = new Error('Closing reading must be greater than opening reading');
    error.statusCode = 400;
    throw error;
  }

  if (Number(pricePerLitre) <= 0) {
    const error = new Error('Price per litre must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const [nozzle, shift, existingReading] = await Promise.all([
    Nozzle.findOne({ _id: nozzleId, isActive: true }).populate('tank'),
    Shift.findOne({ _id: shiftId, status: 'active' }).populate('unit', 'name'),
    NozzleReading.findOne({ nozzle: nozzleId, shift: shiftId }),
  ]);

  if (!nozzle) {
    const error = new Error('Selected nozzle is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (!shift) {
    const error = new Error('Selected shift is invalid or closed');
    error.statusCode = 400;
    throw error;
  }

  if (!nozzle.unit || nozzle.unit.toString() !== shift.unit._id.toString()) {
    const error = new Error('Nozzle does not belong to the selected shift unit');
    error.statusCode = 400;
    throw error;
  }

  if (req.user.role === 'pumper') {
    const assignedUnitId = req.user.assignedUnit?._id?.toString();

    if (!assignedUnitId || assignedUnitId !== shift.unit._id.toString()) {
      const error = new Error('Pumpers can only record readings for their assigned unit');
      error.statusCode = 403;
      throw error;
    }
  }

  if (existingReading) {
    const error = new Error('A reading already exists for this nozzle in the selected shift');
    error.statusCode = 400;
    throw error;
  }

  const litresSold = Number(closingReading) - Number(openingReading);
  const totalAmount = litresSold * Number(pricePerLitre);

  await decreaseTankLevel(nozzle.tank._id, litresSold);

  const reading = await NozzleReading.create({
    nozzle: nozzle._id,
    shift: shift._id,
    openingReading: Number(openingReading),
    closingReading: Number(closingReading),
    litresSold,
    pricePerLitre: Number(pricePerLitre),
    totalAmount,
    recordedBy: req.user._id,
  });

  const populatedReading = await NozzleReading.findById(reading._id)
    .populate({
      path: 'nozzle',
      populate: {
        path: 'tank',
        populate: { path: 'fuelType', select: 'name' },
      },
    })
    .populate({
      path: 'shift',
      populate: { path: 'unit', select: 'name' },
    })
    .populate('recordedBy', 'name role');

  res.status(201).json(populatedReading);
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

  if (req.user.role === 'pumper') {
    const assignedUnitId = req.user.assignedUnit?._id?.toString();
    readings = readings.filter(
      (reading) => reading.shift?.unit?._id?.toString() === assignedUnitId
    );
  }

  res.json(readings);
});
