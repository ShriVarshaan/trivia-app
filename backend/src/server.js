import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { socketAuthMiddleware } from "./middleware/socketMiddleware.js";
import { registerRoomHandlers } from "./sockets/roomSocket.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import passport from "./config/passport.js";
import { prisma } from "./config/prisma.js";

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
};

const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.json());
app.use(cors(corsOptions));
app.use(passport.initialize());

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/user", userRoutes);
app.use("/api/friends", friendRoutes);

io.use(socketAuthMiddleware);

io.on("connection", async (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    if (socket.user?.id) {
        socket.join(`user_${socket.user.id}`);
        try {
            await prisma.user.update({
                where: { id: socket.user.id },
                data: { is_online: true }
            });
            io.emit("user_status_changed", { userId: socket.user.id, isOnline: true });
        } catch (err) {
            console.error("Error setting user online:", err);
        }
    }

    registerRoomHandlers(io, socket);

    socket.on("disconnect", async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        if (socket.user?.id) {
            try {
                // Check if the user has other active sockets
                const sockets = await io.fetchSockets();
                const hasOtherConnections = sockets.some(s => s.user?.id === socket.user.id && s.id !== socket.id);

                if (!hasOtherConnections) {
                    await prisma.user.update({
                        where: { id: socket.user.id },
                        data: { is_online: false }
                    });
                    io.emit("user_status_changed", { userId: socket.user.id, isOnline: false });
                }
            } catch (err) {
                console.error("Error setting user offline:", err);
            }
        }
    });
});

server.listen(3000, async () => {
    console.log("The server is running on port 3000");
    try {
        await prisma.user.updateMany({
            data: { is_online: false }
        });
        console.log("Reset all users to offline status on server start.");
    } catch (err) {
        console.error("Failed to reset user statuses:", err);
    }
});