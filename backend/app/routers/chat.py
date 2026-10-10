from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.config import settings
from backend.app.models.user import UserResponse
from backend.app.models.chat import (
    ChatQueryRequest,
    ChatResponse,
    ConversationSession,
    ChatMessage
)
from backend.app.database import (
    db_manager,
    get_documents_collection,
    get_chunks_collection
)
from backend.app.services.auth_service import get_optional_user
from backend.app.services.rag_service import RAGService
from backend.app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])


@router.post("/query", response_model=ChatResponse)
async def query_documents(
    request: ChatQueryRequest,
    current_user: UserResponse = Depends(get_optional_user)
):
    query_text = request.query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty"
        )

    # 1. Get or create conversation session
    session = await ChatService.get_or_create_session(
        user_id=current_user.id,
        conversation_id=request.conversation_id,
        doc_id=request.doc_id
    )
    conversation_id = str(session.get("id") or session.get("_id"))

    # 2. Retrieve top-k chunks using RAG pipeline
    retrieved_items = await RAGService.retrieve_chunks(
        query=query_text,
        user_id=current_user.id,
        doc_id=request.doc_id,
        top_k=request.top_k,
        api_key=request.api_key
    )

    # 3. Fetch past conversation turns for memory
    past_messages = await ChatService.get_session_messages(conversation_id, current_user.id)
    history = [
        {"role": m.get("role", "user"), "content": m.get("content", "")}
        for m in past_messages
    ]

    # 4. Generate grounded response using Gemini / RAG
    rag_result = await RAGService.generate_grounded_response(
        query=query_text,
        retrieved_items=retrieved_items,
        history=history,
        api_key=request.api_key
    )

    answer_text = rag_result["answer"]
    citations = rag_result["citations"]
    model_used = rag_result["model_used"]

    # 5. Save user message to database
    await ChatService.add_message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role="user",
        content=query_text
    )

    # 6. Save assistant message with citations to database
    await ChatService.add_message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role="assistant",
        content=answer_text,
        sources=[c.model_dump() for c in citations]
    )

    return ChatResponse(
        answer=answer_text,
        conversation_id=conversation_id,
        sources=citations,
        model_used=model_used
    )


@router.get("/sessions", response_model=List[ConversationSession])
async def list_sessions(current_user: UserResponse = Depends(get_optional_user)):
    docs_col = get_documents_collection()
    sessions = await ChatService.list_user_sessions(current_user.id)
    results = []
    for s in sessions:
        doc_name = None
        s_doc_id = s.get("doc_id")
        if s_doc_id:
            d_rec = await docs_col.find_one({"$or": [{"_id": s_doc_id}, {"id": s_doc_id}]})
            if d_rec:
                doc_name = d_rec.get("filename")

        results.append(ConversationSession(
            id=str(s.get("id") or s.get("_id")),
            user_id=str(s.get("user_id")),
            doc_id=s_doc_id,
            doc_name=doc_name,
            title=s.get("title", "Conversation"),
            created_at=str(s.get("created_at", "")),
            updated_at=str(s.get("updated_at", "")),
            message_count=s.get("message_count", 0)
        ))
    return results


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, current_user: UserResponse = Depends(get_optional_user)):
    messages = await ChatService.get_session_messages(session_id, current_user.id)
    return [
        {
            "id": str(m.get("id") or m.get("_id")),
            "conversation_id": m.get("conversation_id"),
            "role": m.get("role"),
            "content": m.get("content"),
            "sources": m.get("sources", []),
            "created_at": m.get("created_at")
        }
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: UserResponse = Depends(get_optional_user)):
    await ChatService.clear_session(session_id, current_user.id)
    return {"message": "Conversation session deleted."}


@router.get("/status")
async def get_system_status(current_user: UserResponse = Depends(get_optional_user)):
    docs_col = get_documents_collection()
    chunks_col = get_chunks_collection()

    doc_count = await docs_col.count_documents({"user_id": current_user.id})
    chunk_count = await chunks_col.count_documents({"user_id": current_user.id})

    has_env_key = bool(settings.GEMINI_API_KEY.strip())

    return {
        "status": "healthy",
        "mongodb_connected": db_manager.is_mongodb_connected,
        "database_mode": "MongoDB Server" if db_manager.is_mongodb_connected else "Local Fallback Store",
        "db_status_message": db_manager.status_message,
        "gemini_api_configured": has_env_key,
        "gemini_model": settings.GEMINI_MODEL,
        "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
        "user_documents_count": doc_count,
        "user_chunks_count": chunk_count,
        "user_id": current_user.id
    }
