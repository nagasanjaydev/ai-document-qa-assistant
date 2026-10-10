import React from 'react';
import { FileText, Sparkles, Database, LayoutDashboard, MessageSquare, Files, LogOut, User, Key, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentView, onNavigate, statusInfo, onOpenAuth, onOpenSettings }) {
  const { user, logout } = useAuth();
  const isMongoConnected = !!statusInfo?.mongodb_connected;
  const isGeminiConfigured = !!statusInfo?.gemini_api_configured;

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-wrapper">
            <FileText size={20} className="brand-icon" />
            <Sparkles size={12} className="brand-sparkle" />
          </div>
          <div>
            <h1 className="brand-name">DocuMind AI</h1>
            <span className="brand-tag">Document QA Assistant</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="navbar-nav">
            <button
              className={`nav-tab-btn ${currentView === 'dashboard' ? 'nav-tab-active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-tab-btn ${currentView === 'chat' ? 'nav-tab-active' : ''}`}
              onClick={() => onNavigate('chat')}
            >
              <MessageSquare size={16} />
              <span>AI Chat</span>
            </button>
            <button
              className={`nav-tab-btn ${currentView === 'documents' ? 'nav-tab-active' : ''}`}
              onClick={() => onNavigate('documents')}
            >
              <Files size={16} />
              <span>Documents</span>
            </button>
          </nav>
        )}

        {/* Right Action / Profile */}
        <div className="navbar-actions">
          {/* Database Status Chip */}
          <div
            className={`status-chip ${isMongoConnected ? 'status-connected' : 'status-fallback'}`}
            title={statusInfo?.db_status_message || 'Database status'}
          >
            <Database size={13} />
            <span>{isMongoConnected ? 'MongoDB Online' : 'Local Storage'}</span>
          </div>

          {/* Gemini API Key Trigger Chip */}
          <button
            className={`status-chip ${isGeminiConfigured ? 'status-connected' : 'status-api-key-btn'}`}
            onClick={onOpenSettings}
            title={isGeminiConfigured ? 'Gemini API is active' : 'Click to configure Gemini API Key'}
          >
            <Key size={13} />
            <span>{isGeminiConfigured ? 'Gemini 2.5 Active' : 'Set API Key'}</span>
          </button>

          {/* Settings Gear Button */}
          <button
            className="btn-icon-subtle"
            onClick={onOpenSettings}
            title="Configure Gemini API & View Diagnostics"
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>

          {user ? (
            <div className="user-profile-menu">
              <div className="user-info-chip">
                <div className="user-avatar-circle">
                  <User size={14} />
                </div>
                <span className="user-display-name">{user.username || user.email}</span>
              </div>
              <button
                className="btn-icon-subtle"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn-primary-sm" onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
