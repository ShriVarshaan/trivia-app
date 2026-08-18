import { useEffect, useRef, useState } from "react";
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
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const joinedRoomRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    if (!joinedRoomRef.current) {
      socket.emit("join_room", roomId);
      joinedRoomRef.current = true;
    }

    const handleRoomPlayers = (playerList) => setPlayers(playerList);
    const handleRoomState = (roomState) => {
      setIsHost(Number(roomState.hostId) === Number(user?.id));
      if (roomState.questionsReady !== undefined) {
        setQuestionsReady(Boolean(roomState.questionsReady));
      }
      const started = roomState.status === "started";
      setGameStarted(started);

      if (roomState.status === "finished") {
        navigate(`/room/${roomId}/leaderboard`);
      }
    };
    const handleRoomTimer = ({ remainingMs = 0 }) => {
      setTimeLeftMs(Math.max(0, remainingMs));
    };
    const handleQuestionStarted = ({ question, questionIndex, totalQuestions: total = 0 } = {}) => {
      setCurrentQuestion(question || null);
      setCurrentQuestionIndex(Number(questionIndex) || 0);
      setTotalQuestions(total);
      setSelectedAnswer("");
      setHasSubmittedAnswer(false);
      setGameStarted(true);
    };
    const handleGameStarted = ({ questions: nextQuestions = [] } = {}) => {
      setGameStarted(true);
      if (nextQuestions.length > 0) {
        setQuestions(nextQuestions);
        setIsLoadingGame(false);
      }
    };
    const handleRoomQuestions = ({ questions: nextQuestions = [] } = {}) => {
      setQuestions(nextQuestions);
      setGameStarted(true);
      setIsLoadingGame(false);
    };
    const handleGameEnded = ({ summary = [] } = {}) => {
      localStorage.setItem(`room_summary:${roomId}`, JSON.stringify(summary));
      navigate(`/room/${roomId}/leaderboard`);
    };
    const handleRoomError = (data) => {
      console.error(data?.message || "Room action failed");
      alert(data?.message || "Room action failed");
    };

    socket.on("room_players", handleRoomPlayers);
    socket.on("room_state", handleRoomState);
    socket.on("room_timer", handleRoomTimer);
    socket.on("question_started", handleQuestionStarted);
    socket.on("game_started", handleGameStarted);
    socket.on("room_questions", handleRoomQuestions);
    socket.on("game_ended", handleGameEnded);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_players", handleRoomPlayers);
      socket.off("room_state", handleRoomState);
      socket.off("room_timer", handleRoomTimer);
      socket.off("question_started", handleQuestionStarted);
      socket.off("game_started", handleGameStarted);
      socket.off("room_questions", handleRoomQuestions);
      socket.off("game_ended", handleGameEnded);
      socket.off("room_error", handleRoomError);

      if (joinedRoomRef.current) {
        socket.emit("leave_room", roomId);
        joinedRoomRef.current = false;
      }
    };
  }, [roomId, user?.id, navigate]);

  const handleLeaveRoom = () => {
    navigate("/");
  };

  const handleStartGame = () => {
    if (!roomId) return;
    setIsLoadingGame(true);
    socket.emit("start_game", roomId);
  };

  const handleAnswerSubmit = () => {
    if (!roomId || !currentQuestion || !selectedAnswer) {
      return;
    }

    socket.emit("submit_answer", {
      roomId,
      questionIndex: currentQuestionIndex,
      answer: selectedAnswer
    });
    setHasSubmittedAnswer(true);
  };

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
        <h1 style={{ color: 'var(--accent-neon)', textAlign: 'center' }}>Room: {roomId}</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Welcome, {user?.username || "Player"}</p>

      {gameStarted ? (
        <>

          {questions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(12px)',
              color: timeLeftMs <= 10000 ? '#ff4d4d' : (timeLeftMs <= 30000 ? '#e6c200' : 'var(--text-primary)'),
              fontWeight: 'bold',
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              Time: {formatTime(timeLeftMs)}
            </div>
          )}

          {currentQuestion ? (
            <div>
              <h3>Question {currentQuestionIndex + 1} of {totalQuestions || questions.length || 1}</h3>
              <p>{currentQuestion.question}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
                {currentQuestion.answers?.map((answer, answerIndex) => (
                  <button
                    key={`${answer}-${answerIndex}`}
                    type="button"
                    className="btn-secondary"
                    onClick={() => !hasSubmittedAnswer && setSelectedAnswer(answer)}
                    disabled={hasSubmittedAnswer}
                    style={{
                      opacity: hasSubmittedAnswer ? 0.7 : 1,
                      background: selectedAnswer === answer ? "var(--accent-neon)" : "transparent",
                      color: selectedAnswer === answer ? "var(--text-dark)" : "var(--text-primary)",
                      borderColor: selectedAnswer === answer ? "var(--accent-neon)" : "var(--card-border)",
                      marginTop: 0
                    }}
                  >
                    {answer}
                  </button>
                ))}
              </div>

              {!hasSubmittedAnswer && (
                <button type="button" className="btn-neon" onClick={handleAnswerSubmit} disabled={!selectedAnswer}>
                  Submit Answer
                </button>
              )}
              {hasSubmittedAnswer && <p>Your answer has been submitted.</p>}
            </div>
          ) : (
            <p>Loading current question...</p>
          )}
        </>
      ) : (
        <>
          <p>
            {isHost
              ? "You are the host."
              : !questionsReady
              ? "Preparing trivia questions..."
              : "Waiting for the host to start the game."}
          </p>
          {isHost && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn-neon"
                onClick={handleStartGame}
                disabled={isLoadingGame || !questionsReady}
                style={{
                  opacity: (!questionsReady || isLoadingGame) ? 0.6 : 1,
                  cursor: (!questionsReady || isLoadingGame) ? "not-allowed" : "pointer"
                }}
              >
                {isLoadingGame
                  ? "Starting..."
                  : !questionsReady
                  ? "Loading Questions..."
                  : "Start Game"}
              </button>
              {!questionsReady && (
                <p style={{ fontSize: "0.85em", color: "#666", marginTop: "4px" }}>
                  Generating room questions, please wait...
                </p>
              )}
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Players in Room:</h2>
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
        {players.map((player) => (
          <li key={player.userId} style={{ padding: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
            {player.username} <span style={{ color: player.isReady ? 'var(--accent-neon)' : 'var(--text-secondary)' }}>{player.isReady ? "(Ready)" : "(Not Ready)"}</span>
          </li>
        ))}
      </ul>

      <button className="btn-secondary" onClick={handleLeaveRoom}>Leave Room</button>
      </div>
    </div>
  );
}