import React, { useEffect, useState } from 'react';
import { X, Layers, FileText, Hash, Bookmark } from 'lucide-react';
import { api } from '../services/api';

export default function ChunkInspectorModal({ doc, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doc) return;
    async function loadChunks() {
      try {
        setLoading(true);
        const data = await api.getDocumentChunks(doc.id);
        setChunks(data);
      } catch (err) {
        setError(err.message || 'Failed to load document chunks');
      } finally {
        setLoading(false);
      }
    }
    loadChunks();
  }, [doc]);

  if (!doc) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Layers className="text-primary" size={20} />
            <div>
              <h3 className="modal-title">Chunk & Embedding Inspector</h3>
              <p className="modal-subtitle">
                Inspecting segmented vectors for <strong>{doc.filename}</strong> ({doc.chunk_count} chunks)
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body inspector-body">
          {loading ? (
            <div className="loading-state">
              <span className="spinner-inline"></span>
              <span>Loading semantic segments...</span>
            </div>
          ) : error ? (
            <div className="alert-error">{error}</div>
          ) : (
            <div className="chunks-inspector-list">
              {chunks.map((c) => (
                <div key={c.id || c.chunk_index} className="chunk-inspector-card">
                  <div className="chunk-inspector-header">
                    <span className="chunk-badge">
                      <Hash size={12} />
                      Chunk #{c.chunk_index}
                    </span>
                    <span className="page-badge">
                      <Bookmark size={12} />
                      Page {c.page_num || 1}
                    </span>
                    <span className="char-badge">{c.char_count} chars</span>
                  </div>
                  <pre className="chunk-content-text">{c.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="text-muted-sm">
            Each chunk is embedded into high-dimensional vector space for cosine similarity search.
          </span>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
