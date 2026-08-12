import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useAuth } from "../context/AuthContext";

export default function Room() {
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join_room", roomId);

    const handleRoomPlayers = (playerList) => setPlayers(playerList);
    const handleUserJoined = (data) => console.log("Notification:", data.message);

    socket.on("room_players", handleRoomPlayers);
    socket.on("user_joined", handleUserJoined);

    return () => {
      socket.off("room_players", handleRoomPlayers);
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

      <h2>Players in Room:</h2>
      <ul>
        {players.map((player) => (
          <li key={player.userId}>
            {player.username} {player.isReady ? "(Ready)" : "(Not Ready)"}
          </li>
        ))}
      </ul>

      <button onClick={handleLeaveRoom}>Leave Room</button>
    </div>
  );
}