import express from "express";
import passport from "../config/passport.js";
import { getProfile, deleteAccount, searchUsers, getPublicProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(passport.authenticate("jwt", { session: false }));

router.get("/profile", getProfile);
router.delete("/profile", deleteAccount);

router.get("/search", searchUsers);
router.get("/:username", getPublicProfile);

export default router;
