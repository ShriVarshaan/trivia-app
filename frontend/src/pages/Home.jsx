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
    return (
        <div>
            <h1>Welcome to the Trivia App { user.username } !</h1>
            <p>Test your knowledge and have fun!</p>
        </div>
    );
}

export default Home;