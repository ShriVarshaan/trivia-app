import { prisma } from "../config/prisma.js";

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch game history
    const history = await prisma.gameHistory.findMany({
      where: { user_id: userId },
      orderBy: { played_at: "desc" }
    });

    // Fetch friend count
    const friendCount = await prisma.friendship.count({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      }
    });

    res.status(200).json({ user, history, friendCount });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;

    await prisma.$transaction([
      prisma.room.deleteMany({ where: { host_id: userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
}

export async function searchUsers(req, res) {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    if (!q) {
      return res.status(200).json({ users: [] });
    }

    // Use raw query for custom sorting: exact match first, prefix match second, substring match third
    const users = await prisma.$queryRaw`
      SELECT id, username, is_online
      FROM "User"
      WHERE username ILIKE ${'%' + q + '%'}
      ORDER BY 
        CASE 
          WHEN username = ${q} THEN 1 
          WHEN username ILIKE ${q + '%'} THEN 2 
          ELSE 3 
        END,
        username ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Error searching users" });
  }
}

export async function getPublicProfile(req, res) {
  try {
    const { username } = req.params;
    const requesterId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, is_online: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const history = await prisma.gameHistory.findMany({
      where: { user_id: user.id },
      orderBy: { played_at: "desc" }
    });

    const friendCount = await prisma.friendship.count({
      where: {
        OR: [
          { user1_id: user.id },
          { user2_id: user.id }
        ]
      }
    });

    let relationship = "none";

    if (requesterId !== user.id) {
      const isFriend = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1_id: requesterId, user2_id: user.id },
            { user1_id: user.id, user2_id: requesterId }
          ]
        }
      });

      if (isFriend) {
        relationship = "friends";
      } else {
        const requestSent = await prisma.friendRequest.findFirst({
          where: { sender_id: requesterId, receiver_id: user.id }
        });
        
        if (requestSent) {
          relationship = "request_sent";
        } else {
          const requestReceived = await prisma.friendRequest.findFirst({
            where: { sender_id: user.id, receiver_id: requesterId }
          });
          if (requestReceived) {
            relationship = "request_received";
          }
        }
      }
    } else {
      relationship = "self";
    }

    res.status(200).json({ user, history, friendCount, relationship });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
}
