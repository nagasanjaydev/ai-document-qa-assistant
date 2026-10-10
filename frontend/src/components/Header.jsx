import React from 'react';
import { Sparkles, Database, Key, Settings, User, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ statusInfo, onOpenSettings, onOpenAuth }) {
  const { user, logout, apiKey } = useAuth();

  const isGeminiActive = !!apiKey || !!statusInfo?.gemini_api_configured;
  const isMongoConnected = !!statusInfo?.mongodb_connected;

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <FileText className="brand-icon" size={24} />
          <Sparkles className="sparkle-badge" size={14} />
        </div>
        <div>
          <h1 className="brand-title">DocuMind AI</h1>
          <p className="brand-subtitle">AI-Powered Document QA Assistant (RAG + Gemini)</p>
        </div>
      </div>

      <div className="header-status-group">
        {/* Database Status Badge */}
        <div
          className={`status-chip ${isMongoConnected ? 'status-chip-success' : 'status-chip-warning'}`}
          title={statusInfo?.db_status_message || 'Database status'}
        >
          <Database size={14} />
          <span>{isMongoConnected ? 'MongoDB Connected' : 'Local Store Active'}</span>
        </div>

        {/* Gemini Model Status Badge */}
        <div
          className={`status-chip ${isGeminiActive ? 'status-chip-primary' : 'status-chip-muted'}`}
          onClick={onOpenSettings}
          style={{ cursor: 'pointer' }}
          title={isGeminiActive ? `Model: ${statusInfo?.gemini_model || 'gemini-2.5-flash'}` : 'Click to configure Gemini API Key'}
        >
          <Key size={14} />
          <span>{isGeminiActive ? 'Gemini 2.5 Active' : 'Configure API Key'}</span>
        </div>

        {/* Settings button */}
        <button
          className="btn-icon"
          onClick={onOpenSettings}
          title="System Settings & API Key"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* User Auth Menu */}
        {user ? (
          <div className="user-profile-badge">
            <div className="user-avatar" title={`Logged in as ${user.username}`}>
              <User size={15} />
            </div>
            <span className="username-text">{user.username}</span>
            <button
              className="btn-logout"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button className="btn-primary-sm" onClick={onOpenAuth}>
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
