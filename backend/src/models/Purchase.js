import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tank',
      required: true,
    },
    quantityLitres: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerLitre: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
