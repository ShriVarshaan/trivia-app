import { prisma } from "../config/prisma.js";

async function getRoomPlayers(roomId) {
  try {
    const rows = await prisma.roomPlayer.findMany({
      where: { room_id: roomId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { joined_at: "asc" }
    });

    return rows.map((r) => ({
      userId: r.user.id,
      username: r.user.username,
      isReady: r.is_ready
    }));
  } catch (error) {
    console.error("Error fetching room players:", error);
    return [];
  }
}

export function registerRoomHandlers (io, socket) {

  const userId = socket.user?.id;
  const username = socket.user?.username;

  if (!userId) {
    return;
  }

  socket.on("join_room", async (roomId) => {

    try {
      socket.join(roomId);

      await prisma.roomPlayer.upsert({
        where: {
          user_id_room_id: { user_id: userId, room_id: roomId }
        },
        update: {},
        create: { user_id: userId, room_id: roomId }
      });


      console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

      const players = await getRoomPlayers(roomId);

      io.to(roomId).emit("room_players", players);
  } catch(error) {
      console.error("Error joining room:", error);
    }
  });

  socket.on("leave_room", async (roomId) => {
    try {
      socket.leave(roomId);
      console.log(`User ${username} (${socket.id}) left room: ${roomId}`);

      await prisma.roomPlayer.deleteMany({
        where: { user_id: userId, room_id: roomId }
      });

      const players = await getRoomPlayers(roomId);
      io.to(roomId).emit("room_players", players);
  } catch (error) {
    console.error("Error leaving room:", error);
  }
  });

  socket.on("disconnect", async () => {
    try{
      console.log(`User ${username} (${socket.id}) disconnected`);
      
      // Find rooms this user was in to emit updates to remaining players
      const userRooms = await prisma.roomPlayer.findMany({
        where: { user_id: userId },
        select: { room_id: true }
      });

      // Remove user from all rooms in the database
      await prisma.roomPlayer.deleteMany({
        where: { user_id: userId }
      });

      for (const { room_id } of userRooms) {
        const players = await getRoomPlayers(room_id);
        io.to(room_id).emit("room_players", players);
      }
  } catch (error) {
    console.error("Error handling disconnect:", error);
  }
  });
};