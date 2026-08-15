import { prisma } from "../config/prisma.js";

const ROOM_DURATION_MS = 2 * 60 * 1000;
const roomTimers = new Map();

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

function getRoomRemainingMs(roomId) {
  const timer = roomTimers.get(roomId);

  if (!timer) {
    return 0;
  }

  return Math.max(0, timer.endsAt - Date.now());
}

function endRoomTimer(io, roomId) {
  const timer = roomTimers.get(roomId);

  if (timer?.intervalId) {
    clearInterval(timer.intervalId);
  }

  roomTimers.delete(roomId);

  prisma.room
    .update({
      where: { room_id: roomId },
      data: { status: "finished" }
    })
    .catch((error) => {
      console.error(`Error finishing room ${roomId}:`, error);
    });

  io.to(roomId).emit("room_state", {
    roomId,
    status: "finished",
    hostId: timer?.hostId ?? null
  });
  io.to(roomId).emit("game_ended", { roomId });
}

function startRoomTimer(io, roomId, hostId) {
  const existingTimer = roomTimers.get(roomId);

  if (existingTimer?.intervalId) {
    clearInterval(existingTimer.intervalId);
  }

  const endsAt = Date.now() + ROOM_DURATION_MS;
  const intervalId = setInterval(() => {
    const remainingMs = Math.max(0, endsAt - Date.now());

    io.to(roomId).emit("room_timer", {
      roomId,
      totalMs: ROOM_DURATION_MS,
      remainingMs
    });

    if (remainingMs <= 0) {
      endRoomTimer(io, roomId);
    }
  }, 1000);

  roomTimers.set(roomId, { hostId, endsAt, intervalId });

  io.to(roomId).emit("room_timer", {
    roomId,
    totalMs: ROOM_DURATION_MS,
    remainingMs: ROOM_DURATION_MS
  });
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
          socket.emit("room_timer", {
            roomId: roomState.roomId,
            totalMs: ROOM_DURATION_MS,
            remainingMs: getRoomRemainingMs(roomId)
          });
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
        io.to(roomId).emit("room_timer", {
          roomId: room.room_id,
          totalMs: ROOM_DURATION_MS,
          remainingMs: getRoomRemainingMs(roomId)
        });
        return;
      }

      const updatedRoom = await prisma.room.update({
        where: { room_id: roomId },
        data: { status: "started" }
      });

      startRoomTimer(io, roomId, userId);

      io.to(roomId).emit("game_started", { roomId: updatedRoom.room_id });
      io.to(roomId).emit("room_state", {
        roomId: updatedRoom.room_id,
        hostId: updatedRoom.host_id,
        status: updatedRoom.status
      });
      io.to(roomId).emit("room_timer", {
        roomId: updatedRoom.room_id,
        totalMs: ROOM_DURATION_MS,
        remainingMs: ROOM_DURATION_MS
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