import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  File,
  Layers,
  Trash2,
  Plus,
  MessageSquare,
  Sparkles,
  CheckCircle,
  FileCheck
} from 'lucide-react';

export default function Sidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onDeleteDoc,
  onInspectDoc,
  onUploadFile,
  onLoadSamples,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  uploading,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileBadgeClass = (ext) => {
    const clean = (ext || '').toLowerCase();
    if (clean === 'pdf') return 'badge-pdf';
    if (clean === 'docx' || clean === 'doc') return 'badge-docx';
    return 'badge-txt';
  };

  return (
    <aside className="app-sidebar">
      {/* Upload & Drag-and-Drop Area */}
      <div className="sidebar-section">
        <div className="section-title-row">
          <span className="section-title">Document Library</span>
          <span className="badge-count">{documents.length}</span>
        </div>

        <div
          className={`upload-dropzone ${dragOver ? 'dropzone-active' : ''} ${uploading ? 'dropzone-loading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.txt,.md,.csv"
            style={{ display: 'none' }}
          />
          <UploadCloud className="upload-icon" size={26} />
          {uploading ? (
            <div className="upload-text">
              <span className="spinner-inline"></span>
              <strong>Chunking & Indexing...</strong>
            </div>
          ) : (
            <div className="upload-text">
              <strong>Upload PDF / DOCX / TXT</strong>
              <small>or drag and drop here</small>
            </div>
          )}
        </div>

        {/* Load Demo Documents quick action */}
        {documents.length === 0 && (
          <button
            className="btn-secondary-sm w-full mt-2"
            onClick={onLoadSamples}
            disabled={uploading}
          >
            <Sparkles size={14} />
            <span>Load Sample Documents</span>
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="sidebar-scrollable">
        <div className="doc-scope-selector">
          <button
            className={`doc-scope-btn ${activeDocId === null ? 'doc-scope-active' : ''}`}
            onClick={() => onSelectDoc(null)}
          >
            <FileCheck size={16} />
            <div className="scope-info">
              <span className="scope-name">All Documents</span>
              <span className="scope-desc">Global RAG Search</span>
            </div>
          </button>
        </div>

        <div className="document-list">
          {documents.map((doc) => {
            const isSelected = activeDocId === doc.id;
            return (
              <div
                key={doc.id}
                className={`document-card ${isSelected ? 'doc-card-selected' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <div className="doc-card-header">
                  <span className={`file-type-pill ${getFileBadgeClass(doc.file_type)}`}>
                    {doc.file_type.toUpperCase()}
                  </span>
                  <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-tiny"
                      title="Inspect Chunks & Embeddings"
                      onClick={() => onInspectDoc(doc)}
                    >
                      <Layers size={13} />
                    </button>
                    <button
                      className="btn-tiny btn-danger-hover"
                      title="Delete Document"
                      onClick={() => onDeleteDoc(doc.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="doc-card-body">
                  <h4 className="doc-name" title={doc.filename}>{doc.filename}</h4>
                  <div className="doc-meta-row">
                    <span>{doc.chunk_count} chunks</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversations / Chat History */}
      <div className="sidebar-section conversations-section">
        <div className="section-title-row">
          <span className="section-title">Chat Sessions</span>
          <button className="btn-new-chat" onClick={onNewChat} title="Start New Conversation">
            <Plus size={14} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-sessions">No conversations yet</div>
          ) : (
            sessions.map((s) => {
              const isCurrent = currentSessionId === s.id;
              return (
                <div
                  key={s.id}
                  className={`session-item ${isCurrent ? 'session-item-active' : ''}`}
                  onClick={() => onSelectSession(s.id)}
                >
                  <MessageSquare size={14} className="session-icon" />
                  <span className="session-title-text" title={s.title}>
                    {s.title || 'Untitled Chat'}
                  </span>
                  <button
                    className="btn-session-delete"
                    title="Delete Conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
