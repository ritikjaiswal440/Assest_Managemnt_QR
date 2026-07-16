import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [clientCode, setClientCode] = useState('');

  const handleStartRequest = (e) => {
    e.preventDefault();
    if (clientCode.trim()) {
      navigate(`/request?ref=${clientCode.trim()}`);
    } else {
      alert("Please enter a valid Client Reference Code.");
    }
  };

  return (
    <div className="home-container">
      {/* Main Content */}
      <main className="home-main">
        <div className="home-hero">
          <h1>Enterprise Service Hub</h1>
          <p>Select a portal below to submit an incident, track an existing ticket, or access the administration dashboard.</p>
        </div>

        <div className="home-grid">

          {/* Card 1: Create Request */}
          <div className="home-card primary-card">
            <div className="card-icon">🛠️</div>
            <h3>New Service Request</h3>
            <p>Experience an issue? Enter your client code to log your Service Request.</p>
            <form onSubmit={handleStartRequest} className="action-form">
              <input
                type="text"
                placeholder="Enter Reference Code"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">Start Request</button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', width: '100%' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>Don't have a Reference code?</p>
              <button 
                type="button" 
                onClick={() => navigate('/general-request')} 
                style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Submit a General Request
              </button>
            </div>
          </div>

          {/* Card 2: Track Ticket */}
          <div className="home-card">
            <div className="card-icon">🔍</div>
            <h3>Track Ticket Status</h3>
            <p>Check the real-time status of an existing incident using your tracking Service Request or Ticket ID.</p>
            <div className="action-spacer">
              <button
                className="btn btn-outline"
                onClick={() => navigate('/track')}
              >
                Track a Ticket
              </button>
            </div>
          </div>

          {/* Card 3: Portal Login */}
          <div className="home-card">
            <div className="card-icon">🔐</div>
            <h3>Portal Login</h3>
            <p>Secure access for registered AV Dynamic Clients, Engineers, and System Administrators.</p>
            <div className="action-spacer">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/login')}
              >
                Access Dashboard
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Home;