import mongoose from 'mongoose';

const hostelSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  center:   { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  type:     { type: String, enum: ['Boys', 'Girls', 'Other'], required: true },
  address:  { type: String, trim: true },
  totalRooms:   { type: Number, required: true, min: 1 },
  bedsPerRoom:  { type: Number, required: true, min: 1 },
  capacity:     { type: Number },  // auto-calculated: totalRooms * bedsPerRoom
  occupancy:    { type: Number, default: 0, min: 0 },
  monthlyFee:   { type: Number, default: 0 }, // for non-scholarship students
  deleted:  { type: Boolean, default: false },
}, { timestamps: true });

hostelSchema.index({ name: 1, center: 1 }, { unique: true });

// Auto-calculate capacity before save
hostelSchema.pre('save', function(next) {
  this.capacity = this.totalRooms * this.bedsPerRoom;
  next();
});

export default mongoose.model('Hostel', hostelSchema);