import express from "express"
import {signup, login} from "../controllers/authController.js"
import {validateSignup, validateLogin} from "../middleware/authMiddleware.js"

const router = express.Router();

router.post("/signup", validateSignup, signup)
router.post("/login", validateLogin, login)

export default router