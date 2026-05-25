import mongoose from "mongoose";

const messEnrollmentSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },

    mess: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    planType: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
      default: "MONTHLY",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "STOPPED"],
      default: "ACTIVE",
    },

    endDate: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messEnrollmentSchema.index({ student: 1, status: 1 });
messEnrollmentSchema.index({ mess: 1, status: 1 });

export default mongoose.model("MessEnrollment", messEnrollmentSchema);