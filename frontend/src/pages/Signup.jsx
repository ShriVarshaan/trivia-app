import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import FormInput from "../components/FormInput.jsx";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

export default function Signup(){
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { isAuthenticated, login } = useAuth();
    
        useEffect(() => {
            if (isAuthenticated) {
                alert("You are already logged in!");
                navigate("/");
            }
        }, [isAuthenticated, navigate]);

    async function handleSubmit(event){
        event.preventDefault();

        try{
            const response = await axios.post("/auth/signup", {username, email, password});
            const { token, user } = response.data;

            login(token, user); 
            navigate("/");
        } catch (error) {
            console.error("Signup failed:", error);
            alert("Signup failed. Please check your details and try again.");
        }
    }


    return(
        <div className="page-container">
            <div className="glass-card">
                <h1>Sign Up</h1>
                <form onSubmit={handleSubmit} className="signupForm">
                    <FormInput
                        label="Username"
                        type="text"
                        name="username"
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={setUsername}
                    />
                    <FormInput
                        label="Email"
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={setEmail}
                    />
                    <FormInput
                        label="Password"
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={setPassword}
                    />

                    <button type="submit" className="btn-neon">Signup</button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Already have an account? <Link to="/login" className="link-neon">Login</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}