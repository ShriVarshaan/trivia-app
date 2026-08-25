import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../config/axios.js";

function Home() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    const handleProtectedAction = (path) => {
        if (!isAuthenticated) {
            navigate("/login");
        } else {
            navigate(path);
        }
    };

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                setHasMore(false);
                return;
            }

            setIsSearching(true);
            setError(null);
            try {
                const response = await axios.get(`/user/search?q=${encodeURIComponent(searchQuery)}&page=${page}`);
                const newUsers = response.data.users;
                
                if (page === 1) {
                    setSearchResults(newUsers);
                } else {
                    setSearchResults(prev => [...prev, ...newUsers]);
                }
                
                if (newUsers.length < 30) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            } catch (err) {
                console.error("Error searching users:", err);
                setError("Failed to search users.");
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchSearchResults, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, page]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setPage(1); // Reset page on new query
    };

    const handleLoadMore = () => {
        if (hasMore && !isSearching) {
            setPage(prev => prev + 1);
        }
    };
    
    return (
        <div className="page-container">
            <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--accent-neon)' }}>Trivia Time!</h1>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    {isAuthenticated && user ? `Welcome, ${user.username}` : "Welcome to TriviaBlitz!"}
                </h2>
                <p style={{ marginBottom: '2rem' }}>Test your knowledge and have fun!</p>
                
                <button className="btn-neon" onClick={() => handleProtectedAction('/create-room')}>Create Room</button>
                <button className="btn-secondary" onClick={() => handleProtectedAction('/join-room')}>Join Room</button>
            </div>

            {isAuthenticated && (
                <div className="glass-card" style={{ width: '100%', maxWidth: '600px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent-neon)' }}>Find Players</h3>
                    <input 
                        type="text" 
                        placeholder="Search by username..." 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{
                            width: '100%',
                            padding: '10px 15px',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            marginBottom: '1rem',
                            outline: 'none'
                        }}
                    />
                    
                    {error && <p style={{ color: '#ff4d4d' }}>{error}</p>}
                    
                    {searchResults.length > 0 && (
                        <div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {searchResults.map((searchUser) => (
                                    <li 
                                        key={searchUser.id}
                                        onClick={() => navigate(`/profile/${searchUser.username}`)}
                                        style={{
                                            padding: '10px 15px',
                                            borderBottom: '1px solid var(--card-border)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{searchUser.username}</span>
                                            {searchUser.is_online && (
                                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 5px #00ffcc' }} title="Online"></span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {hasMore && (
                                <button 
                                    className="btn-secondary" 
                                    onClick={handleLoadMore}
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    disabled={isSearching}
                                >
                                    {isSearching ? "Loading..." : "Load More"}
                                </button>
                            )}
                        </div>
                    )}
                    
                    {searchQuery.trim() && searchResults.length === 0 && !isSearching && !error && (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
                            No players found matching "{searchQuery}"
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default Home;