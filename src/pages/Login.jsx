import { useState } from 'react';
import { gasApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });

  const { login } = useAuth();

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    try {
      const response = await gasApi('login', { identifier, email: identifier, password });

      if (response?.success && response?.data?.user) {
        login(response.data.user);
      } else {
        setStatus({ loading: false, error: response?.message || "Invalid response from server." });
      }
    } catch {
      setStatus({
        loading: false,
        error: "Network error. Unable to connect to the authentication server."
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="login-logo-img" />
          <p>ProSupport Dashboard Login</p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {status.error && (
            <div className="error-banner">
              {status.error}
            </div>
          )}
          <div className="input-group">
            <label htmlFor="identifier">Email or Username</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., username or email@example.com"
              required
              disabled={status.loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={status.loading}
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={status.loading}
          >
            {status.loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Authorized personnel only. Sessions are monitored.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;