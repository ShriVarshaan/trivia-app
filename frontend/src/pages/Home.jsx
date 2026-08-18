import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";


function Home() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            alert("You are not logged in! Please log in to access the home page.");
            navigate("/login");
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated || !user) {
        return null;
    }
    
    return (
        <div className="page-container">
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h1 style={{ color: 'var(--accent-neon)' }}>Trivia Time!</h1>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Welcome, { user.username }</h2>
                <p style={{ marginBottom: '2rem' }}>Test your knowledge and have fun!</p>
                
                <button className="btn-neon" onClick={() => navigate('/create-room')}>Create Room</button>
                <button className="btn-secondary" onClick={() => navigate('/join-room')}>Join Room</button>
            </div>
        </div>
    );
}

export default Home;