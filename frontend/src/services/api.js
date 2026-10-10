// Frontend API service communicating with FastAPI backend
const API_BASE = '/api';

function getAuthHeaders() {
  const headers = {};
  const token = localStorage.getItem('doc_qa_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth endpoints
  async register(email, password, username = '') {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: username || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid email or password');
    }
    return res.json();
  },

  async demoLogin() {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Demo login failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Document endpoints
  async listDocuments() {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Document upload failed');
    }
    return res.json();
  },

  async getDocument(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve document details');
    return res.json();
  },

  async getDocumentChunks(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/chunks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load document chunks');
    return res.json();
  },

  async deleteDocument(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Chat / RAG endpoints
  async askQuestion({ question, documentId = null, conversationId = null, topK = 4 }) {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        question,
        document_id: documentId,
        conversation_id: conversationId,
        top_k: topK,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate answer');
    }
    return res.json();
  },

  async listChatHistory() {
    const res = await fetch(`${API_BASE}/chat/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load conversation history');
    return res.json();
  },

  async getConversationMessages(conversationId) {
    const res = await fetch(`${API_BASE}/chat/history/${conversationId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load messages');
    return res.json();
  },

  async deleteConversation(conversationId) {
    const res = await fetch(`${API_BASE}/chat/history/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // System Diagnostics and API Key
  async saveApiKey(apiKey) {
    const res = await fetch(`${API_BASE}/chat/settings/api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save API key');
    }
    return res.json();
  },

  async getStatus() {
    const res = await fetch(`${API_BASE}/chat/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load system status');
    return res.json();
  },
};
