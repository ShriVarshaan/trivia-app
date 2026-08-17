import { prisma } from "../config/prisma.js";
import { getOrCreateRoomQuestionSet } from "../services/triviaQuestionService.js";

const DEFAULT_ROOM_DURATION_MS = 2 * 60 * 1000;
const roomTimers = new Map();
const roomSessions = new Map();

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
      select: { room_id: true, host_id: true, game_name: true, status: true, duration_seconds: true }
    });

    return room
      ? {
          roomId: room.room_id,
          hostId: room.host_id,
          gameName: room.game_name ?? "trivia",
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

async function buildRoomSummary(roomId) {
  const session = roomSessions.get(roomId);

  if (!session || !Array.isArray(session.questions)) {
    return [];
  }

  const players = await prisma.roomPlayer.findMany({
    where: { room_id: roomId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { joined_at: "asc" }
  });

  return players
    .map((player) => {
      const playerState = session.players.get(player.user_id) ?? { currentIndex: 0, answersByQuestion: new Map(), completed: false };
      const answers = playerState.answersByQuestion ?? new Map();
      let correct = 0;
      let wrong = 0;

      session.questions.forEach((question, questionIndex) => {
        const selectedAnswer = answers.get(questionIndex);
        const correctAnswer = question.correctAnswer ?? question.correct_answer;

        if (selectedAnswer === undefined || selectedAnswer === null) {
          wrong += 1;
          return;
        }

        if (selectedAnswer === correctAnswer) {
          correct += 1;
        } else {
          wrong += 1;
        }
      });

      return {
        userId: player.user_id,
        username: player.user.username,
        correct,
        wrong
      };
    })
    .sort((left, right) => right.correct - left.correct || left.username.localeCompare(right.username));
}

async function finalizeRoom(io, roomId) {
  const room = await prisma.room.findUnique({
    where: { room_id: roomId },
    select: { status: true, host_id: true }
  });

  if (room?.status === "finished") {
    return;
  }

  const timer = roomTimers.get(roomId);

  if (timer?.intervalId) {
    clearInterval(timer.intervalId);
  }

  roomTimers.delete(roomId);

  try {
    await prisma.room.update({
      where: { room_id: roomId },
      data: { status: "finished" }
    });
  } catch (error) {
    console.error(`Error finishing room ${roomId}:`, error);
  }

  const summary = await buildRoomSummary(roomId);
  roomSessions.delete(roomId);

  const roomState = await getRoomState(roomId);
  const hostId = roomState?.hostId ?? room?.host_id ?? timer?.hostId ?? null;

  io.to(roomId).emit("room_state", {
    roomId,
    status: "finished",
    hostId,
    gameName: "trivia"
  });
  io.to(roomId).emit("game_summary", { roomId, summary });
  io.to(roomId).emit("game_ended", { roomId, summary });
}

async function endRoomTimer(io, roomId) {
  await finalizeRoom(io, roomId);
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
      void endRoomTimer(io, roomId);
    }
  }, 1000);

  roomTimers.set(roomId, { hostId, endsAt, totalDurationMs, intervalId });

  io.to(roomId).emit("room_timer", {
    roomId,
    totalMs: totalDurationMs,
    remainingMs: totalDurationMs
  });
}

function sanitizeQuestionForClient(question) {
  if (!question) {
    return null;
  }

  const { correctAnswer, correct_answer, ...rest } = question;
  return rest;
}

function getOrCreatePlayerState(session, userId) {
  const existing = session.players.get(userId);

  if (existing) {
    return existing;
  }

  const nextState = {
    currentIndex: 0,
    answersByQuestion: new Map(),
    completed: false
  };

  session.players.set(userId, nextState);
  return nextState;
}

async function initializeSessionPlayers(roomId, session) {
  const participants = await prisma.roomPlayer.findMany({
    where: { room_id: roomId },
    select: { user_id: true }
  });

  for (const participant of participants) {
    getOrCreatePlayerState(session, participant.user_id);
  }
}

function emitPlayerQuestion(socket, roomId, userId) {
  const session = roomSessions.get(roomId);

  if (!session || !Array.isArray(session.questions)) {
    return;
  }

  const playerState = getOrCreatePlayerState(session, userId);
  const currentQuestion = session.questions[playerState.currentIndex];

  if (!currentQuestion) {
    socket.emit("question_finished", {
      roomId,
      userId,
      questionIndex: playerState.currentIndex,
      totalQuestions: session.questions.length
    });
    return;
  }

  socket.emit("question_started", {
    roomId,
    questionIndex: playerState.currentIndex,
    totalQuestions: session.questions.length,
    question: sanitizeQuestionForClient(currentQuestion)
  });
}

function emitAllPlayerQuestions(io, roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);

  if (!room) {
    return;
  }

  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);

    if (socket?.user?.id) {
      emitPlayerQuestion(socket, roomId, socket.user.id);
    }
  }
}

async function checkRoomFinished(io, roomId) {
  const session = roomSessions.get(roomId);

  if (!session || !Array.isArray(session.questions)) {
    return;
  }

  await initializeSessionPlayers(roomId, session);

  const participants = await prisma.roomPlayer.findMany({
    where: { room_id: roomId },
    select: { user_id: true }
  });

  const everyoneFinished = participants.length > 0 && participants.every(({ user_id }) => {
    const state = session.players.get(user_id);
    return state?.completed || state?.currentIndex >= session.questions.length;
  });

  if (everyoneFinished) {
    await finalizeRoom(io, roomId);
  }
}

async function emitRoomQuestions(io, roomId) {
  try {
    const questions = await getOrCreateRoomQuestionSet(prisma, roomId, { amount: 10 });
    const session = {
      questions: questions.map((question) => ({
        ...question,
        correctAnswer: question.correctAnswer ?? question.correct_answer ?? question.answers?.[0] ?? ""
      })),
      players: new Map()
    };

    roomSessions.set(roomId, session);
    await initializeSessionPlayers(roomId, session);

    io.to(roomId).emit("room_questions", {
      roomId,
      gameName: "trivia",
      questions
    });

    emitAllPlayerQuestions(io, roomId);
    return questions;
  } catch (error) {
    console.error(`Error loading room questions for ${roomId}:`, error);
    return [];
  }
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

async function ensureRoomHost(io, roomId, fallbackUserId) {
  const room = await prisma.room.findUnique({
    where: { room_id: roomId },
    select: { room_id: true, host_id: true, status: true }
  });

  if (!room) {
    return null;
  }

  const hostStillExists = await prisma.roomPlayer.findFirst({
    where: {
      room_id: roomId,
      user_id: room.host_id
    }
  });

  if (hostStillExists) {
    return room.host_id;
  }

  const nextHostId = fallbackUserId ?? (await prisma.roomPlayer.findFirst({
    where: { room_id: roomId },
    orderBy: { joined_at: "asc" },
    select: { user_id: true }
  }))?.user_id;

  if (!nextHostId) {
    return null;
  }

  const updatedRoom = await prisma.room.update({
    where: { room_id: roomId },
    data: { host_id: nextHostId }
  });

  io.to(roomId).emit("room_state", {
    roomId: updatedRoom.room_id,
    hostId: updatedRoom.host_id,
    status: updatedRoom.status
  });

  return updatedRoom.host_id;
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
    await endRoomTimer(io, roomId);
    return;
  }

  if (explicitLeave && room.status !== "started" && room.status !== "finished") {
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
      const currentMembership = await prisma.roomPlayer.findFirst({
        where: { user_id: userId },
        orderBy: { joined_at: "desc" }
      });

      if (currentMembership && currentMembership.room_id !== roomId) {
        socket.emit("room_error", { message: "You are already in another room. Leave it before joining a new one." });
        return;
      }

      const existingPlayer = await prisma.roomPlayer.findUnique({
        where: { user_id: userId }
      });

      if (existingPlayer && existingPlayer.room_id !== roomId) {
        socket.emit("room_error", { message: "You are already in another room. Leave it before joining a new one." });
        return;
      }

      if (existingPlayer) {
        socket.join(roomId);
        await ensureRoomHost(io, roomId, userId);

        const roomState = await getRoomState(roomId);
        if (roomState) {
          socket.emit("room_state", roomState);

          if (roomState.status === "started") {
            const questions = await emitRoomQuestions(io, roomId);
            socket.emit("game_started", { roomId: roomState.roomId, gameName: roomState.gameName ?? "trivia", questions });
            socket.emit("room_timer", {
              roomId: roomState.roomId,
              totalMs: roomState.durationSeconds ? roomState.durationSeconds * 1000 : DEFAULT_ROOM_DURATION_MS,
              remainingMs: getRoomRemainingMs(roomId)
            });
            if (roomState.status === "started") {
              emitPlayerQuestion(socket, roomId, userId);
            }
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
      await ensureRoomHost(io, roomId, userId);
      console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

      const roomState = await getRoomState(roomId);
      if (roomState) {
        socket.emit("room_state", roomState);

        if (roomState.status === "started") {
          const totalDurationMs = roomState.durationSeconds * 1000;
          const questions = await emitRoomQuestions(io, roomId);
          socket.emit("game_started", { roomId: roomState.roomId, gameName: roomState.gameName ?? "trivia", questions });
          socket.emit("room_timer", {
            roomId: roomState.roomId,
            totalMs: totalDurationMs,
            remainingMs: getRoomRemainingMs(roomId)
          });
          emitPlayerQuestion(socket, roomId, userId);
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

  socket.on("submit_answer", async ({ roomId, questionIndex, answer }) => {
    try {
      const session = roomSessions.get(roomId);

      if (!session) {
        socket.emit("answer_error", { message: "The game has not started yet." });
        return;
      }

      const playerState = getOrCreatePlayerState(session, userId);
      const expectedQuestionIndex = Number(questionIndex);
      const currentQuestion = session.questions[playerState.currentIndex];

      if (expectedQuestionIndex !== playerState.currentIndex || !currentQuestion) {
        socket.emit("answer_error", { message: "This question is no longer active." });
        return;
      }

      playerState.answersByQuestion.set(expectedQuestionIndex, answer);

      const correctAnswer = currentQuestion.correctAnswer ?? currentQuestion.correct_answer;
      socket.emit("answer_received", {
        roomId,
        questionIndex: expectedQuestionIndex,
        selectedAnswer: answer,
        isCorrect: answer === correctAnswer
      });

      const nextIndex = playerState.currentIndex + 1;

      if (nextIndex < session.questions.length) {
        playerState.currentIndex = nextIndex;
        emitPlayerQuestion(socket, roomId, userId);
      } else {
        playerState.completed = true;
        socket.emit("player_finished", {
          roomId,
          userId,
          questionIndex: playerState.currentIndex,
          totalQuestions: session.questions.length
        });
      }

      await checkRoomFinished(io, roomId);
    } catch (error) {
      console.error("Error submitting answer:", error);
      socket.emit("answer_error", { message: "Unable to submit that answer." });
    }
  });

  socket.on("start_game", async (roomId) => {
    try {
      const room = await prisma.room.findUnique({
        where: { room_id: roomId },
        select: { room_id: true, host_id: true, game_name: true, status: true, duration_seconds: true }
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
        const totalDurationMs = await getRoomDurationMs(roomId);
        const questions = await emitRoomQuestions(io, roomId);

        io.to(roomId).emit("game_started", { roomId: room.room_id, gameName: room.game_name ?? "trivia", questions });
        io.to(roomId).emit("room_state", {
          roomId: room.room_id,
          hostId: room.host_id,
          gameName: room.game_name ?? "trivia",
          status: room.status,
          durationSeconds: room.duration_seconds ?? 120
        });
        io.to(roomId).emit("room_timer", {
          roomId: room.room_id,
          totalMs: totalDurationMs,
          remainingMs: getRoomRemainingMs(roomId)
        });
        return;
      }

      const updatedRoom = await prisma.room.update({
        where: { room_id: roomId },
        data: { status: "started" }
      });

      await startRoomTimer(io, roomId, userId);
      const questions = await emitRoomQuestions(io, roomId);

      io.to(roomId).emit("game_started", { roomId: updatedRoom.room_id, gameName: updatedRoom.game_name ?? "trivia", questions });
      io.to(roomId).emit("room_state", {
        roomId: updatedRoom.room_id,
        hostId: updatedRoom.host_id,
        gameName: updatedRoom.game_name ?? "trivia",
        status: updatedRoom.status,
        durationSeconds: updatedRoom.duration_seconds ?? 120
      });
      io.to(roomId).emit("room_timer", {
        roomId: updatedRoom.room_id,
        totalMs: updatedRoom.duration_seconds ? updatedRoom.duration_seconds * 1000 : DEFAULT_ROOM_DURATION_MS,
        remainingMs: updatedRoom.duration_seconds ? updatedRoom.duration_seconds * 1000 : DEFAULT_ROOM_DURATION_MS
      });
      emitAllPlayerQuestions(io, roomId);
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