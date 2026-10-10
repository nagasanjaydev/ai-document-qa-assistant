import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import DocumentsView from './components/DocumentsView';
import ChatView from './components/ChatView';
import AuthView from './components/AuthView';
import ChunkInspectorModal from './components/ChunkInspectorModal';
import SettingsModal from './components/SettingsModal';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'chat', 'documents'
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [statusInfo, setStatusInfo] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.listChatHistory();
      setConversations(convs);
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
  }, []);

  const loadConversationMessages = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    try {
      const msgs = await api.getConversationMessages(convId);
      setMessages(msgs);
    } catch (e) {
      console.warn('Failed to load conversation messages:', e);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadConversations();
      loadStatus();
    }
  }, [user, loadDocuments, loadConversations, loadStatus]);

  useEffect(() => {
    if (currentConvId) {
      loadConversationMessages(currentConvId);
    }
  }, [currentConvId, loadConversationMessages]);

  const handleUploadFile = async (file) => {
    try {
      setUploading(true);
      setUploadStatusMessage(`Parsing ${file.name} & generating vector embeddings...`);
      const res = await api.uploadDocument(file);
      showToast(`Document indexed successfully: ${res.chunk_count} chunks.`);
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadStatusMessage('');
    }
  };

  const handleLoadSamples = async () => {
    try {
      setUploading(true);
      setUploadStatusMessage('Loading sample documents into RAG vector index...');
      const sampleFiles = [
        {
          name: 'rag_architecture_overview.txt',
          type: 'text/plain',
          content: `# Artificial Intelligence & Retrieval-Augmented Generation (RAG)

## Executive Summary
Retrieval-Augmented Generation (RAG) is an architectural pattern that enhances Large Language Models (LLMs) by integrating dynamic retrieval of domain-specific proprietary data. Instead of relying solely on parametric knowledge learned during training, RAG models fetch relevant factual context at query time from vector databases or document indexes.

## Core Architecture Components
1. Ingestion Pipeline: Ingests documents (PDF, DOCX, TXT, Markdown), extracts text, and performs validation.
2. Semantic Chunking: Segments documents into manageable chunks (500-1000 characters with overlap) while preserving sentence integrity.
3. Embedding Model: Transforms chunks into high-dimensional dense vector embeddings using Google Gemini text-embedding-004.
4. Vector Store & Database: Stores chunk records, metadata, and embeddings in MongoDB.
5. Semantic Search & Top-K Retrieval: Computes cosine similarity between query embeddings and chunk embeddings to retrieve the most pertinent factual context.
6. Grounded Generation: Injects retrieved chunks into an executive prompt for the LLM (Gemini 2.5 Flash), enforcing strict adherence to retrieved facts and preventing hallucinations.`
        },
        {
          name: 'cloud_security_compliance.txt',
          type: 'text/plain',
          content: `Quarterly Cloud Security & Compliance Audit Report - Q4 2025

Security Posture and Encryption Standards:
All document stores and vector embeddings are encrypted at rest using AES-256 and in transit via TLS 1.3. Role-Based Access Control (RBAC) and JSON Web Tokens (JWT) enforce granular document isolation, preventing cross-tenant information leakage.

Compliance Benchmarks:
1. SOC 2 Type II: Passed with Zero Non-Conformances (Target Renewal: September 2026)
2. HIPAA HITECH: Fully Certified (Target Renewal: November 2026)
3. ISO 27001:2022: Certified (Target Renewal: January 2027)

Incident Response and Uptime SLA:
Current operational uptime across the document processing cluster is 99.98%, exceeding the 99.9% target SLA. Zero critical vulnerabilities were detected during the quarterly penetration test.`
        },
        {
          name: 'employee_remote_work_policy.txt',
          type: 'text/plain',
          content: `Company Employee Handbook: Remote Work Policy

1. Core Working Hours: Employees are expected to be reachable between 10:00 AM and 4:00 PM EST.
2. Equipment Allowance: Every remote employee receives an annual $1,200 technology stipend for home office hardware, external monitors, and ergonomic furniture.
3. Paid Time Off: Full-time personnel receive 25 days of paid vacation and 10 paid sick days per calendar year.
4. Health Benefits: Comprehensive medical, dental, and vision coverage starts on Day 1 of employment with 100% employer-sponsored premium options.`
        }
      ];

      for (const s of sampleFiles) {
        const blob = new Blob([s.content], { type: s.type });
        const file = new File([blob], s.name, { type: s.type });
        await api.uploadDocument(file);
      }

      showToast('Loaded 3 sample documents with vector embeddings!');
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Failed to load samples: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadStatusMessage('');
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document and its corresponding chunk embeddings?')) return;
    try {
      await api.deleteDocument(docId);
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
      showToast('Document deleted.');
      await loadDocuments();
      await loadStatus();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleSendMessage = async (question) => {
    if (!question.trim() || loadingMessages) return;

    // Optimistically add user question to UI
    const tempUserMsg = {
      message_id: `temp-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoadingMessages(true);

    try {
      const response = await api.askQuestion({
        question,
        documentId: selectedDocId,
        conversationId: currentConvId,
        topK: 4,
      });

      if (!currentConvId) {
        setCurrentConvId(response.conversation_id);
      }

      const assistantMsg = {
        message_id: `resp-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await loadConversations();
      await loadStatus();
    } catch (err) {
      const errorMsg = {
        message_id: `err-${Date.now()}`,
        role: 'assistant',
        text: `**Query Execution Error:** ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleStartNewChat = (docId = null) => {
    setCurrentConvId(null);
    setMessages([]);
    if (docId !== undefined) {
      setSelectedDocId(docId);
    }
    setCurrentView('chat');
  };

  const handleOpenConversation = (convId) => {
    setCurrentConvId(convId);
    setCurrentView('chat');
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await api.deleteConversation(convId);
      if (currentConvId === convId) {
        setCurrentConvId(null);
        setMessages([]);
      }
      await loadConversations();
      showToast('Conversation deleted.');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="empty-panel-state" style={{ height: '100vh' }}>
        <span className="spinner-inline-blue"></span>
        <p>Loading DocuMind AI...</p>
      </div>
    );
  }

  return (
    <div className="app-viewport">
      {/* Top Navbar */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        statusInfo={statusInfo}
        onOpenAuth={() => setCurrentView('dashboard')}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* View Switcher: Show AuthView if logged out */}
      {!user ? (
        <AuthView />
      ) : currentView === 'dashboard' ? (
        <DashboardView
          documents={documents}
          conversations={conversations}
          statusInfo={statusInfo}
          onNavigate={setCurrentView}
          onOpenUpload={() => setCurrentView('documents')}
          onNewChat={handleStartNewChat}
          onOpenConversation={handleOpenConversation}
          onDeleteDoc={handleDeleteDoc}
          onLoadSamples={handleLoadSamples}
          loading={uploading}
        />
      ) : currentView === 'documents' ? (
        <DocumentsView
          documents={documents}
          onUploadFile={handleUploadFile}
          onDeleteDoc={handleDeleteDoc}
          onInspectDoc={setInspectingDoc}
          onStartChat={handleStartNewChat}
          onLoadSamples={handleLoadSamples}
          uploading={uploading}
          uploadStatusMessage={uploadStatusMessage}
        />
      ) : (
        <ChatView
          documents={documents}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
          conversations={conversations}
          currentConvId={currentConvId}
          onSelectConversation={handleOpenConversation}
          onNewChat={handleStartNewChat}
          onDeleteConversation={handleDeleteConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loadingMessages}
          onLoadSamples={handleLoadSamples}
        />
      )}

      {/* Chunk Inspector Modal */}
      {inspectingDoc && (
        <ChunkInspectorModal
          doc={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          statusInfo={statusInfo}
          onClose={() => setSettingsOpen(false)}
          onRefreshStatus={loadStatus}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-bar">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
