import express from "express";
import { register ,login,forgotPassword,
  resetPassword,changePassword,requestLoginOtp,verifyLoginOtp,googleLogin} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login); 
router.post("/request-login-otp", requestLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/google", googleLogin);


router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", changePassword);
export default router;
