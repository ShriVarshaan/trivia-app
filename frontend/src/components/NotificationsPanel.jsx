import { useState, useEffect } from "react";
import axios from "../config/axios.js";

export default function NotificationsPanel({ isOpen, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/friends/requests");
      setRequests(response.data.requests);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await axios.post(`/friends/accept/${requestId}`);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.post(`/friends/reject/${requestId}`);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '350px',
          backgroundColor: 'var(--bg-dark)',
          borderLeft: '1px solid var(--card-border)',
          zIndex: 1000,
          padding: '1.5rem',
          overflowY: 'auto',
          boxShadow: '-5px 0 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-neon)' }}>Friend Requests</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>
        ) : requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((req) => (
              <div key={req.id} style={{ 
                padding: '1rem', 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '8px', 
                border: '1px solid var(--card-border)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--card-border)',
                    fontSize: '1.2rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {req.sender.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{req.sender.username}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn-neon" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem' }}
                    onClick={() => handleAccept(req.id)}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem' }}
                    onClick={() => handleReject(req.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
