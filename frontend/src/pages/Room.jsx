import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useAuth } from "../context/AuthContext";

export default function Room() {
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join_room", roomId);

    const handleRoomPlayers = (playerList) => setPlayers(playerList);
    const handleRoomState = (roomState) => {
      setIsHost(Number(roomState.hostId) === Number(user?.id));
      setGameStarted(roomState.status === "started");
    };
    const handleGameStarted = () => setGameStarted(true);
    const handleRoomError = (data) => {
      console.error(data?.message || "Room action failed");
      alert(data?.message || "Room action failed");
    };

    socket.on("room_players", handleRoomPlayers);
    socket.on("room_state", handleRoomState);
    socket.on("game_started", handleGameStarted);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_players", handleRoomPlayers);
      socket.off("room_state", handleRoomState);
      socket.off("game_started", handleGameStarted);
      socket.off("room_error", handleRoomError);
      socket.emit("leave_room", roomId);
    };
  }, [roomId, user?.id]);

  const handleLeaveRoom = () => {
    navigate("/");
  };

  const handleStartGame = () => {
    if (!roomId) return;
    socket.emit("start_game", roomId);
  };

  return (
    <div>
      <h1>Room ID: {roomId}</h1>
      <p>Welcome, {user?.username || "Player"}</p>

      {gameStarted ? (
        <p>Game started! The quiz is now live for everyone in the room.</p>
      ) : (
        <>
          <p>{isHost ? "You are the host." : "Waiting for the host to start the game."}</p>
          {isHost && (
            <button onClick={handleStartGame}>Start Game</button>
          )}
        </>
      )}

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