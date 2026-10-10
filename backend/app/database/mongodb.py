import os
import json
import uuid
import asyncio
import logging
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings

logger = logging.getLogger("backend.database")


class FallbackCursor:
    def __init__(self, items: List[Dict[str, Any]], sort_key: Optional[str] = None, reverse: bool = False):
        self._items = items
        if sort_key:
            self._items.sort(key=lambda x: str(x.get(sort_key, "")), reverse=reverse)

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list) and len(key_or_list) > 0:
            key, direction = key_or_list[0]
        else:
            key = key_or_list
        reverse = direction < 0
        self._items.sort(key=lambda x: str(x.get(key, "")), reverse=reverse)
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is not None:
            return self._items[:length]
        return self._items

    def __aiter__(self):
        self._iter = iter(self._items)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class FallbackCollection:
    def __init__(self, name: str, filepath: str):
        self.name = name
        self.filepath = filepath
        self._data: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load fallback store for {self.name}: {e}")
                self._data = {}

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save fallback store for {self.name}: {e}")

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._matches(doc, q) for q in v):
                    return False
                continue
            doc_val = doc.get(k)
            if isinstance(v, dict):
                if "$in" in v and doc_val not in v["$in"]:
                    return False
                if "$ne" in v and doc_val == v["$ne"]:
                    return False
            elif doc_val != v:
                return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            for item in self._data.values():
                if self._matches(item, query):
                    return dict(item)
            return None

    def find(self, query: Optional[Dict[str, Any]] = None) -> FallbackCursor:
        query = query or {}
        matches = [dict(item) for item in self._data.values() if self._matches(item, query)]
        return FallbackCursor(matches)

    async def insert_one(self, doc: Dict[str, Any]):
        async with self._lock:
            doc_id = str(doc.get("_id") or doc.get("id") or uuid.uuid4())
            doc_copy = dict(doc)
            doc_copy["_id"] = doc_id
            if "id" not in doc_copy:
                doc_copy["id"] = doc_id
            self._data[doc_id] = doc_copy
            self._save()
            return type("InsertResult", (), {"inserted_id": doc_id})()

    async def insert_many(self, docs: List[Dict[str, Any]]):
        async with self._lock:
            ids = []
            for doc in docs:
                doc_id = str(doc.get("_id") or doc.get("id") or uuid.uuid4())
                doc_copy = dict(doc)
                doc_copy["_id"] = doc_id
                if "id" not in doc_copy:
                    doc_copy["id"] = doc_id
                self._data[doc_id] = doc_copy
                ids.append(doc_id)
            self._save()
            return type("InsertManyResult", (), {"inserted_ids": ids})()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        async with self._lock:
            matched = False
            for doc_id, item in self._data.items():
                if self._matches(item, query):
                    if "$set" in update:
                        item.update(update["$set"])
                    matched = True
                    break
            if matched:
                self._save()
            return type("UpdateResult", (), {"matched_count": 1 if matched else 0, "modified_count": 1 if matched else 0})()

    async def delete_one(self, query: Dict[str, Any]):
        async with self._lock:
            deleted_id = None
            for doc_id, item in self._data.items():
                if self._matches(item, query):
                    deleted_id = doc_id
                    break
            if deleted_id:
                del self._data[deleted_id]
                self._save()
                return type("DeleteResult", (), {"deleted_count": 1})()
            return type("DeleteResult", (), {"deleted_count": 0})()

    async def delete_many(self, query: Dict[str, Any]):
        async with self._lock:
            to_delete = [doc_id for doc_id, item in self._data.items() if self._matches(item, query)]
            for doc_id in to_delete:
                del self._data[doc_id]
            if to_delete:
                self._save()
            return type("DeleteResult", (), {"deleted_count": len(to_delete)})()

    async def count_documents(self, query: Dict[str, Any]) -> int:
        async with self._lock:
            return sum(1 for item in self._data.values() if self._matches(item, query))

    async def create_index(self, *args, **kwargs):
        pass


class FallbackDatabase:
    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        self._collections: Dict[str, FallbackCollection] = {}

    def get_collection(self, name: str) -> FallbackCollection:
        if name not in self._collections:
            path = os.path.join(self.storage_dir, f"{name}.json")
            self._collections[name] = FallbackCollection(name, path)
        return self._collections[name]

    def __getitem__(self, name: str) -> FallbackCollection:
        return self.get_collection(name)


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_mongodb_connected: bool = False
    status_message: str = "Initializing"

    async def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
            test_client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000
            )
            await test_client.admin.command('ping')
            self.client = test_client
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_mongodb_connected = True
            self.status_message = f"Connected to MongoDB ({settings.MONGODB_DB_NAME})"
            logger.info(f"Successfully connected to MongoDB: {settings.MONGODB_URI}")
            
            # Create indexes
            try:
                await self.db.users.create_index("email", unique=True)
                await self.db.documents.create_index([("owner_id", 1), ("created_at", -1)])
                await self.db.document_chunks.create_index([("document_id", 1), ("owner_id", 1)])
                await self.db.conversations.create_index([("owner_id", 1), ("updated_at", -1)])
                await self.db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
            except Exception as e:
                logger.warning(f"Index creation notice: {e}")

        except Exception as e:
            logger.warning(f"MongoDB not reachable ({e}). Falling back to local persistent store.")
            self.client = None
            self.db = FallbackDatabase(str(settings.DATA_FALLBACK_DIR))
            self.is_mongodb_connected = False
            self.status_message = "Operating in persistent local fallback mode (MongoDB offline)"

    async def close(self):
        if self.client:
            self.client.close()
            logger.info("Closed MongoDB client connection")


db_manager = DatabaseManager()


def get_db():
    if db_manager.db is None:
        db_manager.db = FallbackDatabase(str(settings.DATA_FALLBACK_DIR))
    return db_manager.db


def get_users_collection():
    return get_db()["users"]


def get_documents_collection():
    return get_db()["documents"]


def get_chunks_collection():
    return get_db()["document_chunks"]


def get_conversations_collection():
    return get_db()["conversations"]


def get_messages_collection():
    return get_db()["messages"]
