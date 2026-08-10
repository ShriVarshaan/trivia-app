import {prisma} from "../config/prisma.js"
import { customAlphabet } from 'nanoid';

export async function createRoom(req, res){
    let attempts = 0;
    const attemptLimit = 5;
    const generateCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);
    let maxPlayers = 2; // Default value if not provided

    while (attempts < attemptLimit) {
        const roomCode = generateCode();
        const existingRoom = await prisma.room.findUnique({
            where: { room_id: roomCode }
        });

        if (req.body && req.body.maxPlayers) {
            maxPlayers = parseInt(req.body.maxPlayers);
        }

        if (maxPlayers < 2 || maxPlayers > 10) {
            return res.status(400).json({ message: "Max players must be between 2 and 10" });
        }

        if (!existingRoom) {
            const newRoom = await prisma.room.create({
                data: {
                    room_id: roomCode,
                    host: req.user.id,
                    max_players: maxPlayers
                }
            });
            return res.status(201).json({ message: "Room created successfully", room: newRoom });
        }
        attempts++;
    }

    return res.status(400).json({ message: "Failed to create room" });
}