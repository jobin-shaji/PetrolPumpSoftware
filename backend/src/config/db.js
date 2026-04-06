import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured');
  }

  await mongoose.connect(mongoUri, dbName ? { dbName } : {});
  console.log('MongoDB connected');
};

export default connectDB;
