import crypto from "crypto";
import jwt from "jsonwebtoken";
import AppError from "../../../utils/appError.js";
import sendEmail from "../../../utils/email.js";
import catchAsync from "../../error/catch-async-error.js";
import User from "../models/user.model.js";

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set jwt in cookies
  const cookieOption = {
    expiresIn: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOption.secure = true;
  }
  res.cookie("jwt", token, cookieOption);

  // Remove password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    user,
    token,
  });
};
// Handle signup
export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createToken(newUser, 201, res);
});

// Handle login
export const login = catchAsync(async (req, res, next) => {
  // Check if email and password exist
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // Check if the user exists and paasword correct
  const user = await User.findOne({ email }).select("+password");

  console.log("user", user);

  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createToken(user, 200, res);
});

// Handle forgot password
export const forgotPassword = catchAsync(async (req, res, next) => {
  console.log("----------------------forgotPassword-----------------------");
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  console.log(resetToken);

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

// Reset Password Handler
export const resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token

  // Hash the token from URL params to compare with the stored hash
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  console.log("hashedToken", hashedToken);
  // Find the user with the hashed token and check expiration
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // passwordResetExpiresIn: { $gt: Date.now() },
  });

  console.log("user", user);
  if (!user) {
    next(new AppError("Token expired or invalid", 400));
  }

  // Set the new password and remove reset token fields
  console.log("resetPassword");
  console.log("req.body.password", req.body.password);
  console.log("req.body.passwordConfirm", req.body.passwordConfirm);

  // Validate password length and confirm password
  if (
    req.body.password.length < 8 ||
    req.body.passwordConfirm !== req.body.password
  ) {
    return next(
      new AppError(
        "Password must be at least 8 characters long and match the confirm password",
        400
      )
    );
  }

  // Update the password and remove reset token fields
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;
  await user.save();

  // Log the user in by sending a new JWT

  // Log the user in by sending a new JWT
  createToken(user, 200, res);
});

// Update current user password

export const updateUserPassword = catchAsync(async (req, res, next) => {
  // Get the current user
  const currentUser = await User.findById(req.user.id).select("+password");

  // Check if the provided password is correct
  if (
    !(await currentUser.comparePassword(
      req.body.currentPassword,
      currentUser.password
    ))
  ) {
    return next(new AppError("Current password is incorrect", 401));
  }

  // Update the password
  currentUser.password = req.body.newPassword;
  currentUser.passwordConfirm = req.body.newPasswordConfirm;

  await currentUser.save();

  createToken(currentUser, 200, res);
});
