import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";

import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { auditMiddleware } from "./utils/auditLogger.js";

// Routes
import authRoutes from "./routes/auth.js";
import centerRoutes from "./routes/center.js";
import studentRoutes from "./routes/student.js";
import admissionRoutes from "./routes/admission.js";
import hostelRoutes from "./routes/hostel.js";
import messRoutes from "./routes/mess.js";
import libraryRoutes from "./routes/library.js";
import accountsRoutes from "./routes/accounts.js";
import logbookRoutes from "./routes/logbook.js";
import dashboardRoutes from "./routes/dashboard.js";
import publicRoutes from "./routes/public.js";
import examRegistrationRoutes from "./routes/examRegistration.js";
import receiptRoutes from "./routes/receipt.js";

connectDB();

const app = express();

// Security & parsing
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Audit trail on all mutating requests
app.use(auditMiddleware);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/admission", admissionRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/messes", messRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/logbook", logbookRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/exam-registrations", examRegistrationRoutes);
app.use("/api/receipts", receiptRoutes);

// 404 + global error handler
app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

export default app;