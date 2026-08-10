import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

function JoinRoom() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        
        if (!roomId.trim()) {
            setError("Please enter a Room ID.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axios.post("/room/join", { roomCode: roomId.trim() });
            const { room } = response.data;
            
            navigate(`/room/${room?.room_id || roomId.trim()}`);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to join room. Please check the Room ID and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            alert("You are not logged in! Please log in to join a room.");
            navigate("/login");
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <div>
            <h2>Join a Room</h2>
            <form onSubmit={handleJoinRoom}>
                {error && <p>{error}</p>}
                <div>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <button type="submit" disabled={loading || !roomId.trim()}>
                    {loading ? "Joining..." : "Join Room"}
                </button>
            </form>
        </div>
    );
}

export default JoinRoom;