import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get("/user/profile");
        console.log("Profile data received:", response.data);
        setHistory(response.data.history);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await axios.delete("/user/profile");
        logout();
        navigate("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account. Please try again later.");
      }
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
        <h1 style={{ color: 'var(--accent-neon)', textAlign: 'center' }}>Player Profile</h1>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{user.username}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
        </div>

        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
          Game History
        </h3>
        
        {loading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' }}>
            You haven't played any games yet.
          </p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem' }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {history.map((game) => (
                <li key={game.id} style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>Room:</strong> {game.room_id} <br/>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                      {new Date(game.played_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--accent-neon)', fontWeight: 'bold' }}>
                      Position: #{game.position}
                    </div>
                    <div style={{ fontSize: '0.9em' }}>
                      <span style={{ color: '#00f3ff' }}>{game.correct_answers} Right</span> / <span style={{ color: '#ff4d4d' }}>{game.wrong_answers} Wrong</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={handleLogout} style={{ flex: 1 }}>
            Logout
          </button>
          <button className="btn-secondary" onClick={handleDeleteAccount} style={{ flex: 1, borderColor: '#ff4d4d', color: '#ff4d4d' }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
