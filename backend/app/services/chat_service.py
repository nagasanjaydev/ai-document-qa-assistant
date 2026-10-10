import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.app.database.mongodb import get_conversations_collection, get_messages_collection


class ChatService:
    @staticmethod
    async def get_or_create_conversation(
        owner_id: str,
        conversation_id: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        conv_col = get_conversations_collection()
        now = datetime.now(timezone.utc).isoformat()

        if conversation_id:
            conv = await conv_col.find_one({
                "$or": [{"_id": conversation_id}, {"id": conversation_id}],
                "owner_id": owner_id
            })
            if conv:
                return conv

        new_id = str(uuid.uuid4())
        conv_data = {
            "id": new_id,
            "_id": new_id,
            "owner_id": owner_id,
            "document_id": document_id,
            "title": "New Conversation",
            "message_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await conv_col.insert_one(conv_data)
        return conv_data

    @staticmethod
    async def list_user_conversations(owner_id: str) -> List[Dict[str, Any]]:
        conv_col = get_conversations_collection()
        cursor = conv_col.find({"owner_id": owner_id}).sort("updated_at", -1)
        return await cursor.to_list(length=100)

    @staticmethod
    async def get_conversation_messages(conversation_id: str, owner_id: str) -> List[Dict[str, Any]]:
        msg_col = get_messages_collection()
        cursor = msg_col.find({"conversation_id": conversation_id, "owner_id": owner_id}).sort("created_at", 1)
        return await cursor.to_list(length=200)

    @staticmethod
    async def add_message(
        conversation_id: str,
        owner_id: str,
        role: str,
        text: str,
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
            "owner_id": owner_id,
            "role": role,
            "text": text,
            "sources": sources or [],
            "created_at": now
        }
        await msg_col.insert_one(msg_data)

        # Update conversation title & count
        conv = await conv_col.find_one({"$or": [{"_id": conversation_id}, {"id": conversation_id}]})
        update_fields: Dict[str, Any] = {"updated_at": now}
        if conv:
            if conv.get("message_count", 0) == 0 and role == "user":
                clean_title = text.strip()[:40] + ("..." if len(text) > 40 else "")
                update_fields["title"] = clean_title
            update_fields["message_count"] = conv.get("message_count", 0) + 1

        await conv_col.update_one(
            {"$or": [{"_id": conversation_id}, {"id": conversation_id}]},
            {"$set": update_fields}
        )

        return msg_data

    @staticmethod
    async def delete_conversation(conversation_id: str, owner_id: str):
        msg_col = get_messages_collection()
        conv_col = get_conversations_collection()
        await msg_col.delete_many({"conversation_id": conversation_id, "owner_id": owner_id})
        await conv_col.delete_one({"$or": [{"_id": conversation_id}, {"id": conversation_id}], "owner_id": owner_id})
