import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
        <div className="loginPage">
            <div className="loginPage">
                <form onSubmit={handleSubmit} className="loginForm">
                    <FormInput 
                        label="email" 
                        type="email" 
                        name="email" 
                        id="email" 
                        placeholder="Enter your email" 
                        value={email} 
                        onChange={setEmail} 
                    />
                    <FormInput 
                        label="password" 
                        type="password" 
                        name="password" 
                        id="password" 
                        placeholder="Enter your password" 
                        value={password} 
                        onChange={setPassword} 
                    />
                    <div className="loginButton">
                        <button type="submit">Login</button>
                    </div>
                </form>
            </div>
        </div>
    )
}