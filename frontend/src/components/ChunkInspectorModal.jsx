import React, { useEffect, useState } from 'react';
import { X, Layers, Hash, Bookmark } from 'lucide-react';
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
        const data = await api.getDocumentChunks(doc.document_id || doc.id);
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
    <div className="modal-backdrop-light" onClick={onClose}>
      <div className="modal-dialog-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div className="modal-title-row">
            <Layers className="text-blue" size={20} />
            <div>
              <h3 className="modal-heading">Chunk & Embedding Inspector</h3>
              <p className="modal-subheading">
                Displaying indexed vectors for <strong>{doc.filename}</strong> ({chunks.length} chunks)
              </p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-dialog-body">
          {loading ? (
            <div className="empty-panel-state">
              <span className="spinner-inline-blue"></span>
              <p>Loading chunks from vector store...</p>
            </div>
          ) : error ? (
            <div className="alert-banner alert-warning">{error}</div>
          ) : (
            <div className="chunks-list-flow">
              {chunks.map((c) => (
                <div key={c.chunk_id || c.chunk_index} className="chunk-card-light">
                  <div className="chunk-card-meta">
                    <span className="chunk-index-tag">
                      <Hash size={12} />
                      Chunk #{c.chunk_index}
                    </span>
                    <span className="chunk-page-tag">
                      <Bookmark size={12} />
                      Page {c.page_number || 1}
                    </span>
                    <span className="chunk-char-tag">
                      {c.char_count || c.chunk_text.length} characters
                    </span>
                  </div>
                  <p className="chunk-text-box">{c.chunk_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-dialog-footer">
          <span className="footer-annotation">
            Chunks are indexed with dense semantic embeddings for cosine similarity retrieval.
          </span>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
