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
  ArrowRight
} from 'lucide-react';

export default function ChatArea({
  messages,
  onSendMessage,
  loading,
  activeDoc,
  documentsCount,
  onLoadSamples,
}) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedCitations, setExpandedCitations] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    const q = inputText;
    setInputText('');
    onSendMessage(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCitation = (msgId) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const suggestedPrompts = [
    "What is the RAG architecture and its key advantages?",
    "What are the quarterly security compliance audit results?",
    "What are the remote work equipment allowances and health benefits?",
    "Summarize the main challenges in deploying clinical AI models."
  ];

  return (
    <main className="chat-workspace">
      {/* Messages Scroll Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="hero-empty-state">
            <div className="hero-icon-container">
              <Bot size={40} className="hero-icon" />
              <Sparkles size={20} className="hero-sparkle" />
            </div>
            <h2 className="hero-title">Ask Anything About Your Documents</h2>
            <p className="hero-desc">
              Upload PDF, DOCX, or TXT documents to extract insights, summarize complex reports,
              and receive grounded answers powered by Retrieval-Augmented Generation (RAG) and the Gemini API.
            </p>

            {documentsCount === 0 ? (
              <div className="hero-action-card">
                <h4>No documents uploaded yet</h4>
                <p>Upload your own files or load sample test files to see RAG in action.</p>
                <button className="btn-primary mt-3" onClick={onLoadSamples}>
                  <Sparkles size={16} />
                  <span>Load Sample Documents</span>
                </button>
              </div>
            ) : (
              <div className="suggested-prompts-wrapper">
                <span className="prompts-label">Try asking:</span>
                <div className="prompts-grid">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="prompt-pill"
                      onClick={() => onSendMessage(prompt)}
                    >
                      <span>{prompt}</span>
                      <ArrowRight size={14} className="prompt-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const hasSources = msg.sources && msg.sources.length > 0;
              const isCitationOpen = !!expandedCitations[msg.id || index];

              return (
                <div
                  key={msg.id || index}
                  className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}
                >
                  <div className="message-avatar">
                    {isUser ? <User size={18} /> : <Bot size={18} />}
                  </div>

                  <div className="message-bubble-container">
                    <div className="message-bubble">
                      {isUser ? (
                        <p className="user-message-text">{msg.content}</p>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Citations and Grounded Sources Accordion */}
                    {!isUser && hasSources && (
                      <div className="sources-container">
                        <button
                          className="sources-toggle-btn"
                          onClick={() => toggleCitation(msg.id || index)}
                        >
                          <div className="toggle-left">
                            <Layers size={14} />
                            <span>Grounded Sources ({msg.sources.length})</span>
                          </div>
                          {isCitationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {isCitationOpen && (
                          <div className="citations-grid">
                            {msg.sources.map((src, sIdx) => {
                              const relevancePercent = Math.min(100, Math.round(src.score * 100));
                              return (
                                <div key={sIdx} className="citation-card">
                                  <div className="citation-header">
                                    <div className="citation-meta">
                                      <FileText size={13} />
                                      <strong className="citation-filename" title={src.filename}>
                                        {src.filename}
                                      </strong>
                                      <span className="citation-tag">Page {src.page_num || 1}</span>
                                    </div>
                                    <div className="citation-score">
                                      <span>{relevancePercent}% Match</span>
                                    </div>
                                  </div>
                                  <p className="citation-snippet">"{src.snippet}"</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action bar for assistant messages */}
                    {!isUser && (
                      <div className="message-actions">
                        <button
                          className="btn-action-small"
                          onClick={() => copyToClipboard(msg.content, msg.id || index)}
                          title="Copy answer"
                        >
                          {copiedId === (msg.id || index) ? (
                            <>
                              <Check size={12} className="text-green" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="message-row message-assistant">
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-bubble-container">
                  <div className="message-bubble thinking-bubble">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="thinking-text">Searching document chunks & generating grounded response...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="chat-input-wrapper">
        <div className="input-scope-indicator">
          <span>Target Scope:</span>
          <strong>
            {activeDoc ? `Document: ${activeDoc.filename}` : `All Documents (${documentsCount} indexed)`}
          </strong>
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            ref={inputRef}
            className="chat-textarea"
            placeholder={
              documentsCount === 0
                ? "Upload or load sample documents to begin..."
                : "Ask a question about your uploaded documents (e.g. 'Summarize section 2', 'What are the main findings?')..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-send"
            disabled={!inputText.trim() || loading}
            aria-label="Send query"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
