import mongoose from 'mongoose';

const messSchema = new mongoose.Schema({
  messName:   { type: String, required: true, trim: true },
  center:     { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  hostel:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', default: null },
  address:    { type: String, trim: true },
  capacity:   { type: Number, required: true, min: 1 },
  monthlyFee: { type: Number, required: true, min: 0 },
  status:     { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  deleted:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Mess', messSchema);