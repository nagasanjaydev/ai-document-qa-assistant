import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Filter,
  MessageSquare
} from 'lucide-react';

export default function ChatView({
  documents,
  selectedDocId,
  onSelectDoc,
  conversations,
  currentConvId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  messages,
  onSendMessage,
  loading,
  onLoadSamples,
}) {
  const [inputQuestion, setInputQuestion] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || loading) return;
    const q = inputQuestion;
    setInputQuestion('');
    onSendMessage(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSourceAccordion = (id) => {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sampleQuestions = [
    "What are the core components of the RAG architecture?",
    "What compliance frameworks were audited in the cloud security report?",
    "What is the remote work equipment stipend and PTO allowance?",
    "Summarize the main challenges in deploying clinical AI models."
  ];

  const selectedDocObj = documents.find((d) => d.document_id === selectedDocId);

  return (
    <div className="chat-layout-wrapper">
      {/* Sidebar: Conversations & Document Scope */}
      <aside className="chat-sessions-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn-primary w-full" onClick={onNewChat}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Document Selector Filter */}
        <div className="doc-filter-section">
          <label className="doc-filter-label">
            <Filter size={12} />
            <span>Target Document:</span>
          </label>
          <select
            className="doc-filter-select"
            value={selectedDocId || ''}
            onChange={(e) => onSelectDoc(e.target.value || null)}
          >
            <option value="">All Documents (Global Search)</option>
            {documents.map((d) => (
              <option key={d.document_id} value={d.document_id}>
                {d.filename} ({d.file_type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Conversation List */}
        <div className="sessions-list-container">
          <span className="sessions-header-label">Recent Conversations</span>
          {conversations.length === 0 ? (
            <div className="empty-history-text">No previous chat sessions.</div>
          ) : (
            conversations.map((c) => {
              const isActive = currentConvId === c.conversation_id;
              return (
                <div
                  key={c.conversation_id}
                  className={`session-row ${isActive ? 'session-row-active' : ''}`}
                  onClick={() => onSelectConversation(c.conversation_id)}
                >
                  <MessageSquare size={14} className="session-icon" />
                  <span className="session-text" title={c.title}>
                    {c.title || 'Untitled Conversation'}
                  </span>
                  <button
                    className="session-delete-btn"
                    title="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(c.conversation_id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <main className="chat-main-area">
        {/* Messages Stream */}
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="chat-hero-empty">
              <div className="chat-hero-icon-box">
                <Bot size={36} className="text-blue" />
                <Sparkles size={16} className="chat-sparkle-icon" />
              </div>

              <h2 className="chat-hero-title">Ask Your Documents</h2>
              <p className="chat-hero-subtitle">
                Ask specific questions and receive verified, context-grounded answers.
                Every response cites the exact document, page number, and source passage.
              </p>

              {documents.length === 0 ? (
                <div className="empty-docs-warning-card">
                  <FileText size={24} className="text-blue mb-2" />
                  <h4>No documents currently indexed</h4>
                  <p className="text-muted text-sm mb-3">
                    Upload your own PDF, DOCX, or TXT documents, or load the pre-built sample dataset.
                  </p>
                  <button className="btn-primary-sm" onClick={onLoadSamples}>
                    <Sparkles size={14} />
                    <span>Load Sample Documents</span>
                  </button>
                </div>
              ) : (
                <div className="sample-prompts-container">
                  <span className="sample-prompts-title">Sample Queries:</span>
                  <div className="sample-prompts-grid">
                    {sampleQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        className="prompt-card-button"
                        onClick={() => onSendMessage(q)}
                      >
                        <span>{q}</span>
                        <ArrowRight size={14} className="prompt-card-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="messages-stream">
              {messages.map((m, index) => {
                const isUser = m.role === 'user';
                const hasSources = m.sources && m.sources.length > 0;
                const isExpanded = !!expandedSources[m.message_id || index];

                return (
                  <div
                    key={m.message_id || index}
                    className={`message-thread-item ${isUser ? 'user-turn' : 'assistant-turn'}`}
                  >
                    <div className="message-avatar-box">
                      {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div className="message-content-wrapper">
                      <div className="message-bubble-box">
                        {isUser ? (
                          <p className="user-text-content">{m.text}</p>
                        ) : (
                          <div className="markdown-render-area">
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Grounded Source References Accordion */}
                      {!isUser && hasSources && (
                        <div className="grounded-sources-accordion">
                          <button
                            className="sources-header-toggle"
                            onClick={() => toggleSourceAccordion(m.message_id || index)}
                          >
                            <div className="sources-label-flex">
                              <Layers size={13} className="text-blue" />
                              <span>Grounded Sources ({m.sources.length} passages cited)</span>
                            </div>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isExpanded && (
                            <div className="sources-list-grid">
                              {m.sources.map((src, sIdx) => {
                                const matchPct = Math.min(100, Math.round(src.relevance_score * 100));
                                return (
                                  <div key={sIdx} className="source-citation-card">
                                    <div className="source-citation-top">
                                      <div className="source-file-meta">
                                        <FileText size={12} className="text-blue" />
                                        <strong className="source-name" title={src.filename}>
                                          {src.filename}
                                        </strong>
                                        <span className="source-page-tag">
                                          Page {src.page_number || 1}
                                        </span>
                                      </div>
                                      <span className="source-score-pill">
                                        {matchPct}% Match
                                      </span>
                                    </div>
                                    <p className="source-quote-text">
                                      "{src.text_snippet}"
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Copy Action for AI answers */}
                      {!isUser && (
                        <div className="message-toolbar">
                          <button
                            className="btn-copy-response"
                            onClick={() => handleCopy(m.text, m.message_id || index)}
                            title="Copy answer"
                          >
                            {copiedId === (m.message_id || index) ? (
                              <>
                                <Check size={12} className="text-emerald" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Generating loading bubble */}
              {loading && (
                <div className="message-thread-item assistant-turn">
                  <div className="message-avatar-box">
                    <Bot size={16} />
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-bubble-box loading-bubble">
                      <div className="dot-pulse-group">
                        <span className="pulse-dot"></span>
                        <span className="pulse-dot"></span>
                        <span className="pulse-dot"></span>
                      </div>
                      <span className="loading-caption">
                        Retrieving relevant chunks & formulating grounded response...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar-container">
          <div className="input-target-scope-tag">
            <span>Query Scope:</span>
            <strong>
              {selectedDocObj ? selectedDocObj.filename : `All Documents (${documents.length} files)`}
            </strong>
          </div>

          <form onSubmit={handleSubmit} className="chat-input-form-box">
            <textarea
              ref={textareaRef}
              className="chat-prompt-textarea"
              placeholder={
                documents.length === 0
                  ? "Upload documents first to start asking questions..."
                  : "Ask a question about the document(s) (Enter to send, Shift+Enter for newline)..."
              }
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-chat-send"
              disabled={!inputQuestion.trim() || loading}
              aria-label="Send query"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
