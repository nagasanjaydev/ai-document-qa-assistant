from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SourceReference(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    page_number: Optional[int] = 1
    relevance_score: float
    text_snippet: str


class ChatAskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_id: Optional[str] = None  # None queries all authorized documents for the user
    conversation_id: Optional[str] = None
    top_k: int = Field(default=4, ge=1, le=10)


class ChatAskResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: List[SourceReference]
    model_used: str


class ConversationSummary(BaseModel):
    conversation_id: str
    owner_id: str
    title: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    message_count: int = 0
    created_at: str
    updated_at: str


class MessageItem(BaseModel):
    message_id: str
    conversation_id: str
    owner_id: str
    role: str  # "user" or "assistant"
    text: str
    sources: Optional[List[SourceReference]] = None
    timestamp: str
