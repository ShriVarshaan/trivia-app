import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useAuth } from "../context/AuthContext";

export default function Room() {
  const { roomId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!roomId) return;

    // 1. Join the Socket.IO room channel
    socket.emit("join_room", roomId);

    // 2. Define event handlers
    const handleUserJoined = (data) => {
      console.log("Notification:", data.message);
    };

    // 3. Attach socket listeners
    socket.on("user_joined", handleUserJoined);

    // 4. Cleanup on unmount or route change
    return () => {
      socket.off("user_joined", handleUserJoined);
      socket.emit("leave_room", roomId);
    };
  }, [roomId]);

  const handleLeaveRoom = () => {
    navigate("/");
  };

  return (
    <div>
      <h1>Room ID: {roomId}</h1>
      <p>Welcome, {user?.username || "Player"}</p>

      <button onClick={handleLeaveRoom}>Leave Room</button>
    </div>
  );
}