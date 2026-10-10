import React from 'react';
import {
  FileText,
  MessageSquare,
  Layers,
  UploadCloud,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Database,
  Trash2,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardView({
  documents,
  conversations,
  statusInfo,
  onNavigate,
  onOpenUpload,
  onNewChat,
  onOpenConversation,
  onDeleteDoc,
  onLoadSamples,
  loading,
}) {
  const { user } = useAuth();

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const recentDocs = documents.slice(0, 5);
  const recentConvs = conversations.slice(0, 5);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBadgeClass = (ext) => {
    const clean = (ext || '').toLowerCase();
    if (clean === 'pdf') return 'pill-pdf';
    if (clean === 'docx' || clean === 'doc') return 'pill-docx';
    return 'pill-txt';
  };

  return (
    <div className="view-container">
      {/* Welcome Hero Banner */}
      <div className="dashboard-hero-card">
        <div className="hero-content">
          <h2 className="hero-greeting">
            Welcome back, {user?.username || 'Researcher'} 👋
          </h2>
          <p className="hero-subtext">
            Upload enterprise documents, segment them into vector embeddings, and interact
            with grounded natural-language queries using the Google Gemini RAG pipeline.
          </p>
          <div className="hero-cta-group">
            <button className="btn-primary" onClick={onOpenUpload}>
              <UploadCloud size={16} />
              <span>Upload Document</span>
            </button>
            <button className="btn-secondary" onClick={onNewChat}>
              <Plus size={16} />
              <span>Start New Chat</span>
            </button>
            {documents.length === 0 && (
              <button className="btn-outline-blue" onClick={onLoadSamples}>
                <Sparkles size={16} />
                <span>Load Sample Documents</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-blue">
            <FileText size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Uploaded Documents</span>
            <span className="stat-value">{documents.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-indigo">
            <Layers size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Vector Chunks Indexed</span>
            <span className="stat-value">{totalChunks}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-emerald">
            <MessageSquare size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Conversations</span>
            <span className="stat-value">{conversations.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-amber">
            <Database size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Database & Gemini</span>
            <span className="stat-value-sm">
              {statusInfo?.mongodb_connected ? 'MongoDB Atlas' : 'Local Persistence'}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Documents & Recent Conversations */}
      <div className="dashboard-content-grid">
        {/* Left Column: Recent Documents */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <FileText size={18} className="text-blue" />
              <h3 className="panel-title">Recent Documents</h3>
            </div>
            <button className="btn-link" onClick={() => onNavigate('documents')}>
              View all ({documents.length})
            </button>
          </div>

          <div className="panel-body">
            {loading ? (
              <div className="empty-panel-state">
                <span className="spinner-inline-blue"></span>
                <p>Loading documents...</p>
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="empty-panel-state">
                <FileCheck size={32} className="text-muted" />
                <p>No documents uploaded yet.</p>
                <button className="btn-primary-sm mt-2" onClick={onOpenUpload}>
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="activity-list">
                {recentDocs.map((doc) => (
                  <div key={doc.document_id} className="activity-item">
                    <div className="activity-icon-col">
                      <span className={`file-type-pill ${getBadgeClass(doc.file_type)}`}>
                        {doc.file_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="activity-info-col">
                      <h4 className="activity-title" title={doc.filename}>
                        {doc.filename}
                      </h4>
                      <span className="activity-meta">
                        {doc.chunk_count} chunks • {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                    <div className="activity-action-col">
                      <button
                        className="btn-action-outline"
                        onClick={() => onNewChat(doc.document_id)}
                        title="Chat with this document"
                      >
                        <MessageSquare size={14} />
                        <span>Chat</span>
                      </button>
                      <button
                        className="btn-action-icon text-danger"
                        onClick={() => onDeleteDoc(doc.document_id)}
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Conversations */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <MessageSquare size={18} className="text-blue" />
              <h3 className="panel-title">Recent Conversations</h3>
            </div>
            <button className="btn-link" onClick={() => onNavigate('chat')}>
              Go to Chat
            </button>
          </div>

          <div className="panel-body">
            {recentConvs.length === 0 ? (
              <div className="empty-panel-state">
                <Clock size={32} className="text-muted" />
                <p>No active conversations found.</p>
                <button className="btn-primary-sm mt-2" onClick={() => onNewChat()}>
                  Start a Conversation
                </button>
              </div>
            ) : (
              <div className="activity-list">
                {recentConvs.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className="activity-item activity-clickable"
                    onClick={() => onOpenConversation(conv.conversation_id)}
                  >
                    <div className="activity-info-col">
                      <h4 className="activity-title" title={conv.title}>
                        {conv.title || 'Untitled Conversation'}
                      </h4>
                      <span className="activity-meta">
                        {conv.message_count} messages
                        {conv.document_name ? ` • In: ${conv.document_name}` : ' • All Documents'}
                      </span>
                    </div>
                    <div className="activity-action-col">
                      <ArrowRight size={16} className="text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
