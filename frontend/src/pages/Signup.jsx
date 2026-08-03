import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormInput from "../components/FormInput.jsx";
import axios from "../config/axios.js";

export default function Signup(){
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(event){
        event.preventDefault();

        try{
            const response = await axios.post("/auth/signup", {username, email, password});
            const token = response.data.token;
            localStorage.setItem("token", token);
            navigate("/");
        } catch (error) {
            console.error("Signup failed:", error);
            alert("Signup failed. Please check your details and try again.");
        }
    }


    return(
        <div className="signupPage">
            <form onSubmit={handleSubmit} className="signupForm">
                <FormInput
                    label="username"
                    type="text"
                    name="username"
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={setUsername}
                />
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

                <div className="sigupButton">
                    <button type="submit">Signup</button>
                </div>
            </form>
        </div>
    )
}