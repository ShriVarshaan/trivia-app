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

async function getRoomState(roomId) {
  try {
    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
      select: { room_id: true, host_id: true, status: true }
    });

    return room
      ? {
          roomId: room.room_id,
          hostId: room.host_id,
          status: room.status
        }
      : null;
  } catch (error) {
    console.error("Error fetching room state:", error);
    return null;
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

      const roomState = await getRoomState(roomId);
      if (roomState) {
        socket.emit("room_state", roomState);

        if (roomState.status === "started") {
          socket.emit("game_started", { roomId: roomState.roomId });
        }
      }

      const players = await getRoomPlayers(roomId);
      io.to(roomId).emit("room_players", players);
  } catch(error) {
      console.error("Error joining room:", error);
    }
  });

  socket.on("start_game", async (roomId) => {
    try {
      const room = await prisma.room.findUnique({
        where: { room_id: roomId },
        select: { room_id: true, host_id: true, status: true }
      });

      if (!room) {
        socket.emit("room_error", { message: "Room not found." });
        return;
      }

      if (room.host_id !== userId) {
        socket.emit("room_error", { message: "Only the room host can start the game." });
        return;
      }

      if (room.status === "started") {
        io.to(roomId).emit("game_started", { roomId: room.room_id });
        io.to(roomId).emit("room_state", {
          roomId: room.room_id,
          hostId: room.host_id,
          status: room.status
        });
        return;
      }

      const updatedRoom = await prisma.room.update({
        where: { room_id: roomId },
        data: { status: "started" }
      });

      io.to(roomId).emit("game_started", { roomId: updatedRoom.room_id });
      io.to(roomId).emit("room_state", {
        roomId: updatedRoom.room_id,
        hostId: updatedRoom.host_id,
        status: updatedRoom.status
      });
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("room_error", { message: "Unable to start the game." });
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