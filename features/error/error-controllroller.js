import dotenv from "dotenv";
import AppError from "../../utils/appError.js";

dotenv.config();

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  let value = "unknown value"; // Fallback if no match found
  if (typeof err.errmsg === "string") {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    if (match) {
      value = match[0];
    }
  }

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJwtError = new AppError(
  "Invalid token. Please login again.",
  401 // JWT error status code should be 401
);

const handleJwtExpiredError = new AppError(
  "Your token has expired. Please login again.",
  401 // JWT expired error status code should be 401
);

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR ", err);
    res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message || "Something went wrong",
    });
  }
};

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJwtError;
    if (error.name === "TokenExpiredError") error = handleJwtExpiredError;

    sendProdError(error, res);
  }
};
