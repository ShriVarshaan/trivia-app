import { useParams } from "react-router-dom";

export default function Leaderboard() {
  const { roomId } = useParams();

  return (
    <div>
      <h1>Leaderboard</h1>
      <p>Room: {roomId}</p>
      <p>The game has ended.</p>
    </div>
  );
}
