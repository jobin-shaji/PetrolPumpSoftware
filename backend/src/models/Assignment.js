import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    pumper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PumpUnit',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
