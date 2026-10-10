from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    document_id: str
    owner_id: str
    filename: str
    file_type: str
    file_size: int
    upload_timestamp: str
    status: str
    chunk_count: int
    summary: Optional[str] = None


class DocumentChunkModel(BaseModel):
    chunk_id: str
    document_id: str
    owner_id: str
    chunk_text: str
    page_number: Optional[int] = 1
    chunk_index: int
    char_count: int


class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentResponse
    chunk_count: int
