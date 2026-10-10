import React, { useState } from 'react';
import { X, Key, Database, Check, ExternalLink, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ statusInfo, onClose, onRefreshStatus }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setErrorMessage('Please enter an API key.');
      return;
    }

    setSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const res = await api.saveApiKey(apiKeyInput.trim());
      setStatusMessage(res.message || 'Gemini API Key activated!');
      setApiKeyInput('');
      if (onRefreshStatus) {
        await onRefreshStatus();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save API key.');
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!statusInfo?.gemini_api_configured;

  return (
    <div className="modal-backdrop-light" onClick={onClose}>
      <div className="modal-dialog-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div className="modal-title-row">
            <Key className="text-blue" size={20} />
            <div>
              <h3 className="modal-heading">Google Gemini API Configuration</h3>
              <p className="modal-subheading">
                Configure your free Gemini API key to enable LLM generation and vector embeddings
              </p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-dialog-body">
          {/* Current Status Banner */}
          <div className={`alert-banner ${isConfigured ? 'alert-success' : 'alert-warning'} mb-4`}>
            {isConfigured ? (
              <>
                <ShieldCheck size={18} className="text-emerald" />
                <span>
                  <strong>Gemini API is Active:</strong> Grounded conversational generation is enabled with model <code>{statusInfo?.gemini_model || 'gemini-2.5-flash'}</code>.
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={18} className="text-amber" />
                <span>
                  <strong>API Key Not Configured:</strong> The assistant is operating in <em>Semantic Search Retrieval Mode</em> (extracting and matching relevant document passages). Add your key below to unlock full conversational answers.
                </span>
              </>
            )}
          </div>

          {statusMessage && (
            <div className="alert-banner alert-success mb-4">
              <Check size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="alert-banner alert-warning mb-4">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="mb-6">
            <label className="form-label-text">
              Enter Google Gemini API Key
            </label>
            <p className="text-muted text-sm mb-2">
              Get a 100% free Gemini API key with no credit card required at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-link"
              >
                Google AI Studio <ExternalLink size={12} />
              </a>.
            </p>

            <div className="input-group-flex">
              <input
                type="password"
                className="form-text-input"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                disabled={saving}
              />
              <button type="submit" className="btn-primary" disabled={saving || !apiKeyInput.trim()}>
                {saving ? (
                  <span className="spinner-inline-white"></span>
                ) : (
                  <>
                    <Key size={14} />
                    <span>Save & Activate</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* System Diagnostics Info */}
          <div className="system-diagnostics-box">
            <h4 className="diagnostics-title">
              <Database size={15} />
              <span>System & Engine Details</span>
            </h4>
            <div className="diagnostics-grid">
              <div className="diagnostic-stat">
                <span className="stat-name">Database Engine</span>
                <span className="stat-data">{statusInfo?.database_mode || 'Local Fallback Store'}</span>
              </div>
              <div className="diagnostic-stat">
                <span className="stat-name">MongoDB Status</span>
                <span className={`stat-data ${statusInfo?.mongodb_connected ? 'text-emerald' : 'text-amber'}`}>
                  {statusInfo?.mongodb_connected ? 'Connected (Atlas/Local)' : 'Local Storage Active'}
                </span>
              </div>
              <div className="diagnostic-stat">
                <span className="stat-name">LLM Model</span>
                <span className="stat-data font-mono">{statusInfo?.gemini_model || 'gemini-2.5-flash'}</span>
              </div>
              <div className="diagnostic-stat">
                <span className="stat-name">Embedding Model</span>
                <span className="stat-data font-mono">{statusInfo?.embedding_model || 'text-embedding-004'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-dialog-footer">
          <span className="footer-annotation">
            Keys are stored securely in your local environment file and never transmitted to third parties.
          </span>
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
