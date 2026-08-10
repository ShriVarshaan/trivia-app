import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

function CreateRoom() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleCreateRoom = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.post("/room/create");
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
        <div>
            <h2>Create a Room</h2>
            {error && <p>{error}</p>}
            <button onClick={handleCreateRoom} disabled={loading}>
                {loading ? "Creating..." : "Create Room"}
            </button>
        </div>
    );
}

export default CreateRoom;