import mongoose from "mongoose";

const CENTER_CODE_MAP = {
  "Chhatrapati Sambhajinagar": "CSN",
  "Sambhajinagar": "CSN",
  "Chhatrapati Sambhaji Nagar": "CSN",

  "Latur": "LTR",
  "Amravati": "AMT",

  "Hyderabad": "HYD",
  "Hydrabad": "HYD",
};

const centerSchema = new mongoose.Schema(
  {
    centerName: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    centerCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

centerSchema.pre("save", function (next) {
  if (!this.centerCode && this.centerName) {
    this.centerCode = CENTER_CODE_MAP[this.centerName] || undefined;
  }

  if (this.centerCode) {
    this.centerCode = this.centerCode.toUpperCase();
  }

  next();
});

export default mongoose.model("Center", centerSchema);