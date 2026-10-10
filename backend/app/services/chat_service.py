import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.app.database import get_conversations_collection, get_messages_collection
from backend.app.models.chat import ConversationSession, ChatMessage, SourceCitation


class ChatService:
    @staticmethod
    async def get_or_create_session(
        user_id: str,
        conversation_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        conv_col = get_conversations_collection()
        now = datetime.now(timezone.utc).isoformat()

        if conversation_id:
            session = await conv_col.find_one({
                "$or": [{"_id": conversation_id}, {"id": conversation_id}],
                "user_id": user_id
            })
            if session:
                return session

        # Create new session
        new_id = str(uuid.uuid4())
        session_data = {
            "id": new_id,
            "_id": new_id,
            "user_id": user_id,
            "doc_id": doc_id,
            "title": title or "New Conversation",
            "created_at": now,
            "updated_at": now,
            "message_count": 0
        }
        await conv_col.insert_one(session_data)
        return session_data

    @staticmethod
    async def list_user_sessions(user_id: str) -> List[Dict[str, Any]]:
        conv_col = get_conversations_collection()
        cursor = conv_col.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = await cursor.to_list(length=100)
        return sessions

    @staticmethod
    async def get_session_messages(conversation_id: str, user_id: str) -> List[Dict[str, Any]]:
        msg_col = get_messages_collection()
        cursor = msg_col.find({"conversation_id": conversation_id, "user_id": user_id}).sort("created_at", 1)
        messages = await cursor.to_list(length=200)
        return messages

    @staticmethod
    async def add_message(
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        msg_col = get_messages_collection()
        conv_col = get_conversations_collection()
        now = datetime.now(timezone.utc).isoformat()

        msg_id = str(uuid.uuid4())
        msg_data = {
            "id": msg_id,
            "_id": msg_id,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "sources": sources or [],
            "created_at": now
        }
        await msg_col.insert_one(msg_data)

        # Update conversation session timestamp and title if first query
        update_fields: Dict[str, Any] = {"updated_at": now}
        session = await conv_col.find_one({"$or": [{"_id": conversation_id}, {"id": conversation_id}]})
        if session and session.get("message_count", 0) == 0 and role == "user":
            # auto-generate title from first query
            clean_title = content.strip()[:40] + ("..." if len(content) > 40 else "")
            update_fields["title"] = clean_title
            update_fields["message_count"] = 1
        elif session:
            update_fields["message_count"] = session.get("message_count", 0) + 1

        await conv_col.update_one(
            {"$or": [{"_id": conversation_id}, {"id": conversation_id}]},
            {"$set": update_fields}
        )

        return msg_data

    @staticmethod
    async def clear_session(conversation_id: str, user_id: str):
        msg_col = get_messages_collection()
        conv_col = get_conversations_collection()
        await msg_col.delete_many({"conversation_id": conversation_id, "user_id": user_id})
        await conv_col.delete_one({"$or": [{"_id": conversation_id}, {"id": conversation_id}], "user_id": user_id})
