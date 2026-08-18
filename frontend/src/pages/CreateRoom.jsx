import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

const ROOM_TIME_OPTIONS = Array.from(
    { length: ((10 * 60) - 120) / 15 + 1 },
    (_, index) => 120 + index * 15
);

function CreateRoom() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [durationSeconds, setDurationSeconds] = useState(120);

    const handleCreateRoom = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.post("/room/create", {
                maxPlayers: Number(maxPlayers),
                durationSeconds: Number(durationSeconds)
            });
            const { room } = response.data;
            navigate(`/room/${room.room_id}`);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to create room. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            alert("You are not logged in! Please log in to access the home page.");
            navigate("/login");
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <div className="page-container">
            <div className="glass-card">
                <h2>Create a Room</h2>
                {error && <p className="error-msg">{error}</p>}

                <div className="form-group">
                    <label htmlFor="maxPlayers">Max Players</label>
                    <select
                        id="maxPlayers"
                        className="input-field"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        disabled={loading}
                    >
                        {Array.from({ length: 9 }, (_, index) => index + 2).map((value) => (
                            <option key={value} value={value} style={{ color: "black" }}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="roomDuration">Room Time</label>
                    <select
                        id="roomDuration"
                        className="input-field"
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(Number(e.target.value))}
                        disabled={loading}
                    >
                        {ROOM_TIME_OPTIONS.map((value) => {
                            const minutes = Math.floor(value / 60);
                            const seconds = value % 60;
                            const label = `${minutes}:${String(seconds).padStart(2, "0")}`;

                            return (
                                <option key={value} value={value} style={{ color: "black" }}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <button className="btn-neon" onClick={handleCreateRoom} disabled={loading}>
                        {loading ? "Creating..." : "Create Room"}
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/')}>Back to Home</button>
                </div>
            </div>
        </div>
    );
}

export default CreateRoom;