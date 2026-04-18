import asyncHandler from '../utils/asyncHandler.js';
import {
  saveSessionPayment,
  getSessionPayment,
  calculateSessionPaymentReconciliation,
} from '../services/sessionPaymentService.js';

export const savePayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { cashCollected, upiCollected, cardCollected } = req.body;

  const payment = await saveSessionPayment(sessionId, {
    cashCollected,
    upiCollected,
    cardCollected,
  });

  res.json(payment);
});

export const getPayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const payment = await getSessionPayment(sessionId);

  if (!payment) {
    const error = new Error('Payment record not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(payment);
});

export const getReconciliation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const reconciliation = await calculateSessionPaymentReconciliation(sessionId);
  res.json(reconciliation);
});
