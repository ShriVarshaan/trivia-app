import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../config/axios.js";
import { useAuth } from "../context/AuthContext";
import FormInput from "../components/FormInput.jsx";

export default function Login(){

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
            const response = await axios.post("/auth/login", {email, password});
            const {token, user} = response.data;
            
            login(token, user);
            navigate("/");
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please check your credentials and try again.");
        }
    }


    return(
        <div className="page-container">
            <div className="glass-card">
                <h1>Login</h1>
                <form onSubmit={handleSubmit} className="loginForm">
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
                    <button type="submit" className="btn-neon">Login</button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Don't have an account? <Link to="/signup" className="link-neon">Sign up</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}