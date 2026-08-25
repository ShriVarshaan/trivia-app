import express from "express";
import passport from "../config/passport.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequests,
  getFriends
} from "../controllers/friendController.js";

const router = express.Router();

router.use(passport.authenticate("jwt", { session: false }));

router.post("/request/:username", sendFriendRequest);
router.post("/accept/:requestId", acceptFriendRequest);
router.post("/reject/:requestId", rejectFriendRequest);
router.get("/requests", getPendingRequests);
router.get("/", getFriends);

export default router;
