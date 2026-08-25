import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

export default function PublicProfile() {
  const { username } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // If navigating to own profile via search, redirect to regular profile
    if (user && user.username === username) {
      navigate("/profile");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`/user/${username}`);
        setProfileUser(response.data.user);
        setHistory(response.data.history);
        setError(null);
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError(err.response?.data?.message || "User not found");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, isAuthenticated, navigate, user]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ color: '#ff4d4d' }}>Error</h1>
          <p>{error || "User not found"}</p>
          <button className="btn-secondary" onClick={() => navigate("/")} style={{ marginTop: '1rem' }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentHistory = history.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
        <h1 style={{ color: 'var(--accent-neon)', textAlign: 'center' }}>Player Profile</h1>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {profileUser.username}
            {profileUser.is_online && (
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 5px #00ffcc' }} title="Online"></span>
            )}
          </h2>
        </div>

        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
          Game History
        </h3>
        
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' }}>
            {profileUser.username} hasn't played any games yet.
          </p>
        ) : (
          <div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {currentHistory.map((game) => (
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
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <button 
                className="btn-secondary" 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 1rem', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-secondary)' }}>
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, history.length)} of {history.length}
              </span>
              <button 
                className="btn-secondary" 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
                style={{ padding: '0.5rem 1rem', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
