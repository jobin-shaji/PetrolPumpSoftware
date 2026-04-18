import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import creditSaleRoutes from './routes/creditSaleRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import fuelTypeRoutes from './routes/fuelTypeRoutes.js';
import fuelPriceRoutes from './routes/fuelPriceRoutes.js';
import nozzleRoutes from './routes/nozzleRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import sessionPaymentRoutes from './routes/sessionPaymentRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import tankRoutes from './routes/tankRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import unitSessionRoutes from './routes/unitSessionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fuel-types', fuelTypeRoutes);
app.use('/api/fuel-prices', fuelPriceRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/nozzles', nozzleRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/unit-session', unitSessionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/credit-sales', creditSaleRoutes);
app.use('/api/session-payments', sessionPaymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
