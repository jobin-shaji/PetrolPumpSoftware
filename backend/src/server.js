import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { ensureSeedData } from './services/seedService.js';

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureSeedData();

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
