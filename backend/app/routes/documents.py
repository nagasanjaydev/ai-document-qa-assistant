import os
import uuid
import aiofiles
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from backend.app.core.config import settings
from backend.app.core.security import get_current_user
from backend.app.models.document import DocumentResponse, DocumentUploadResponse, DocumentChunkModel
from backend.app.database.mongodb import get_documents_collection, get_chunks_collection
from backend.app.services.document_parser import DocumentParser
from backend.app.services.chunker import TextChunker
from backend.app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    filename = file.filename or "uploaded_document"
    file_bytes = await file.read()

    # 1. Validate & Parse document into pages
    pages = DocumentParser.parse_document(filename, file_bytes)

    # 2. Save file safely to storage directory
    doc_id = str(uuid.uuid4())
    stored_name = f"{doc_id}_{filename}"
    file_path = settings.UPLOAD_DIR / stored_name
    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(file_bytes)

    # 3. Chunk document with semantic sliding window
    chunker = TextChunker(chunk_size=700, chunk_overlap=140)
    raw_chunks = chunker.chunk_document(pages, document_id=doc_id, owner_id=current_user["id"])

    # 4. Generate embeddings
    chunk_texts = [c["chunk_text"] for c in raw_chunks]
    embeddings = await EmbeddingService.get_batch_embeddings(chunk_texts)

    # 5. Insert chunks into MongoDB
    chunks_col = get_chunks_collection()
    chunk_records = []
    now = datetime.now(timezone.utc).isoformat()

    for raw_c, emb in zip(raw_chunks, embeddings):
        chunk_id = str(uuid.uuid4())
        chunk_records.append({
            "id": chunk_id,
            "_id": chunk_id,
            "chunk_id": chunk_id,
            "document_id": doc_id,
            "owner_id": current_user["id"],
            "chunk_index": raw_c["chunk_index"],
            "page_number": raw_c["page_number"],
            "chunk_text": raw_c["chunk_text"],
            "char_count": raw_c["char_count"],
            "embedding": emb,
            "created_at": now
        })

    if chunk_records:
        await chunks_col.insert_many(chunk_records)

    # 6. Save document record
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    summary = raw_chunks[0]["chunk_text"][:220] + "..." if raw_chunks else ""

    doc_record = {
        "id": doc_id,
        "_id": doc_id,
        "document_id": doc_id,
        "owner_id": current_user["id"],
        "filename": filename,
        "file_type": ext,
        "file_size": len(file_bytes),
        "chunk_count": len(chunk_records),
        "status": "ready",
        "storage_path": str(file_path),
        "summary": summary,
        "created_at": now,
        "upload_timestamp": now
    }
    docs_col = get_documents_collection()
    await docs_col.insert_one(doc_record)

    doc_response = DocumentResponse(
        document_id=doc_id,
        owner_id=current_user["id"],
        filename=filename,
        file_type=ext,
        file_size=len(file_bytes),
        upload_timestamp=now,
        status="ready",
        chunk_count=len(chunk_records),
        summary=summary
    )

    return DocumentUploadResponse(
        message=f"Document '{filename}' processed into {len(chunk_records)} chunks.",
        document=doc_response,
        chunk_count=len(chunk_records)
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(current_user: dict = Depends(get_current_user)):
    docs_col = get_documents_collection()
    cursor = docs_col.find({"owner_id": current_user["id"]}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [
        DocumentResponse(
            document_id=str(d.get("document_id") or d.get("id") or d.get("_id")),
            owner_id=str(d.get("owner_id")),
            filename=d.get("filename", "Untitled"),
            file_type=d.get("file_type", "txt"),
            file_size=d.get("file_size", 0),
            upload_timestamp=str(d.get("upload_timestamp") or d.get("created_at", "")),
            status=d.get("status", "ready"),
            chunk_count=d.get("chunk_count", 0),
            summary=d.get("summary")
        )
        for d in docs
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    docs_col = get_documents_collection()
    doc = await docs_col.find_one({
        "$or": [{"_id": document_id}, {"id": document_id}, {"document_id": document_id}],
        "owner_id": current_user["id"]
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return DocumentResponse(
        document_id=str(doc.get("document_id") or doc.get("id") or doc.get("_id")),
        owner_id=str(doc.get("owner_id")),
        filename=doc.get("filename", "Untitled"),
        file_type=doc.get("file_type", "txt"),
        file_size=doc.get("file_size", 0),
        upload_timestamp=str(doc.get("upload_timestamp") or doc.get("created_at", "")),
        status=doc.get("status", "ready"),
        chunk_count=doc.get("chunk_count", 0),
        summary=doc.get("summary")
    )


@router.get("/{document_id}/chunks")
async def get_document_chunks(document_id: str, current_user: dict = Depends(get_current_user)):
    chunks_col = get_chunks_collection()
    cursor = chunks_col.find({
        "document_id": document_id,
        "owner_id": current_user["id"]
    }).sort("chunk_index", 1)
    chunks = await cursor.to_list(length=200)

    return [
        {
            "chunk_id": str(c.get("chunk_id") or c.get("id") or c.get("_id")),
            "chunk_index": c.get("chunk_index", 0),
            "page_number": c.get("page_number", 1),
            "char_count": c.get("char_count", len(c.get("chunk_text", ""))),
            "chunk_text": c.get("chunk_text", "")
        }
        for c in chunks
    ]


@router.delete("/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    docs_col = get_documents_collection()
    chunks_col = get_chunks_collection()

    doc = await docs_col.find_one({
        "$or": [{"_id": document_id}, {"id": document_id}, {"document_id": document_id}],
        "owner_id": current_user["id"]
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Delete disk file safely
    storage_path = doc.get("storage_path")
    if storage_path and os.path.exists(storage_path):
        try:
            os.remove(storage_path)
        except Exception:
            pass

    # Delete chunks
    await chunks_col.delete_many({"document_id": document_id, "owner_id": current_user["id"]})
    # Delete doc record
    await docs_col.delete_one({"$or": [{"_id": document_id}, {"id": document_id}, {"document_id": document_id}]})

    return {"message": f"Document '{doc.get('filename')}' and its vector embeddings deleted successfully."}
