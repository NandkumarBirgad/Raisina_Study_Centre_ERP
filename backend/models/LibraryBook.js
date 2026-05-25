import mongoose from 'mongoose';

const libraryBookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, default: null },
    center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
    totalCopies: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('LibraryBook', libraryBookSchema);