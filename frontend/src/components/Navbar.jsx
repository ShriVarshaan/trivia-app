import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
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

            <div className="navbar-links">
                {isAuthenticated ? (
                    <Link to="/profile" className="btn-secondary" style={{ marginTop: 0, padding: '0.5rem 1rem', textDecoration: 'none' }}>Profile</Link>
                ) : (
                    <>
                        <Link to="/login" className="link-neon" style={{ marginRight: '1rem' }}>Login</Link>
                        <Link to="/signup" className="btn-neon" style={{ marginTop: 0, padding: '0.5rem 1rem', display: 'inline-block', textDecoration: 'none' }}>Signup</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
