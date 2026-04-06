import mongoose from 'mongoose';

const tankSchema = new mongoose.Schema(
  {
    fuelType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FuelType',
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    currentLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Tank = mongoose.model('Tank', tankSchema);

export default Tank;
