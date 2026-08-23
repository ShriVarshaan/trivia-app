import express from "express"
import {signup, login, verifyOtp, resendOtp} from "../controllers/authController.js"
import {validateSignup, validateLogin} from "../middleware/authMiddleware.js"

const router = express.Router();

router.post("/signup", validateSignup, signup)
router.post("/login", validateLogin, login)
router.post("/verify-otp", verifyOtp)
router.post("/resend-otp", resendOtp)

export default router