import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/" className="navbar-logo">TriviaBlitz</Link>
            </div>
            <div className="navbar-links">
                {isAuthenticated ? (
                    <button onClick={handleLogout} className="btn-secondary" style={{ marginTop: 0, padding: '0.5rem 1rem' }}>Logout</button>
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
