import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../config/socket";

export default function Leaderboard() {
  const { roomId } = useParams();
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    const savedSummary = localStorage.getItem(`room_summary:${roomId}`);
    if (savedSummary) {
      setSummary(JSON.parse(savedSummary));
    }

    const handleGameSummary = ({ summary: nextSummary = [] }) => {
      setSummary(nextSummary);
      localStorage.setItem(`room_summary:${roomId}`, JSON.stringify(nextSummary));
    };

    socket.on("game_summary", handleGameSummary);

    return () => {
      socket.off("game_summary", handleGameSummary);
    };
  }, [roomId]);

  return (
    <div>
      <h1>Leaderboard</h1>
      <p>Room: {roomId}</p>
      <p>The game has ended.</p>

      {summary.length === 0 ? (
        <p>No results available yet.</p>
      ) : (
        <ol>
          {summary.map((entry) => (
            <li key={entry.userId}>
              <strong>{entry.username}</strong> — {entry.correct} correct, {entry.wrong} wrong
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
