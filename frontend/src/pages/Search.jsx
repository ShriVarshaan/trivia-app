import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../config/axios.js";

function Search() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const query = searchParams.get("q") || "";
    
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        const fetchSearchResults = async () => {
            if (!query.trim()) {
                setSearchResults([]);
                setHasMore(false);
                return;
            }

            setIsSearching(true);
            setError(null);
            try {
                const response = await axios.get(`/user/search?q=${encodeURIComponent(query)}&page=${page}`);
                const newUsers = response.data.users;
                
                if (page === 1) {
                    setSearchResults(newUsers);
                } else {
                    setSearchResults(prev => {
                        // avoid duplicates just in case
                        const existingIds = new Set(prev.map(u => u.id));
                        const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.id));
                        return [...prev, ...uniqueNewUsers];
                    });
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

        fetchSearchResults();
    }, [query, page, isAuthenticated, navigate]);

    // Reset page when query changes
    useEffect(() => {
        setPage(1);
    }, [query]);

    const handleLoadMore = () => {
        if (hasMore && !isSearching) {
            setPage(prev => prev + 1);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="page-container" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <h2 style={{ color: 'var(--accent-neon)', marginBottom: '1.5rem' }}>
                    Search Results for "{query}"
                </h2>
                
                {error && <p style={{ color: '#ff4d4d' }}>{error}</p>}
                
                {searchResults.length > 0 ? (
                    <div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            {searchResults.map((searchUser) => (
                                <div 
                                    key={searchUser.id}
                                    onClick={() => navigate(`/profile/${searchUser.username}`)}
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
                                        {searchUser.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', wordBreak: 'break-all', textAlign: 'center' }}>
                                        {searchUser.username}
                                    </span>
                                    {searchUser.is_online ? (
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
                        {hasMore && (
                            <button 
                                className="btn-secondary" 
                                onClick={handleLoadMore}
                                style={{ width: '100%', maxWidth: '200px', margin: '0 auto', display: 'block' }}
                                disabled={isSearching}
                            >
                                {isSearching ? "Loading..." : "Load More"}
                            </button>
                        )}
                    </div>
                ) : (
                    !isSearching && !error && query.trim() && (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem', fontSize: '1.2rem' }}>
                            No players found matching "{query}"
                        </p>
                    )
                )}

                {isSearching && searchResults.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Searching...</p>
                )}
            </div>
        </div>
    );
}

export default Search;
