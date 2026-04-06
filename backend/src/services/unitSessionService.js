import mongoose from 'mongoose';
import Nozzle from '../models/Nozzle.js';
import NozzleReading from '../models/NozzleReading.js';
import PumpUnit from '../models/PumpUnit.js';
import Shift from '../models/Shift.js';
import UnitSession from '../models/UnitSession.js';
import { decreaseTankLevel } from './stockService.js';

const toObjectIdString = (value) => value?.toString();

const buildReadingMap = (items = [], { requirePrice = false } = {}) => {
  if (!Array.isArray(items) || !items.length) {
    const error = new Error('Reading values are required for all nozzles');
    error.statusCode = 400;
    throw error;
  }

  const readingMap = new Map();

  for (const item of items) {
    const nozzleId = toObjectIdString(item?.nozzleId || item?.nozzle);

    if (!nozzleId) {
      const error = new Error('Each reading must include a nozzle identifier');
      error.statusCode = 400;
      throw error;
    }

    if (readingMap.has(nozzleId)) {
      const error = new Error('Duplicate nozzle readings are not allowed');
      error.statusCode = 400;
      throw error;
    }

    const rawReading = item?.reading;

    if (rawReading === '' || rawReading === null || rawReading === undefined) {
      const error = new Error('Reading values are required for every nozzle');
      error.statusCode = 400;
      throw error;
    }

    const reading = Number(rawReading);

    if (!Number.isFinite(reading) || reading < 0) {
      const error = new Error('Reading values must be zero or greater');
      error.statusCode = 400;
      throw error;
    }

    const normalized = {
      nozzleId,
      reading,
    };

    if (requirePrice) {
      const rawPricePerLitre = item?.pricePerLitre;

      if (
        rawPricePerLitre === '' ||
        rawPricePerLitre === null ||
        rawPricePerLitre === undefined
      ) {
        const error = new Error('Price per litre is required for every nozzle');
        error.statusCode = 400;
        throw error;
      }

      const pricePerLitre = Number(rawPricePerLitre);

      if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
        const error = new Error('Price per litre must be greater than zero');
        error.statusCode = 400;
        throw error;
      }

      normalized.pricePerLitre = pricePerLitre;
    }

    readingMap.set(nozzleId, normalized);
  }

  return readingMap;
};

const ensureCoverage = (readingMap, nozzleIds, message) => {
  const expectedIds = [...new Set(nozzleIds.map((item) => item.toString()))];

  if (!expectedIds.length) {
    const error = new Error('The selected unit does not have any active nozzles');
    error.statusCode = 400;
    throw error;
  }

  if (readingMap.size !== expectedIds.length) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  for (const nozzleId of expectedIds) {
    if (!readingMap.has(nozzleId)) {
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    }
  }
};

const populateUnitSession = (query) =>
  query
    .populate({
      path: 'unit',
      populate: [
        {
          path: 'nozzles',
          populate: {
            path: 'tank',
            populate: { path: 'fuelType', select: 'name description' },
          },
        },
        { path: 'assignedTo', select: 'name email role' },
        { path: 'activeSession', select: 'status startTime pumpOperator' },
      ],
    })
    .populate('pumpOperator', 'name email role')
    .populate('endedBy', 'name email role')
    .populate({
      path: 'shift',
      populate: [
        { path: 'unit', select: 'name' },
        { path: 'startedBy', select: 'name role' },
        { path: 'endedBy', select: 'name role' },
      ],
    })
    .populate({
      path: 'openingReadings.nozzle',
      select: 'nozzleNumber',
    })
    .populate({
      path: 'closingReadings.nozzle',
      select: 'nozzleNumber',
    });

const getActiveUnitNozzles = async (unitId, dbSession) => {
  const nozzles = await Nozzle.find(
    {
      unit: unitId,
      isActive: true,
    },
    null,
    { session: dbSession }
  )
    .populate({
      path: 'tank',
      populate: { path: 'fuelType', select: 'name description' },
    })
    .sort({ nozzleNumber: 1 });

  if (!nozzles.length) {
    const error = new Error('The selected unit does not have any active nozzles');
    error.statusCode = 400;
    throw error;
  }

  return nozzles;
};

const validateOpeningReadingsAgainstPreviousClosings = (nozzles, openingMap) => {
  nozzles.forEach((nozzle) => {
    const openingReading = openingMap.get(nozzle._id.toString())?.reading;
    const latestReading = Number(nozzle.latestReading ?? 0);

    if (openingReading < latestReading) {
      const error = new Error(
        `Opening reading for nozzle ${nozzle.nozzleNumber} must be at least the previous closing reading (${latestReading}).`
      );
      error.statusCode = 400;
      throw error;
    }
  });
};

export const startUnitSession = async ({ unitId, pumpOperatorId, openingReadings }) => {
  const dbSession = await mongoose.startSession();
  let createdSessionId = null;

  try {
    await dbSession.withTransaction(async () => {
      const existingUserSession = await UnitSession.findOne(
        {
          pumpOperator: pumpOperatorId,
          status: 'open',
        },
        null,
        { session: dbSession }
      );

      if (existingUserSession) {
        const error = new Error('You already have an active unit session');
        error.statusCode = 400;
        throw error;
      }

      const lockedUnit = await PumpUnit.findOneAndUpdate(
        {
          _id: unitId,
          isActive: true,
          status: 'available',
        },
        {
          $set: {
            status: 'occupied',
            assignedTo: pumpOperatorId,
          },
        },
        {
          new: true,
          session: dbSession,
        }
      );

      if (!lockedUnit) {
        const existingUnit = await PumpUnit.findOne(
          { _id: unitId, isActive: true },
          null,
          { session: dbSession }
        );

        const error = new Error(
          existingUnit ? 'This unit is currently occupied' : 'Selected unit is invalid'
        );
        error.statusCode = 400;
        throw error;
      }

      const nozzles = await getActiveUnitNozzles(lockedUnit._id, dbSession);
      const openingMap = buildReadingMap(openingReadings);
      ensureCoverage(
        openingMap,
        nozzles.map((nozzle) => nozzle._id),
        'Opening readings must be provided once for every nozzle in the unit'
      );
      validateOpeningReadingsAgainstPreviousClosings(nozzles, openingMap);

      const existingShift = await Shift.findOne(
        {
          unit: lockedUnit._id,
          status: 'active',
        },
        null,
        { session: dbSession }
      );

      if (existingShift) {
        const error = new Error('This unit already has an active shift');
        error.statusCode = 400;
        throw error;
      }

      const [shift] = await Shift.create(
        [
          {
            unit: lockedUnit._id,
            startedBy: pumpOperatorId,
            startTime: new Date(),
            status: 'active',
          },
        ],
        { session: dbSession }
      );

      const normalizedOpeningReadings = nozzles.map((nozzle) => ({
        nozzle: nozzle._id,
        reading: openingMap.get(nozzle._id.toString()).reading,
      }));

      const [unitSession] = await UnitSession.create(
        [
          {
            unit: lockedUnit._id,
            pumpOperator: pumpOperatorId,
            shift: shift._id,
            openingReadings: normalizedOpeningReadings,
            startTime: new Date(),
            status: 'open',
          },
        ],
        { session: dbSession }
      );

      await PumpUnit.updateOne(
        { _id: lockedUnit._id },
        {
          $set: {
            activeSession: unitSession._id,
          },
        },
        { session: dbSession }
      );

      createdSessionId = unitSession._id;
    });
  } finally {
    await dbSession.endSession();
  }

  return populateUnitSession(UnitSession.findById(createdSessionId));
};

export const endUnitSession = async ({
  sessionId,
  closingReadings,
  actingUser,
  forceClose = false,
  closeReason = '',
}) => {
  const dbSession = await mongoose.startSession();
  let closedSessionId = null;

  try {
    await dbSession.withTransaction(async () => {
      const unitSession = await UnitSession.findOne(
        {
          _id: sessionId,
          status: 'open',
        },
        null,
        { session: dbSession }
      );

      if (!unitSession) {
        const error = new Error('Open unit session not found');
        error.statusCode = 404;
        throw error;
      }

      const isOwner = unitSession.pumpOperator.toString() === actingUser._id.toString();

      if (!isOwner && !(forceClose && actingUser.role === 'admin')) {
        const error = new Error('You are not allowed to close this unit session');
        error.statusCode = 403;
        throw error;
      }

      const unit = await PumpUnit.findOne(
        {
          _id: unitSession.unit,
          isActive: true,
          status: 'occupied',
          activeSession: unitSession._id,
        },
        null,
        { session: dbSession }
      );

      if (!unit) {
        const error = new Error('Unit lock is no longer valid for this session');
        error.statusCode = 400;
        throw error;
      }

      const openingMap = buildReadingMap(unitSession.openingReadings);
      const closingMap = buildReadingMap(closingReadings, { requirePrice: true });

      ensureCoverage(
        closingMap,
        unitSession.openingReadings.map((item) => item.nozzle),
        'Closing readings must be provided once for every nozzle opened in the session'
      );

      const nozzles = await Nozzle.find(
        {
          _id: {
            $in: unitSession.openingReadings.map((item) => item.nozzle),
          },
          isActive: true,
        },
        null,
        { session: dbSession }
      ).populate('tank');

      if (nozzles.length !== unitSession.openingReadings.length) {
        const error = new Error('One or more nozzles in the session are no longer valid');
        error.statusCode = 400;
        throw error;
      }

      const timestamp = new Date();
      const normalizedClosingReadings = [];
      const readingPayload = [];
      const nozzleUpdates = [];

      for (const nozzle of nozzles.sort((a, b) => a.nozzleNumber.localeCompare(b.nozzleNumber))) {
        const opening = openingMap.get(nozzle._id.toString());
        const closing = closingMap.get(nozzle._id.toString());
        const litresSold = closing.reading - opening.reading;

        if (litresSold < 0) {
          const error = new Error(
            `Closing reading cannot be less than opening reading for nozzle ${nozzle.nozzleNumber}`
          );
          error.statusCode = 400;
          throw error;
        }

        const totalAmount = litresSold * closing.pricePerLitre;

        await decreaseTankLevel(nozzle.tank._id, litresSold, { session: dbSession });

        normalizedClosingReadings.push({
          nozzle: nozzle._id,
          reading: closing.reading,
          pricePerLitre: closing.pricePerLitre,
          litresSold,
          totalAmount,
        });

        readingPayload.push({
          nozzle: nozzle._id,
          shift: unitSession.shift,
          openingReading: opening.reading,
          closingReading: closing.reading,
          litresSold,
          pricePerLitre: closing.pricePerLitre,
          totalAmount,
          recordedBy: unitSession.pumpOperator,
          timestamp,
        });

        nozzleUpdates.push({
          updateOne: {
            filter: { _id: nozzle._id },
            update: {
              $set: {
                latestReading: closing.reading,
                latestReadingUpdatedAt: timestamp,
              },
            },
          },
        });
      }

      await NozzleReading.insertMany(readingPayload, { session: dbSession });

      if (nozzleUpdates.length) {
        await Nozzle.bulkWrite(nozzleUpdates, { session: dbSession });
      }

      await Shift.updateOne(
        { _id: unitSession.shift, status: 'active' },
        {
          $set: {
            status: 'closed',
            endTime: timestamp,
            endedBy: actingUser._id,
          },
        },
        { session: dbSession }
      );

      unitSession.closingReadings = normalizedClosingReadings;
      unitSession.endTime = timestamp;
      unitSession.endedBy = actingUser._id;
      unitSession.status = 'closed';
      unitSession.forcedClose = forceClose;
      unitSession.closeReason = forceClose ? closeReason || 'Force closed by admin' : '';
      await unitSession.save({ session: dbSession });

      await PumpUnit.updateOne(
        {
          _id: unit._id,
          activeSession: unitSession._id,
        },
        {
          $set: {
            status: 'available',
            assignedTo: null,
            activeSession: null,
          },
        },
        { session: dbSession }
      );

      closedSessionId = unitSession._id;
    });
  } finally {
    await dbSession.endSession();
  }

  return populateUnitSession(UnitSession.findById(closedSessionId));
};

export const getCurrentUnitSessionForUser = async (userId) =>
  populateUnitSession(
    UnitSession.findOne({
      pumpOperator: userId,
      status: 'open',
    }).sort({ startTime: -1 })
  );

export const getUnitSessions = async ({ user, query }) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.unitId) {
    filter.unit = query.unitId;
  }

  if (user.role === 'pumpOperator') {
    filter.pumpOperator = user._id;
  } else if (query.pumpOperatorId || query.pumperId) {
    filter.pumpOperator = query.pumpOperatorId || query.pumperId;
  }

  return populateUnitSession(UnitSession.find(filter).sort({ startTime: -1 }));
};
