import asyncHandler from '../utils/asyncHandler.js';
import {
  getDailyReport,
  getFuelWiseReport,
  getProfitSummary,
} from '../services/reportService.js';

export const getProfitReport = asyncHandler(async (req, res) => {
  const report = await getProfitSummary(req.query);
  res.json(report);
});

export const getDailySummary = asyncHandler(async (req, res) => {
  const report = await getDailyReport(req.query);
  res.json(report);
});

export const getFuelSummary = asyncHandler(async (req, res) => {
  const report = await getFuelWiseReport(req.query);
  res.json(report);
});
