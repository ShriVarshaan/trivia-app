import { prisma } from "../config/prisma.js";

const DEFAULT_ROOM_DURATION_MS = 2 * 60 * 1000;
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
      select: { room_id: true, host_id: true, status: true, duration_seconds: true }
    });

    return room
      ? {
          roomId: room.room_id,
          hostId: room.host_id,
          status: room.status,
          durationSeconds: room.duration_seconds
        }
      : null;
  } catch (error) {
    console.error("Error fetching room state:", error);
    return null;
  }
}

async function getRoomDurationMs(roomId) {
  const room = await prisma.room.findUnique({
    where: { room_id: roomId },
    select: { duration_seconds: true }
  });

  return room ? room.duration_seconds * 1000 : DEFAULT_ROOM_DURATION_MS;
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

async function startRoomTimer(io, roomId, hostId) {
  const existingTimer = roomTimers.get(roomId);

  if (existingTimer?.intervalId) {
    clearInterval(existingTimer.intervalId);
  }

  const totalDurationMs = await getRoomDurationMs(roomId);
  const endsAt = Date.now() + totalDurationMs;
  const intervalId = setInterval(() => {
    const remainingMs = Math.max(0, endsAt - Date.now());

    io.to(roomId).emit("room_timer", {
      roomId,
      totalMs: totalDurationMs,
      remainingMs
    });

    if (remainingMs <= 0) {
      endRoomTimer(io, roomId);
    }
  }, 1000);

  roomTimers.set(roomId, { hostId, endsAt, totalDurationMs, intervalId });

  io.to(roomId).emit("room_timer", {
    roomId,
    totalMs: totalDurationMs,
    remainingMs: totalDurationMs
  });
}

async function refreshRoomCount(roomId) {
  const currentCount = await prisma.roomPlayer.count({
    where: { room_id: roomId }
  });

  await prisma.room.update({
    where: { room_id: roomId },
    data: { cur_players: currentCount }
  });

  return currentCount;
}

async function transferHostIfNeeded(io, roomId, departingUserId, options = {}) {
  const { explicitLeave = false } = options;
  const room = await prisma.room.findUnique({
    where: { room_id: roomId },
    select: { room_id: true, host_id: true, status: true }
  });

  if (!room || room.host_id !== departingUserId) {
    return;
  }

  const remainingPlayers = await prisma.roomPlayer.findMany({
    where: {
      room_id: roomId,
      user_id: { not: departingUserId }
    },
    orderBy: { joined_at: "asc" },
    select: { user_id: true }
  });

  if (remainingPlayers.length > 0) {
    const updatedRoom = await prisma.room.update({
      where: { room_id: roomId },
      data: { host_id: remainingPlayers[0].user_id }
    });

    io.to(roomId).emit("room_state", {
      roomId: updatedRoom.room_id,
      hostId: updatedRoom.host_id,
      status: updatedRoom.status
    });
    return;
  }

  if (room.status === "started") {
    endRoomTimer(io, roomId);
    return;
  }

  if (explicitLeave) {
    await prisma.room.update({
      where: { room_id: roomId },
      data: { status: "waiting", cur_players: 0 }
    });
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
      const existingPlayer = await prisma.roomPlayer.findUnique({
        where: {
          user_id_room_id: { user_id: userId, room_id: roomId }
        }
      });

      if (existingPlayer) {
        socket.join(roomId);

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
        return;
      }

      await prisma.$transaction(async (tx) => {
        const room = await tx.room.findUnique({
          where: { room_id: roomId },
          select: { room_id: true, max_players: true, cur_players: true, host_id: true }
        });

        if (!room) {
          throw new Error("ROOM_NOT_FOUND");
        }

        const currentCount = await tx.roomPlayer.count({
          where: { room_id: roomId }
        });

        if (currentCount >= room.max_players) {
          throw new Error("ROOM_FULL");
        }

        await tx.roomPlayer.create({
          data: { user_id: userId, room_id: roomId }
        });

        const roomHostStillExists = await tx.roomPlayer.findFirst({
          where: {
            room_id: roomId,
            user_id: room.host_id
          }
        });

        if (!roomHostStillExists) {
          await tx.room.update({
            where: { room_id: roomId },
            data: { host_id: userId }
          });
        }

        await tx.room.update({
          where: { room_id: roomId },
          data: { cur_players: currentCount + 1 }
        });
      });

      socket.join(roomId);
      console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

      const roomState = await getRoomState(roomId);
      if (roomState) {
        socket.emit("room_state", roomState);

        if (roomState.status === "started") {
          const totalDurationMs = roomState.durationSeconds * 1000;
          socket.emit("game_started", { roomId: roomState.roomId });
          socket.emit("room_timer", {
            roomId: roomState.roomId,
            totalMs: totalDurationMs,
            remainingMs: getRoomRemainingMs(roomId)
          });
        }
      }

      const players = await getRoomPlayers(roomId);
      io.to(roomId).emit("room_players", players);
    } catch (error) {
      if (error.message === "ROOM_NOT_FOUND") {
        socket.emit("room_error", { message: "Room not found." });
        return;
      }

      if (error.message === "ROOM_FULL") {
        socket.emit("room_error", { message: "Room is full" });
        return;
      }

      if (error.code === "P2003") {
        socket.emit("room_error", { message: "Room not found." });
        return;
      }

      console.error("Error joining room:", error);
      socket.emit("room_error", { message: "Unable to join room." });
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

      await startRoomTimer(io, roomId, userId);

      io.to(roomId).emit("game_started", { roomId: updatedRoom.room_id });
      io.to(roomId).emit("room_state", {
        roomId: updatedRoom.room_id,
        hostId: updatedRoom.host_id,
        status: updatedRoom.status,
        durationSeconds: updatedRoom.duration_seconds ?? 120
      });
      io.to(roomId).emit("room_timer", {
        roomId: updatedRoom.room_id,
        totalMs: updatedRoom.duration_seconds ? updatedRoom.duration_seconds * 1000 : DEFAULT_ROOM_DURATION_MS,
        remainingMs: updatedRoom.duration_seconds ? updatedRoom.duration_seconds * 1000 : DEFAULT_ROOM_DURATION_MS
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

      const deleted = await prisma.roomPlayer.deleteMany({
        where: { user_id: userId, room_id: roomId }
      });

      if (deleted.count > 0) {
        await refreshRoomCount(roomId);
        await transferHostIfNeeded(io, roomId, userId, { explicitLeave: true });
      }

      const players = await getRoomPlayers(roomId);
      io.to(roomId).emit("room_players", players);
      const roomState = await getRoomState(roomId);
      if (roomState) {
        io.to(roomId).emit("room_state", roomState);
      }
  } catch (error) {
    console.error("Error leaving room:", error);
  }
  });

  socket.on("disconnect", async () => {
    try{
      console.log(`User ${username} (${socket.id}) disconnected`);

      const userRooms = await prisma.roomPlayer.findMany({
        where: { user_id: userId },
        select: { room_id: true }
      });

      for (const { room_id } of userRooms) {
        const deleted = await prisma.roomPlayer.deleteMany({
          where: { user_id: userId, room_id }
        });

        if (deleted.count > 0) {
          await refreshRoomCount(room_id);
          await transferHostIfNeeded(io, room_id, userId);
        }

        const players = await getRoomPlayers(room_id);
        io.to(room_id).emit("room_players", players);

        const roomState = await getRoomState(room_id);
        if (roomState) {
          io.to(room_id).emit("room_state", roomState);
        }
      }
  } catch (error) {
    console.error("Error handling disconnect:", error);
  }
  });
};