import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Layers,
  MessageSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Search
} from 'lucide-react';

export default function DocumentsView({
  documents,
  onUploadFile,
  onDeleteDoc,
  onInspectDoc,
  onStartChat,
  onLoadSamples,
  uploading,
  uploadProgress,
  uploadStatusMessage,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState('');

  const ALLOWED_EXTS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'];
  const MAX_SIZE_MB = 20;

  const handleValidateAndUpload = (file) => {
    setValidationError('');
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setValidationError(`Unsupported file type '${ext}'. Please upload a PDF, DOCX, or TXT file.`);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setValidationError(`File is larger than the ${MAX_SIZE_MB}MB maximum limit.`);
      return;
    }

    onUploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleValidateAndUpload(e.dataTransfer.files[0]);
    }
  };

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

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="view-container">
      {/* Upload Box Card */}
      <div className="panel-card mb-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <UploadCloud size={20} className="text-blue" />
            <h3 className="panel-title">Document Upload & Ingestion</h3>
          </div>
          <button className="btn-outline-blue btn-sm" onClick={onLoadSamples} disabled={uploading}>
            <Sparkles size={14} />
            <span>Load Demo Samples</span>
          </button>
        </div>

        <div className="panel-body">
          {validationError && (
            <div className="alert-banner alert-warning mb-4">
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          <div
            className={`dropzone-box ${dragOver ? 'dropzone-active' : ''} ${uploading ? 'dropzone-busy' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleValidateAndUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
              accept=".pdf,.docx,.doc,.txt,.md,.csv"
              style={{ display: 'none' }}
            />

            <div className="dropzone-icon-circle">
              <UploadCloud size={28} className="text-blue" />
            </div>

            {uploading ? (
              <div className="dropzone-status">
                <span className="spinner-inline-blue"></span>
                <strong>{uploadStatusMessage || 'Extracting text & generating vector embeddings...'}</strong>
                <span className="text-muted text-sm">Processing with Google Gemini text-embedding-004</span>
              </div>
            ) : (
              <div className="dropzone-text">
                <h4 className="dropzone-title">Click to upload or drag and drop document</h4>
                <p className="dropzone-sub">
                  Supported formats: <strong>PDF</strong>, <strong>DOCX</strong>, <strong>TXT</strong> (Up to 20MB)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Library Table */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-group">
            <FileText size={20} className="text-blue" />
            <h3 className="panel-title">Document Repository ({documents.length})</h3>
          </div>

          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="panel-body p-0">
          {filteredDocs.length === 0 ? (
            <div className="empty-table-state">
              <FileText size={36} className="text-muted" />
              <h4>No documents found</h4>
              <p className="text-muted">Upload a file or clear your search filter to see results.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Chunks</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
                    <tr key={doc.document_id}>
                      <td className="doc-primary-cell">
                        <span className="doc-table-name" title={doc.filename}>
                          {doc.filename}
                        </span>
                        {doc.summary && (
                          <span className="doc-table-summary" title={doc.summary}>
                            {doc.summary.slice(0, 70)}...
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`file-type-pill ${getBadgeClass(doc.file_type)}`}>
                          {doc.file_type.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatFileSize(doc.file_size)}</td>
                      <td>
                        <span className="chunks-tag">{doc.chunk_count} chunks</span>
                      </td>
                      <td>
                        <span className="status-badge-ready">
                          <CheckCircle2 size={12} />
                          <span>Indexed</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            className="btn-action-primary"
                            onClick={() => onStartChat(doc.document_id)}
                            title="Query this document"
                          >
                            <MessageSquare size={13} />
                            <span>Ask</span>
                          </button>
                          <button
                            className="btn-action-default"
                            onClick={() => onInspectDoc(doc)}
                            title="Inspect text chunks and embeddings"
                          >
                            <Layers size={13} />
                            <span>Inspect</span>
                          </button>
                          <button
                            className="btn-action-danger"
                            onClick={() => onDeleteDoc(doc.document_id)}
                            title="Delete document and embeddings"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
