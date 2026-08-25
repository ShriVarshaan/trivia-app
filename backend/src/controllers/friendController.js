import { prisma } from "../config/prisma.js";

export async function sendFriendRequest(req, res) {
  try {
    const senderId = req.user.id;
    const { username } = req.params;

    if (req.user.username === username) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    const receiver = await prisma.user.findUnique({ where: { username } });
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }
    const receiverId = receiver.id;

    // Check if they are already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1_id: senderId, user2_id: receiverId },
          { user1_id: receiverId, user2_id: senderId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ message: "You are already friends" });
    }

    // Check if a request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { sender_id: senderId, receiver_id: receiverId },
          { sender_id: receiverId, receiver_id: senderId }
        ]
      }
    });

    if (existingRequest) {
      if (existingRequest.sender_id === senderId) {
        return res.status(400).json({ message: "Friend request already sent" });
      } else {
        return res.status(400).json({ message: "This user has already sent you a request. Check your pending requests." });
      }
    }

    const newRequest = await prisma.friendRequest.create({
      data: { sender_id: senderId, receiver_id: receiver.id }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${receiver.id}`).emit("new_friend_request");
    }

    res.status(201).json({ message: "Friend request sent", request: newRequest });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Error sending friend request" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.requestId);

    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiver_id !== userId) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is no longer pending" });
    }

    await prisma.$transaction([
      prisma.friendRequest.delete({ where: { id: requestId } }),
      prisma.friendship.create({
        data: {
          user1_id: request.sender_id < request.receiver_id ? request.sender_id : request.receiver_id,
          user2_id: request.sender_id > request.receiver_id ? request.sender_id : request.receiver_id
        }
      })
    ]);

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Error accepting friend request" });
  }
}

export async function rejectFriendRequest(req, res) {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.requestId);

    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiver_id !== userId && request.sender_id !== userId) {
      return res.status(403).json({ message: "You are not authorized to reject or cancel this request" });
    }

    await prisma.friendRequest.delete({ where: { id: requestId } });

    res.status(200).json({ message: "Friend request removed" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: "Error rejecting friend request" });
  }
}

export async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiver_id: userId,
        status: "pending"
      },
      include: {
        sender: {
          select: { id: true, username: true, is_online: true }
        }
      },
      orderBy: { created_at: "desc" }
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error("Error getting pending requests:", error);
    res.status(500).json({ message: "Error getting pending requests" });
  }
}

export async function getFriends(req, res) {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, username: true, is_online: true } },
        user2: { select: { id: true, username: true, is_online: true } }
      },
      orderBy: { created_at: "desc" }
    });

    const friends = friendships.map(f => {
      if (f.user1_id === userId) {
        return f.user2;
      } else {
        return f.user1;
      }
    });

    res.status(200).json({ friends });
  } catch (error) {
    console.error("Error getting friends:", error);
    res.status(500).json({ message: "Error getting friends" });
  }
}
