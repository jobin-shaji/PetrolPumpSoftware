import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import fuelTypeRoutes from './routes/fuelTypeRoutes.js';
import nozzleRoutes from './routes/nozzleRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import tankRoutes from './routes/tankRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
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
app.use('/api/tanks', tankRoutes);
app.use('/api/nozzles', nozzleRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
