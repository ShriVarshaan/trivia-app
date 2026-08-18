import { prisma } from "../config/prisma.js";

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    console.log("Fetching profile for user:", userId);

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true }
    });

    if (!user) {
      console.log("User not found!");
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch game history
    const history = await prisma.gameHistory.findMany({
      where: { user_id: userId },
      orderBy: { played_at: "desc" }
    });

    console.log("History found:", history.length, "records");

    res.status(200).json({ user, history });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;

    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
}
