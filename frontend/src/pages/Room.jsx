import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useAuth } from "../context/AuthContext";

const formatTime = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function Room() {
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join_room", roomId);

    const handleRoomPlayers = (playerList) => setPlayers(playerList);
    const handleRoomState = (roomState) => {
      setIsHost(Number(roomState.hostId) === Number(user?.id));
      const started = roomState.status === "started";
      setGameStarted(started);

      if (roomState.status === "finished") {
        navigate(`/room/${roomId}/leaderboard`);
      }
    };
    const handleRoomTimer = ({ remainingMs = 0 }) => {
      setTimeLeftMs(Math.max(0, remainingMs));

      if (remainingMs <= 0) {
        setGameStarted(false);
      }
    };
    const handleGameStarted = () => setGameStarted(true);
    const handleGameEnded = () => navigate(`/room/${roomId}/leaderboard`);
    const handleRoomError = (data) => {
      console.error(data?.message || "Room action failed");
      alert(data?.message || "Room action failed");
    };

    socket.on("room_players", handleRoomPlayers);
    socket.on("room_state", handleRoomState);
    socket.on("room_timer", handleRoomTimer);
    socket.on("game_started", handleGameStarted);
    socket.on("game_ended", handleGameEnded);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_players", handleRoomPlayers);
      socket.off("room_state", handleRoomState);
      socket.off("room_timer", handleRoomTimer);
      socket.off("game_started", handleGameStarted);
      socket.off("game_ended", handleGameEnded);
      socket.off("room_error", handleRoomError);
      socket.emit("leave_room", roomId);
    };
  }, [roomId, user?.id, navigate]);

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
        <>
          <p>Game started! The quiz is now live for everyone in the room.</p>
          <p>Time remaining: {formatTime(timeLeftMs)}</p>
        </>
      ) : (
        <>
          <p>{isHost ? "You are the host." : "Waiting for the host to start the game."}</p>
          {isHost && <button onClick={handleStartGame}>Start Game</button>}
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