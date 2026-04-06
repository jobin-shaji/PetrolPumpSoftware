import mongoose from 'mongoose';

const nozzleSchema = new mongoose.Schema(
  {
    tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tank',
      required: true,
    },
    nozzleNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PumpUnit',
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

const Nozzle = mongoose.model('Nozzle', nozzleSchema);

export default Nozzle;
