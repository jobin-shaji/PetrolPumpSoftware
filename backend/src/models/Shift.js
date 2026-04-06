import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PumpUnit',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
