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
    <div>
      <h1>Room ID: {roomId}</h1>
      <p>Welcome, {user?.username || "Player"}</p>

      {gameStarted ? (
        <>
          <p>Game started! Each question advances as soon as someone answers it.</p>
          {questions.length > 0 && <p>Time remaining: {formatTime(timeLeftMs)}</p>}

          {currentQuestion ? (
            <div>
              <h3>Question {currentQuestionIndex + 1} of {totalQuestions || questions.length || 1}</h3>
              <p>{currentQuestion.question}</p>

              <div>
                {currentQuestion.answers?.map((answer, answerIndex) => (
                  <button
                    key={`${answer}-${answerIndex}`}
                    type="button"
                    onClick={() => !hasSubmittedAnswer && setSelectedAnswer(answer)}
                    disabled={hasSubmittedAnswer}
                    style={{
                      display: "block",
                      margin: "8px 0",
                      opacity: hasSubmittedAnswer ? 0.7 : 1,
                      background: selectedAnswer === answer ? "#2d6cdf" : "#f0f0f0",
                      color: selectedAnswer === answer ? "white" : "black"
                    }}
                  >
                    {answer}
                  </button>
                ))}
              </div>

              {!hasSubmittedAnswer && (
                <button type="button" onClick={handleAnswerSubmit} disabled={!selectedAnswer}>
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
          <p>{isHost ? "You are the host." : "Waiting for the host to start the game."}</p>
          {isHost && (
            <button onClick={handleStartGame} disabled={isLoadingGame}>
              {isLoadingGame ? "Loading..." : "Start Game"}
            </button>
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