import React, { useState } from 'react';
import { FileText, Sparkles, Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthView() {
  const { login, register, demoLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    setValidationError('');
    setApiError('');

    if (!email.trim()) {
      setValidationError('Please enter an email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError('Please enter a valid email address.');
      return false;
    }

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return false;
    }

    if (isRegister && username && username.length < 3) {
      setValidationError('Username must be at least 3 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');
    try {
      if (isRegister) {
        await register(email.trim(), password, username.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setApiError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setApiError('');
    try {
      await demoLogin();
    } catch (err) {
      setApiError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-panel">
        {/* Brand Header */}
        <div className="auth-brand-center">
          <div className="auth-logo-badge">
            <FileText size={24} className="text-white" />
            <Sparkles size={14} className="sparkle-float" />
          </div>
          <h2 className="auth-app-title">DocuMind AI</h2>
          <p className="auth-app-sub">AI Document QA Assistant (RAG + Gemini)</p>
        </div>

        {/* Form Mode Toggle */}
        <div className="auth-switch-tabs">
          <button
            type="button"
            className={`auth-switch-tab ${!isRegister ? 'auth-switch-active' : ''}`}
            onClick={() => { setIsRegister(false); setValidationError(''); setApiError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-switch-tab ${isRegister ? 'auth-switch-active' : ''}`}
            onClick={() => { setIsRegister(true); setValidationError(''); setApiError(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Validation or API Error Alerts */}
        {(validationError || apiError) && (
          <div className="alert-banner alert-warning mb-4">
            <AlertCircle size={16} />
            <span>{validationError || apiError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form-fields">
          {isRegister && (
            <div className="form-group-item">
              <label className="form-label-text">Full Name / Username (Optional)</label>
              <div className="input-with-icon-box">
                <User size={16} className="input-lead-icon" />
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="Alex Morgan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group-item">
            <label className="form-label-text">Email Address</label>
            <div className="input-with-icon-box">
              <Mail size={16} className="input-lead-icon" />
              <input
                type="email"
                className="form-text-input"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group-item">
            <label className="form-label-text">Password</label>
            <div className="input-with-icon-box">
              <Lock size={16} className="input-lead-icon" />
              <input
                type="password"
                className="form-text-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? (
              <span className="spinner-inline-white"></span>
            ) : (
              <>
                <span>{isRegister ? 'Register & Access Assistant' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider-line">
          <span>or evaluate without credentials</span>
        </div>

        {/* Instant Demo Sign In Button */}
        <button
          type="button"
          className="btn-demo-signin w-full"
          onClick={handleDemoSignIn}
          disabled={loading}
        >
          <Sparkles size={16} className="text-blue" />
          <span>Instant Demo Sign In (1-Click)</span>
        </button>

        <div className="auth-footer-security">
          <ShieldCheck size={14} className="text-emerald" />
          <span>Protected with Bcrypt password hashing & JWT tokens</span>
        </div>
      </div>
    </div>
  );
}
