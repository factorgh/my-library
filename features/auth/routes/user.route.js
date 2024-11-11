import express from "express";

import { deleteMe, getAll, updateMe } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verification.js";

const router = express.Router();

// user routes
router.get("/", verifyToken, getAll);
router.patch("/updateMe", verifyToken, updateMe);
router.delete("/deleteMe", verifyToken, deleteMe);

export default router;
