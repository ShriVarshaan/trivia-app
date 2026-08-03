import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const corsOptions = {
    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
};

app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/auth", authRoutes);

app.listen(3000, () => {
    console.log("The server is running on port 3000");
})