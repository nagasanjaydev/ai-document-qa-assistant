import React, { useState } from 'react';
import { X, Key, Database, Sparkles, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SettingsModal({ statusInfo, onClose, onRefreshStatus }) {
  const { apiKey, setApiKey } = useAuth();
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setApiKey(localKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onRefreshStatus?.();
    }, 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Key className="text-primary" size={20} />
            <h3 className="modal-title">Settings & API Configuration</h3>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gemini API Key Form */}
          <form onSubmit={handleSave} className="settings-section">
            <label className="input-label">Google Gemini API Key</label>
            <p className="input-hint">
              Enter your Gemini API key to enable high-accuracy grounded LLM responses.
              You can get a free API key at{' '}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-link"
              >
                Google AI Studio <ExternalLink size={12} />
              </a>.
            </p>

            <div className="input-with-button">
              <input
                type="password"
                className="text-input"
                placeholder="AIzaSy..."
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                {savedSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Saved</span>
                  </>
                ) : (
                  'Save Key'
                )}
              </button>
            </div>
            {localKey && (
              <button
                type="button"
                className="btn-text-danger mt-1"
                onClick={() => { setLocalKey(''); setApiKey(''); }}
              >
                Clear Key (Use Server Default)
              </button>
            )}
          </form>

          {/* System Diagnostics & MongoDB status */}
          <div className="settings-section mt-4">
            <h4 className="section-heading">
              <Database size={16} />
              <span>System & Database Status</span>
            </h4>

            <div className="status-grid">
              <div className="status-item">
                <span className="status-item-label">Database Engine</span>
                <span className="status-item-value">
                  {statusInfo?.database_mode || 'Local Fallback Store'}
                </span>
              </div>

              <div className="status-item">
                <span className="status-item-label">MongoDB Connection</span>
                <span className={`status-item-value ${statusInfo?.mongodb_connected ? 'text-green' : 'text-amber'}`}>
                  {statusInfo?.mongodb_connected ? 'Connected' : 'Offline (Local Store Active)'}
                </span>
              </div>

              <div className="status-item">
                <span className="status-item-label">Gemini Model</span>
                <span className="status-item-value font-mono">
                  {statusInfo?.gemini_model || 'gemini-2.5-flash'}
                </span>
              </div>

              <div className="status-item">
                <span className="status-item-label">Embedding Model</span>
                <span className="status-item-value font-mono">
                  {statusInfo?.embedding_model || 'text-embedding-004'}
                </span>
              </div>

              <div className="status-item">
                <span className="status-item-label">Indexed Documents</span>
                <span className="status-item-value">
                  {statusInfo?.user_documents_count ?? 0} files
                </span>
              </div>

              <div className="status-item">
                <span className="status-item-label">Indexed Chunks</span>
                <span className="status-item-value">
                  {statusInfo?.user_chunks_count ?? 0} chunks
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
