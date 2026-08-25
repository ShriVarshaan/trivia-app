import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../config/axios.js";

function Friends() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        const fetchFriends = async () => {
            try {
                const response = await axios.get("/friends");
                setFriends(response.data.friends);
            } catch (err) {
                console.error("Error fetching friends:", err);
                setError("Failed to load friends.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFriends();
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    return (
        <div className="page-container" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <h2 style={{ color: 'var(--accent-neon)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>My Friends ({friends.length})</span>
                    <button className="btn-secondary" onClick={() => navigate("/profile")}>Back to Profile</button>
                </h2>
                
                {error && <p style={{ color: '#ff4d4d' }}>{error}</p>}
                
                {isLoading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading friends...</p>
                ) : friends.length > 0 ? (
                    <div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            {friends.map((friendUser) => (
                                <div 
                                    key={friendUser.id}
                                    onClick={() => navigate(`/profile/${friendUser.username}`)}
                                    className="glass-card"
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '1.5rem',
                                        transition: 'transform 0.2s, background-color 0.2s',
                                        aspectRatio: '1',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                    }}
                                >
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-dark)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1rem',
                                        border: '2px solid var(--card-border)',
                                        fontSize: '2rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {friendUser.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', wordBreak: 'break-all', textAlign: 'center' }}>
                                        {friendUser.username}
                                    </span>
                                    {friendUser.is_online ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.5rem' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 5px #00ffcc' }}></span>
                                            <span style={{ fontSize: '0.8rem', color: '#00ffcc' }}>Online</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.5rem' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'gray' }}></span>
                                            <span style={{ fontSize: '0.8rem', color: 'gray' }}>Offline</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '1rem' }}>
                            You don't have any friends yet.
                        </p>
                        <button className="btn-neon" onClick={() => navigate("/")}>Find Players</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Friends;
