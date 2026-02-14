import { useState, useEffect } from 'react';
import * as api from '../api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const result = await api.checkSetupStatus();
      setNeedsSetup(result.needsSetup);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (needsSetup) {
        // Setup mode - creating first admin
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        const result = await api.setup(email, password);
        onLogin(result.token, result.user);
      } else {
        // Login mode
        const result = await api.login(email, password);
        onLogin(result.token, result.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/logo-icon.png" alt="The Wishlist" className="login-logo" />
          <h1>Sales Pipeline</h1>
          {needsSetup && (
            <p className="setup-notice">Welcome! Create your admin account to get started.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={needsSetup ? 'Create a password (8+ characters)' : 'Enter your password'}
            />
          </div>

          {needsSetup && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : (needsSetup ? 'Create Admin Account' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
