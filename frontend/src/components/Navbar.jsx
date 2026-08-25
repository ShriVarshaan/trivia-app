import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationsPanel from "./NotificationsPanel";

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-brand">
                    <Link to="/" className="navbar-logo">TriviaBlitz</Link>
                </div>
                
                {isAuthenticated && (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 1rem' }}>
                        <form onSubmit={handleSearchSubmit} style={{ width: '100%', maxWidth: '400px' }}>
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 15px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </form>
                    </div>
                )}

                <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isAuthenticated ? (
                        <>
                            <button 
                                onClick={() => setIsNotificationsOpen(true)}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'var(--text-primary)', 
                                    cursor: 'pointer',
                                    position: 'relative',
                                    padding: '0.5rem'
                                }}
                                title="Notifications"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                            </button>
                            <Link to="/profile" className="btn-secondary" style={{ marginTop: 0, padding: '0.5rem 1rem', textDecoration: 'none' }}>Profile</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="link-neon" style={{ marginRight: '1rem' }}>Login</Link>
                            <Link to="/signup" className="btn-neon" style={{ marginTop: 0, padding: '0.5rem 1rem', display: 'inline-block', textDecoration: 'none' }}>Signup</Link>
                        </>
                    )}
                </div>
            </nav>

            <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        </>
    );
}
