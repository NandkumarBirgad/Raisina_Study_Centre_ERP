import mongoose from "mongoose";

const meritEntrySchema = new mongoose.Schema(
  {
    rank: {
      type: Number,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      trim: true,
      default: null,
    },

    registrationNumber: {
      type: String,
      trim: true,
      default: null,
    },

    score: {
      type: Number,
      required: true,
    },

    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamRegistration",
      default: null,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    admissionStatus: {
      type: String,
      enum: ["PENDING", "ADMITTED"],
      default: "PENDING",
    },
  },
  { _id: false }
);

const meritListSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    scholarshipCutoffRank: {
      type: Number,
      default: null,
    },

    entries: [meritEntrySchema],

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One merit list per center per year
meritListSchema.index({ center: 1, year: 1 }, { unique: true });
meritListSchema.index({ center: 1, year: 1, "entries.rank": 1 });

export default mongoose.model("MeritList", meritListSchema);