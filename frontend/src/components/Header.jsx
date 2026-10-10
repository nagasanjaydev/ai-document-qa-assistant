import React from 'react';
import { FileText, Sparkles, Database, LayoutDashboard, MessageSquare, Files, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentView, onNavigate, statusInfo, onOpenAuth }) {
  const { user, logout } = useAuth();
  const isMongoConnected = !!statusInfo?.mongodb_connected;

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
          {/* Status Chip */}
          <div
            className={`status-chip ${isMongoConnected ? 'status-connected' : 'status-fallback'}`}
            title={statusInfo?.db_status_message || 'Database status'}
          >
            <Database size={13} />
            <span>{isMongoConnected ? 'MongoDB Online' : 'Local Storage Mode'}</span>
          </div>

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
