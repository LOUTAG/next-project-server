import { Router } from "express";
import {
  register,
  accountValidation,
  login,
  profile,
  refreshAccessToken,
  forgotPassword,
  verifyResetToken,
  resetPassword
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";

const router = Router();

//@desc register
//@route POST /api/users/register
//@access public
router.post("/register", register);

//@desc account validation
//@route GET /api/users/account-validation/:token
//@access public
router.get("/account-validation/:token", accountValidation);

//@desc login
//@route POST /api/users/login
//@access public
router.post("/login", login);

//@desc profile
//@route GET /api/users/profile
//@access private
router.get("/profile", authMiddleware, profile);

//@desc refresh access token
//@route GET /api/users/refresh-access-token
//@access private
router.get("/refresh-access-token", refreshAccessToken);

//@desc forgot password
//@route POST /api/users/forgot-password
//@access public
router.post("/forgot-password", forgotPassword);

//@desc verify reset token
//@route POST /api/users/verify-reset-token
//@access public
router.post("/verify-reset-token", verifyResetToken);

//@desc reset token
//@route POST /api/users/reset-password
//@access private
router.put("/reset-password", resetPassword);

export default router;
