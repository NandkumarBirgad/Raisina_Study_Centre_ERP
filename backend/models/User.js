import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },

    // CHANGED from friend's repo: only two roles
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CENTER_ADMIN"],
      required: true,
    },

    // null for SUPER_ADMIN, required for CENTER_ADMIN
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
    },

    forcePasswordChange: {
      type: Boolean,
      default: false,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Enforce CENTER_ADMIN must have a center
userSchema.pre("save", function (next) {
  if (this.role === "CENTER_ADMIN" && !this.center) {
    return next(new Error("CENTER_ADMIN must be assigned to a center"));
  }
  if (this.role === "SUPER_ADMIN" && this.center) {
    this.center = null; // force null — super admin has no center
  }
  next();
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1, center: 1 });

const User = mongoose.model("User", userSchema);
export default User;
