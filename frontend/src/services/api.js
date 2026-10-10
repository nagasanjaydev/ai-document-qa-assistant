// Frontend API client communicating with FastAPI backend
const API_BASE = '/api';

function getAuthHeaders(customApiKey = null) {
  const headers = {};
  const token = localStorage.getItem('doc_qa_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth endpoints
  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(username_or_email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
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

  async uploadDocument(file, customApiKey = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (customApiKey) {
      formData.append('api_key', customApiKey);
    }

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getDocumentChunks(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}/chunks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load chunks');
    return res.json();
  },

  async deleteDocument(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Chat / RAG endpoints
  async sendQuery({ query, docId = null, conversationId = null, topK = 4, apiKey = null }) {
    const res = await fetch(`${API_BASE}/chat/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        query,
        doc_id: docId,
        conversation_id: conversationId,
        top_k: topK,
        api_key: apiKey,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  async listSessions() {
    const res = await fetch(`${API_BASE}/chat/sessions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat sessions');
    return res.json();
  },

  async getSessionMessages(sessionId) {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async deleteSession(sessionId) {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.json();
  },

  // Health and Status
  async getStatus() {
    const res = await fetch(`${API_BASE}/chat/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },
};
