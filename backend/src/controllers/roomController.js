import {prisma} from "../config/prisma.js"
import { customAlphabet } from 'nanoid';

export async function createRoom(req, res){
    let attempts = 0;
    const attemptLimit = 5;
    const generateCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);
    let maxPlayers = 2;
    let durationSeconds = 120;

    while (attempts < attemptLimit) {
        const roomCode = generateCode();
        const existingRoom = await prisma.room.findUnique({
            where: { room_id: roomCode }
        });

        if (req.body) {
            if (req.body.maxPlayers !== undefined) {
                maxPlayers = parseInt(req.body.maxPlayers, 10);
            }

            if (req.body.durationSeconds !== undefined) {
                durationSeconds = parseInt(req.body.durationSeconds, 10);
            }
        }

        if (maxPlayers < 2 || maxPlayers > 10) {
            return res.status(400).json({ message: "Max players must be between 2 and 10" });
        }

        if (!Number.isInteger(durationSeconds) || durationSeconds < 120 || durationSeconds > 600 || durationSeconds % 15 !== 0) {
            return res.status(400).json({ message: "Room duration must be between 2 and 10 minutes in 15 second increments" });
        }

        if (!existingRoom) {
            const newRoom = await prisma.room.create({
                data: {
                    room_id: roomCode,
                    host_id: req.user.id,
                    max_players: maxPlayers,
                    cur_players: 1,
                    duration_seconds: durationSeconds,
                    players: {
                        create: {
                        user_id: req.user.id,
                        is_ready: true
                        }
                    }
                },
                include: {
                    players: true
                }
            });
            return res.status(201).json({ message: "Room created successfully", room: newRoom });
        }
        attempts++;
    }

    return res.status(400).json({ message: "Failed to create room" });
}

export async function joinRoom(req, res) {
    const { roomCode } = req.body;
    const userId = req.user.id;

    if (!roomCode) {
        return res.status(400).json({ message: "Room code is required" });
    }

    try {
        // Atomic transaction to check room capacity, create RoomPlayer, and increment count
        const result = await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { room_id: roomCode }
            });

            if (!room) {
                throw new Error("ROOM_NOT_FOUND");
            }

            if (room.cur_players >= room.max_players) {
                throw new Error("ROOM_FULL");
            }

            // 1. Insert into RoomPlayer
            const roomPlayer = await tx.roomPlayer.create({
                data: {
                    user_id: userId,
                    room_id: roomCode
                }
            });

            // 2. Increment room cur_players count
            const updatedRoom = await tx.room.update({
                where: { room_id: roomCode },
                data: { cur_players: { increment: 1 } }
            });

            return { roomPlayer, updatedRoom };
        });

        return res.status(200).json({ message: "Successfully joined room", data: result });
    } catch (error) {
        if (error.message === "ROOM_NOT_FOUND") {
            return res.status(404).json({ message: "Room not found" });
        }
        if (error.message === "ROOM_FULL") {
            return res.status(400).json({ message: "Room is full" });
        }
        // Unique constraint violation on @@unique([user_id, room_id])
        if (error.code === "P2002") {
            return res.status(400).json({ message: "User is already in this room" });
        }

        console.error("Error joining room:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}