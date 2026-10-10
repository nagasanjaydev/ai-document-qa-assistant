import os
import uuid
import aiofiles
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from backend.app.config import settings
from backend.app.models.user import UserResponse
from backend.app.models.document import DocumentMetadata, DocumentUploadResponse, DocumentChunk
from backend.app.database import get_documents_collection, get_chunks_collection
from backend.app.services.auth_service import get_optional_user
from backend.app.services.document_parser import DocumentParser
from backend.app.services.chunker import TextChunker
from backend.app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".json"}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    current_user: UserResponse = Depends(get_optional_user)
):
    filename = file.filename or "uploaded_file"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {ext}. Allowed: PDF, DOCX, TXT, MD, CSV."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    doc_id = str(uuid.uuid4())
    saved_filename = f"{doc_id}_{filename}"
    file_path = settings.UPLOAD_DIR / saved_filename

    # Save to uploads directory
    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(file_bytes)

    # 1. Parse document into pages/sections
    try:
        pages = DocumentParser.parse_file(filename, file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse document content: {str(e)}"
        )

    # 2. Chunk document into semantic segments
    chunker = TextChunker(chunk_size=700, chunk_overlap=140)
    raw_chunks = chunker.chunk_document_pages(pages)

    # 3. Generate embeddings for all chunks
    chunk_texts = [c["content"] for c in raw_chunks]
    embeddings = await EmbeddingService.get_batch_embeddings(chunk_texts, api_key=api_key)

    # 4. Prepare chunk records for MongoDB
    chunks_col = get_chunks_collection()
    chunk_records = []
    now = datetime.now(timezone.utc).isoformat()

    for idx, (raw_c, emb) in enumerate(zip(raw_chunks, embeddings)):
        chunk_id = str(uuid.uuid4())
        chunk_records.append({
            "id": chunk_id,
            "_id": chunk_id,
            "doc_id": doc_id,
            "user_id": current_user.id,
            "chunk_index": raw_c["chunk_index"],
            "content": raw_c["content"],
            "page_num": raw_c.get("page_num", 1),
            "char_count": raw_c["char_count"],
            "embedding": emb,
            "created_at": now
        })

    if chunk_records:
        await chunks_col.insert_many(chunk_records)

    # 5. Extract a quick summary preview
    summary = ""
    if raw_chunks:
        first_content = raw_chunks[0]["content"]
        summary = first_content[:200] + ("..." if len(first_content) > 200 else "")

    # 6. Save document record
    doc_record = {
        "id": doc_id,
        "_id": doc_id,
        "user_id": current_user.id,
        "filename": filename,
        "file_type": ext.lstrip("."),
        "file_size": len(file_bytes),
        "chunk_count": len(chunk_records),
        "summary": summary,
        "created_at": now
    }
    docs_col = get_documents_collection()
    await docs_col.insert_one(doc_record)

    doc_meta = DocumentMetadata(
        id=doc_id,
        user_id=current_user.id,
        filename=filename,
        file_type=ext.lstrip("."),
        file_size=len(file_bytes),
        chunk_count=len(chunk_records),
        summary=summary,
        created_at=now
    )

    return DocumentUploadResponse(
        message="Document uploaded, chunked, and indexed successfully.",
        document=doc_meta,
        chunk_count=len(chunk_records)
    )


@router.get("", response_model=List[DocumentMetadata])
async def list_documents(current_user: UserResponse = Depends(get_optional_user)):
    docs_col = get_documents_collection()
    cursor = docs_col.find({"user_id": current_user.id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [
        DocumentMetadata(
            id=str(d.get("id") or d.get("_id")),
            user_id=str(d.get("user_id")),
            filename=d.get("filename", ""),
            file_type=d.get("file_type", ""),
            file_size=d.get("file_size", 0),
            chunk_count=d.get("chunk_count", 0),
            summary=d.get("summary"),
            created_at=str(d.get("created_at", ""))
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentMetadata)
async def get_document(doc_id: str, current_user: UserResponse = Depends(get_optional_user)):
    docs_col = get_documents_collection()
    doc = await docs_col.find_one({"$or": [{"_id": doc_id}, {"id": doc_id}], "user_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentMetadata(
        id=str(doc.get("id") or doc.get("_id")),
        user_id=str(doc.get("user_id")),
        filename=doc.get("filename", ""),
        file_type=doc.get("file_type", ""),
        file_size=doc.get("file_size", 0),
        chunk_count=doc.get("chunk_count", 0),
        summary=doc.get("summary"),
        created_at=str(doc.get("created_at", ""))
    )


@router.get("/{doc_id}/chunks")
async def get_document_chunks(doc_id: str, current_user: UserResponse = Depends(get_optional_user)):
    chunks_col = get_chunks_collection()
    cursor = chunks_col.find({"doc_id": doc_id, "user_id": current_user.id}).sort("chunk_index", 1)
    chunks = await cursor.to_list(length=200)
    # Strip embedding vectors to keep response lightweight
    result = []
    for c in chunks:
        result.append({
            "id": str(c.get("id") or c.get("_id")),
            "chunk_index": c.get("chunk_index"),
            "page_num": c.get("page_num", 1),
            "char_count": c.get("char_count", len(c.get("content", ""))),
            "content": c.get("content", "")
        })
    return result


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: UserResponse = Depends(get_optional_user)):
    docs_col = get_documents_collection()
    chunks_col = get_chunks_collection()

    doc = await docs_col.find_one({"$or": [{"_id": doc_id}, {"id": doc_id}], "user_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Delete chunks
    await chunks_col.delete_many({"doc_id": doc_id})
    # Delete doc record
    await docs_col.delete_one({"$or": [{"_id": doc_id}, {"id": doc_id}]})

    return {"message": f"Document '{doc.get('filename')}' and all indexed chunks deleted."}
