import asyncHandler from '../utils/asyncHandler.js';
import {
  endUnitSession,
  getCurrentUnitSessionForUser,
  getUnitSessions,
  startUnitSession,
} from '../services/unitSessionService.js';

export const startSession = asyncHandler(async (req, res) => {
  const { unitId, openingReadings } = req.body;

  if (!unitId) {
    const error = new Error('Unit is required to start a session');
    error.statusCode = 400;
    throw error;
  }

  const unitSession = await startUnitSession({
    unitId,
    pumpOperatorId: req.user._id,
    openingReadings,
  });

  res.status(201).json(unitSession);
});

export const endSession = asyncHandler(async (req, res) => {
  const { sessionId, closingReadings } = req.body;

  if (!sessionId) {
    const error = new Error('Session identifier is required');
    error.statusCode = 400;
    throw error;
  }

  const unitSession = await endUnitSession({
    sessionId,
    closingReadings,
    actingUser: req.user,
  });

  res.json(unitSession);
});

export const forceCloseSession = asyncHandler(async (req, res) => {
  const unitSession = await endUnitSession({
    sessionId: req.params.id,
    closingReadings: req.body.closingReadings,
    actingUser: req.user,
    forceClose: true,
    closeReason: req.body.closeReason,
  });

  res.json(unitSession);
});

export const getCurrentSession = asyncHandler(async (req, res) => {
  const unitSession = await getCurrentUnitSessionForUser(req.user._id);
  res.json(unitSession);
});

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await getUnitSessions({
    user: req.user,
    query: req.query,
  });

  res.json(sessions);
});
