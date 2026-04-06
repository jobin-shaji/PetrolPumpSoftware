import mongoose from 'mongoose';

const nozzleReadingSchema = new mongoose.Schema(
  {
    nozzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nozzle',
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    openingReading: {
      type: Number,
      required: true,
      min: 0,
    },
    closingReading: {
      type: Number,
      required: true,
      min: 0,
    },
    litresSold: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerLitre: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

nozzleReadingSchema.index({ nozzle: 1, shift: 1 }, { unique: true });

const NozzleReading = mongoose.model('NozzleReading', nozzleReadingSchema);

export default NozzleReading;
