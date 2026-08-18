import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";


function Home() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const handleProtectedAction = (path) => {
        if (!isAuthenticated) {
            navigate("/login");
        } else {
            navigate(path);
        }
    };
    
    return (
        <div className="page-container">
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h1 style={{ color: 'var(--accent-neon)' }}>Trivia Time!</h1>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    {isAuthenticated && user ? `Welcome, ${user.username}` : "Welcome to TriviaBlitz!"}
                </h2>
                <p style={{ marginBottom: '2rem' }}>Test your knowledge and have fun!</p>
                
                <button className="btn-neon" onClick={() => handleProtectedAction('/create-room')}>Create Room</button>
                <button className="btn-secondary" onClick={() => handleProtectedAction('/join-room')}>Join Room</button>
            </div>
        </div>
    );
}

export default Home;