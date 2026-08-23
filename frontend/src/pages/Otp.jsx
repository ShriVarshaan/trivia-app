import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FormInput from "../components/FormInput.jsx";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios.js";

export default function Otp() {
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { user, isAuthenticated, updateUser } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
        } else if (user?.verified) {
            navigate("/");
        }
    }, [isAuthenticated, user, navigate]);

    async function handleVerify(e) {
        e.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await axios.post("/auth/verify-otp", { email: user.email, otp });
            updateUser(response.data.user);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.message || "Verification failed. Please check the OTP.");
        }
    }

    async function handleResend() {
        setMessage("");
        setError("");
        
        try {
            await axios.post("/auth/resend-otp", { email: user.email });
            setMessage("A new OTP has been sent to your email.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend OTP.");
        }
    }

    return (
        <div className="page-container">
            <div className="glass-card">
                <h1>Verify Email</h1>
                <p style={{ textAlign: "center", marginBottom: "2rem", color: "var(--text-secondary)" }}>
                    We've sent a 6-digit OTP to your email: {user?.email}
                </p>
                <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <FormInput
                        label="Enter OTP"
                        type="text"
                        name="otp"
                        id="otp"
                        placeholder="123456"
                        value={otp}
                        onChange={setOtp}
                    />
                    
                    {error && <p style={{ color: "#ff4d4d", textAlign: "center" }}>{error}</p>}
                    {message && <p style={{ color: "var(--accent-neon)", textAlign: "center" }}>{message}</p>}

                    <button type="submit" className="btn-neon" disabled={!otp}>Verify</button>
                    <button type="button" className="btn-secondary" onClick={handleResend}>Resend OTP</button>
                </form>
            </div>
        </div>
    );
}
