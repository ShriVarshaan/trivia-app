import express from "express"
import passport from "../config/passport.js"
import { createRoom } from "../controllers/roomController.js"

const router = express.Router();

router.use(passport.authenticate("jwt", { session: false }));

router.route("/create")
    .post(createRoom)

export default router;