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
