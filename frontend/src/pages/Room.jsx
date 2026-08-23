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
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const chatMessagesRef = useRef(null);
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
    const handleReceiveMessage = (message) => {
      setChatMessages((prev) => [...prev, message]);
    };

    socket.on("room_players", handleRoomPlayers);
    socket.on("room_state", handleRoomState);
    socket.on("room_timer", handleRoomTimer);
    socket.on("question_started", handleQuestionStarted);
    socket.on("game_started", handleGameStarted);
    socket.on("room_questions", handleRoomQuestions);
    socket.on("game_ended", handleGameEnded);
    socket.on("room_error", handleRoomError);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("room_players", handleRoomPlayers);
      socket.off("room_state", handleRoomState);
      socket.off("room_timer", handleRoomTimer);
      socket.off("question_started", handleQuestionStarted);
      socket.off("game_started", handleGameStarted);
      socket.off("room_questions", handleRoomQuestions);
      socket.off("game_ended", handleGameEnded);
      socket.off("room_error", handleRoomError);
      socket.off("receive_message", handleReceiveMessage);

      if (joinedRoomRef.current) {
        socket.emit("leave_room", roomId);
        joinedRoomRef.current = false;
      }
    };
  }, [roomId, user?.id, navigate]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && roomId) {
      socket.emit("send_message", { roomId, message: currentMessage });
      setCurrentMessage("");
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start', width: '100%', maxWidth: '1200px', justifyContent: 'center' }}>
      <div className="glass-card" style={{ flex: '1 1 600px', maxWidth: '800px', width: '100%' }}>
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

      {/* Chat Sidebar */}
      <div className="glass-card" style={{ flex: '1 1 350px', maxWidth: '400px', display: 'flex', flexDirection: 'column', height: '80vh', width: '100%' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--accent-neon)', textAlign: 'center' }}>Room Chat</h2>
        
        <div 
          ref={chatMessagesRef}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem', paddingRight: '10px' }}
        >
          {chatMessages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 'auto' }}>No messages yet. Say hi!</p>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.userId === user?.id ? 'flex-end' : 'flex-start',
                background: msg.userId === user?.id ? 'rgba(0, 255, 204, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: msg.userId === user?.id ? '1px solid var(--accent-neon)' : '1px solid var(--card-border)',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '85%'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {msg.username} <span style={{ opacity: 0.5 }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{msg.message}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
          />
          <button type="submit" className="btn-neon" style={{ margin: 0, padding: '10px 16px' }} disabled={!currentMessage.trim()}>
            Send
          </button>
        </form>
      </div>

      </div>
    </div>
  );
}