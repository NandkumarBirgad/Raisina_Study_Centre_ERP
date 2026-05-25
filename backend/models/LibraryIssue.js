import mongoose from 'mongoose';

const libraryIssueSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    fine: { type: Number, default: 0 },
    status: { type: String, enum: ['ISSUED', 'RETURNED', 'OVERDUE'], default: 'ISSUED' },
  },
  { timestamps: true }
);

// Indexes
libraryIssueSchema.index({ student: 1, status: 1 });
libraryIssueSchema.index({ center: 1, dueDate: 1 });

export default mongoose.model('LibraryIssue', libraryIssueSchema);