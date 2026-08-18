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
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ color: 'var(--accent-neon)', textAlign: 'center' }}>Leaderboard</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Room: {roomId}</p>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>The game has ended.</p>

        {summary.length === 0 ? (
          <p style={{ textAlign: 'center' }}>No results available yet.</p>
        ) : (
          <ol style={{ listStylePosition: 'inside', padding: 0 }}>
            {summary.map((entry, index) => (
              <li key={entry.userId} style={{ 
                padding: '1rem', 
                marginBottom: '1rem',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                background: index === 0 ? 'rgba(0, 243, 255, 0.1)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <strong>{index + 1}. {entry.username}</strong> 
                <span>
                  <span style={{ color: 'var(--accent-neon)' }}>{entry.correct} correct</span>, 
                  <span style={{ color: '#ff4d4d', marginLeft: '8px' }}>{entry.wrong} wrong</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
