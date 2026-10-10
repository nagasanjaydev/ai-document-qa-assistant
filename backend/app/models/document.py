from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    summary: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class DocumentChunk(BaseModel):
    id: str
    doc_id: str
    user_id: str
    chunk_index: int
    content: str
    page_num: Optional[int] = 1
    char_count: int
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentMetadata
    chunk_count: int
