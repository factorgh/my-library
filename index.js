import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import expressMongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoose from "mongoose";
import morgan from "morgan";
import xss from "xss-clean";
import authRouter from "./features/auth/routes/auth.route.js";
import userRouter from "./features/auth/routes/user.route.js";
import { errorHandler } from "./features/error/error-controllroller.js";

dotenv.config(); // Load env variables at the top

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection error:", err));

// Initialize Express app
const app = express();

// Set scurity http
app.use(helmet());

// Cross site request middleware
app.use(cors());
// LOGGGER
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" })); // Parses JSON requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Data Sanitizer against Nosql injections
app.use(expressMongoSanitize());

// Data Sanitizer against xss
app.use(xss());

// Paramter Pollution Policy
app.use(hpp());

// Rate limiting & Prevention of bruce false attacks middleware
app.use(
  "/api",
  rateLimit({
    max: 300,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many requests, please try again later.",
  })
);

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

// Handle unknown routes
app.all("*", (req, res, next) => {
  next(new Error(`Route ${req.originalUrl} not found`));
});

// app.use((err, req, res, next) => {
//   res.status(err.statusCode || 500).json({
//     status: err.status || "error",
//     message: err.message || "Something went wrong",
//   });
// });

// Error handling middleware
app.use(errorHandler);

// Start server
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  server.close(() => process.exit(1));
});
