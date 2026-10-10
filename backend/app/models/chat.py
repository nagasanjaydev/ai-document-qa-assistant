from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    doc_id: str
    filename: str
    chunk_index: int
    page_num: Optional[int] = 1
    score: float
    snippet: str


class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    doc_id: Optional[str] = None  # None means search across all user documents
    conversation_id: Optional[str] = None
    top_k: int = Field(default=4, ge=1, le=10)
    api_key: Optional[str] = None  # Optional client-provided Gemini API key


class ChatMessage(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str  # "user" or "assistant"
    content: str
    sources: Optional[List[SourceCitation]] = None
    created_at: str


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: List[SourceCitation]
    model_used: str


class ConversationSession(BaseModel):
    id: str
    user_id: str
    doc_id: Optional[str] = None
    doc_name: Optional[str] = None
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
