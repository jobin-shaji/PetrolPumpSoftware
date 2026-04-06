import mongoose from 'mongoose';

const openingReadingSchema = new mongoose.Schema(
  {
    nozzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nozzle',
      required: true,
    },
    reading: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const closingReadingSchema = new mongoose.Schema(
  {
    nozzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nozzle',
      required: true,
    },
    reading: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerLitre: {
      type: Number,
      required: true,
      min: 0,
    },
    litresSold: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const unitSessionSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PumpUnit',
      required: true,
    },
    pumpOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    openingReadings: {
      type: [openingReadingSchema],
      default: [],
      validate: {
        validator: (value) => value.length > 0,
        message: 'Opening readings are required',
      },
    },
    closingReadings: {
      type: [closingReadingSchema],
      default: [],
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    forcedClose: {
      type: Boolean,
      default: false,
    },
    closeReason: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

unitSessionSchema.index(
  { unit: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
unitSessionSchema.index(
  { pumpOperator: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

const UnitSession = mongoose.model('UnitSession', unitSessionSchema);

export default UnitSession;
