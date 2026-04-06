import mongoose from 'mongoose';

const pumpUnitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    nozzles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Nozzle',
      },
    ],
    status: {
      type: String,
      enum: ['available', 'occupied'],
      default: 'available',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activeSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnitSession',
      default: null,
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

const PumpUnit = mongoose.model('PumpUnit', pumpUnitSchema);

export default PumpUnit;
