import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["DONATION", "STUDENT_FEE", "EXPENSE"],
      default: "DONATION",
      required: true,
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    donorName: {
      type: String,
      trim: true,
    },

    donorAddress: {
      type: String,
      trim: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    studentName: {
      type: String,
      trim: true,
    },

    rscNumber: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"],
      default: "CASH",
    },

    purpose: {
      type: String,
      trim: true,
      default: "Donation",
    },

    notes: {
      type: String,
      trim: true,
    },

    receiptDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

receiptSchema.index({ center: 1, type: 1 });
receiptSchema.index({ receiptDate: -1 });
receiptSchema.index({ createdBy: 1 });

export default mongoose.model("Receipt", receiptSchema);