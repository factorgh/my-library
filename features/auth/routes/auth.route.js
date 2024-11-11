import express from "express";
import {
  forgotPassword,
  login,
  resetPassword,
  signup,
  updateUserPassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verification.js";

const router = express.Router();

// auth routes
router.post("/signup", signup);
router.post("/login", login);

router.patch("/resetPassword/:token", resetPassword);
router.post("/forgotPassword", forgotPassword);

// user routes
router.patch("/updatePassword", verifyToken, updateUserPassword);

export default router;
