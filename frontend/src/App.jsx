import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChunkInspectorModal from './components/ChunkInspectorModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';

export default function App() {
  const { user, apiKey } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.getStatus();
      setStatusInfo(data);
    } catch (e) {
      console.warn('Failed to fetch status:', e);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.warn('Failed to load documents:', e);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const s = await api.listSessions();
      setSessions(s);
    } catch (e) {
      console.warn('Failed to load sessions:', e);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      const msgs = await api.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (e) {
      console.warn('Failed to load session messages:', e);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadSessions();
      loadStatus();
    }
  }, [user, loadDocuments, loadSessions, loadStatus]);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, loadSessionMessages]);

  const handleUploadFile = async (file) => {
    try {
      setUploading(true);
      const res = await api.uploadDocument(file, apiKey);
      showToast(`Indexed ${res.document.filename} into ${res.chunk_count} chunks!`);
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSamples = async () => {
    try {
      setUploading(true);
      // Fetch sample documents from public / sample assets
      const sampleFiles = [
        { name: 'rag_architecture_overview.txt', type: 'text/plain', content: '# Artificial Intelligence & Retrieval-Augmented Generation (RAG)\n\nRetrieval-Augmented Generation (RAG) is an architectural pattern that enhances Large Language Models (LLMs) by integrating dynamic retrieval of domain-specific proprietary data.\n\nCore Architecture Components:\n1. Ingestion Pipeline: Ingests documents (PDF, DOCX, TXT, Markdown) and extracts text.\n2. Semantic Chunking: Segments documents into manageable chunks (500-1000 characters) with overlap while preserving sentence integrity.\n3. Embedding Model: Transforms chunks into high-dimensional dense vector embeddings using Google Gemini text-embedding-004.\n4. Vector Store & Database: Stores chunk records, metadata, and embeddings in MongoDB.\n5. Semantic Search & Top-K Retrieval: Computes cosine similarity between query embeddings and chunk embeddings to retrieve the most pertinent factual context.\n6. Grounded Generation: Injects retrieved chunks into an executive prompt for the LLM (Gemini 2.5 Flash), enforcing strict adherence to retrieved facts and preventing hallucinations.' },
        { name: 'cloud_security_report.txt', type: 'text/plain', content: 'Quarterly Cloud Security & Compliance Report - Q4 2025\n\nSecurity Posture and Encryption Standards:\nAll document stores and vector embeddings are encrypted at rest using AES-256 and in transit via TLS 1.3. Role-Based Access Control (RBAC) and JSON Web Tokens (JWT) enforce granular document isolation, preventing cross-tenant information leakage.\n\nCompliance Frameworks Status:\n1. SOC 2 Type II: Passed with Zero Non-Conformances (Renewal: September 2026)\n2. HIPAA HITECH: Fully Certified (Renewal: November 2026)\n3. ISO 27001:2022: Certified (Renewal: January 2027)\n\nIncident Response and Uptime SLA:\nCurrent operational uptime across the document processing cluster is 99.98%, well exceeding the 99.9% target SLA. Zero critical vulnerabilities detected.' },
        { name: 'employee_handbook_summary.txt', type: 'text/plain', content: 'Company Employee Handbook: Remote Work Policy\n\n1. Core Working Hours: Employees are expected to be reachable between 10:00 AM and 4:00 PM EST.\n2. Equipment Allowance: Every remote employee receives an annual $1,200 technology stipend for home office hardware, monitors, and ergonomic furniture.\n3. Paid Time Off: Full-time personnel receive 25 days of paid vacation and 10 paid sick days per calendar year.\n4. Health Benefits: Comprehensive medical, dental, and vision coverage starts on Day 1 of employment with 100% employer-sponsored premium options.' }
      ];

      for (const s of sampleFiles) {
        const blob = new Blob([s.content], { type: s.type });
        const file = new File([blob], s.name, { type: s.type });
        await api.uploadDocument(file, apiKey);
      }

      showToast('Successfully loaded 3 sample documents with vector embeddings!');
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Failed to load samples: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document and its vector embeddings?')) return;
    try {
      await api.deleteDocument(docId);
      if (activeDocId === docId) {
        setActiveDocId(null);
      }
      showToast('Document deleted.');
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleSendMessage = async (queryText) => {
    if (!queryText.trim() || loading) return;

    // Optimistically append user message to UI
    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: queryText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setLoading(true);

    try {
      const response = await api.sendQuery({
        query: queryText,
        docId: activeDocId,
        conversationId: currentSessionId,
        topK: 4,
        apiKey: apiKey || null,
      });

      if (!currentSessionId) {
        setCurrentSessionId(response.conversation_id);
      }

      const assistantMsg = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await loadSessions();
      await loadStatus();
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Error executing query:** ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      await loadSessions();
      showToast('Conversation deleted.');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        statusInfo={statusInfo}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="app-main-layout">
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={setActiveDocId}
          onDeleteDoc={handleDeleteDoc}
          onInspectDoc={setInspectingDoc}
          onUploadFile={handleUploadFile}
          onLoadSamples={handleLoadSamples}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          uploading={uploading}
        />

        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          activeDoc={activeDoc}
          documentsCount={documents.length}
          onLoadSamples={handleLoadSamples}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Chunk Inspector Modal */}
      {inspectingDoc && (
        <ChunkInspectorModal
          doc={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* Settings & Gemini Configuration Modal */}
      {settingsOpen && (
        <SettingsModal
          statusInfo={statusInfo}
          onClose={() => setSettingsOpen(false)}
          onRefreshStatus={loadStatus}
        />
      )}

      {/* User Authentication Modal */}
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
