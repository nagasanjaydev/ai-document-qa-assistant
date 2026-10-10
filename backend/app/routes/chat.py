from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.config import settings
from backend.app.core.security import get_current_user
from backend.app.models.chat import (
    ChatAskRequest,
    ChatAskResponse,
    ConversationSummary,
    MessageItem
)
from backend.app.database.mongodb import (
    db_manager,
    get_documents_collection,
    get_chunks_collection
)
from backend.app.services.rag_service import RAGService
from backend.app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])


@router.post("/ask", response_model=ChatAskResponse)
async def ask_question(
    req: ChatAskRequest,
    current_user: dict = Depends(get_current_user)
):
    question = req.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    # 1. Fetch or create conversation thread
    conv = await ChatService.get_or_create_conversation(
        owner_id=current_user["id"],
        conversation_id=req.conversation_id,
        document_id=req.document_id
    )
    conversation_id = str(conv.get("id") or conv.get("_id"))

    # 2. Retrieve top-k chunks from user's authorized collection
    retrieved_chunks = await RAGService.retrieve_relevant_chunks(
        query=question,
        owner_id=current_user["id"],
        document_id=req.document_id,
        top_k=req.top_k
    )

    # 3. Retrieve conversation history for context
    past_msgs = await ChatService.get_conversation_messages(conversation_id, current_user["id"])
    history = [
        {"role": m.get("role", "user"), "text": m.get("text", "")}
        for m in past_msgs
    ]

    # 4. Generate grounded answer via Gemini
    rag_result = await RAGService.generate_grounded_answer(
        question=question,
        retrieved_chunks=retrieved_chunks,
        conversation_history=history
    )

    answer = rag_result["answer"]
    sources = rag_result["sources"]
    model_used = rag_result["model_used"]

    # 5. Persist user turn
    await ChatService.add_message(
        conversation_id=conversation_id,
        owner_id=current_user["id"],
        role="user",
        text=question
    )

    # 6. Persist assistant turn with sources
    await ChatService.add_message(
        conversation_id=conversation_id,
        owner_id=current_user["id"],
        role="assistant",
        text=answer,
        sources=[s.model_dump() for s in sources]
    )

    return ChatAskResponse(
        answer=answer,
        conversation_id=conversation_id,
        sources=sources,
        model_used=model_used
    )


@router.get("/history", response_model=List[ConversationSummary])
async def list_chat_history(current_user: dict = Depends(get_current_user)):
    docs_col = get_documents_collection()
    convs = await ChatService.list_user_conversations(current_user["id"])
    results = []

    for c in convs:
        doc_name = None
        d_id = c.get("document_id")
        if d_id:
            d_rec = await docs_col.find_one({"$or": [{"_id": d_id}, {"id": d_id}]})
            if d_rec:
                doc_name = d_rec.get("filename")

        c_id = str(c.get("id") or c.get("_id"))
        results.append(ConversationSummary(
            conversation_id=c_id,
            owner_id=str(c.get("owner_id")),
            title=c.get("title", "Conversation"),
            document_id=d_id,
            document_name=doc_name,
            message_count=c.get("message_count", 0),
            created_at=str(c.get("created_at", "")),
            updated_at=str(c.get("updated_at", ""))
        ))

    return results


@router.get("/history/{conversation_id}", response_model=List[MessageItem])
async def get_conversation_history(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    msgs = await ChatService.get_conversation_messages(conversation_id, current_user["id"])
    return [
        MessageItem(
            message_id=str(m.get("message_id") or m.get("id") or m.get("_id")),
            conversation_id=m.get("conversation_id"),
            owner_id=m.get("owner_id"),
            role=m.get("role"),
            text=m.get("text", ""),
            sources=m.get("sources", []),
            timestamp=str(m.get("created_at", ""))
        )
        for m in msgs
    ]


@router.delete("/history/{conversation_id}")
async def delete_conversation_history(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    await ChatService.delete_conversation(conversation_id, current_user["id"])
    return {"message": "Conversation history deleted."}


@router.post("/settings/api-key")
async def save_api_key(req: dict):
    new_key = req.get("api_key", "").strip()
    if not new_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key cannot be empty."
        )

    # Test key with Gemini
    validation_status = "validated"
    try:
        from google import genai
        client = genai.Client(api_key=new_key)
        client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents="hello",
        )
    except Exception as e:
        validation_status = f"saved (validation warning: {str(e)})"

    # Set in memory
    settings.GEMINI_API_KEY = new_key

    # Persist in .env
    from pathlib import Path
    import re
    env_paths = [
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]
    for p in env_paths:
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8")
                if "GEMINI_API_KEY=" in content:
                    content = re.sub(r"GEMINI_API_KEY=.*", f"GEMINI_API_KEY={new_key}", content)
                else:
                    content += f"\nGEMINI_API_KEY={new_key}\n"
                p.write_text(content, encoding="utf-8")
            except Exception:
                pass

    return {
        "status": "success",
        "validation": validation_status,
        "message": "Google Gemini API Key activated successfully!",
        "gemini_api_configured": True
    }


@router.get("/status")
async def get_system_status(current_user: dict = Depends(get_current_user)):

    docs_col = get_documents_collection()
    chunks_col = get_chunks_collection()

    doc_count = await docs_col.count_documents({"owner_id": current_user["id"]})
    chunk_count = await chunks_col.count_documents({"owner_id": current_user["id"]})

    return {
        "status": "healthy",
        "mongodb_connected": db_manager.is_mongodb_connected,
        "database_mode": "MongoDB Server" if db_manager.is_mongodb_connected else "Local Fallback Store",
        "db_status_message": db_manager.status_message,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY.strip()),
        "gemini_model": settings.GEMINI_MODEL,
        "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
        "user_documents_count": doc_count,
        "user_chunks_count": chunk_count,
        "user_id": current_user["id"]
    }
