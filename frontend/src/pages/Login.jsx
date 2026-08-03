import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../config/axios.js";
import FormInput from "../components/FormInput.jsx";

export default function Login(){

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(event){
        event.preventDefault();

        try{
            const response = await axios.post("/auth/login", {email, password});
            const token = response.data.token;
            localStorage.setItem("token", token);
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
                    <div className="loginButton">
                        <button type="submit">Login</button>
                    </div>
                </form>
            </div>
        </div>
    )
}