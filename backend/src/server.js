import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { socketAuthMiddleware } from "./middleware/socketMiddleware.js";
import { registerRoomHandlers } from "./sockets/roomSocket.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import passport from "./config/passport.js";

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

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerRoomHandlers(io, socket);

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log("The server is running on port 3000");
});