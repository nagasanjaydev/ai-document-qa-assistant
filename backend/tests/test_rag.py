import asyncio
import os
import sys

# Ensure root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.document_parser import DocumentParser
from backend.app.services.chunker import TextChunker
from backend.app.services.embedding_service import EmbeddingService

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_auth_workflow():
    # Demo login
    res = client.post("/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "email" in data["user"]


def test_document_parser_and_chunker():
    raw_txt = (
        "Retrieval-Augmented Generation (RAG) integrates retrieval with generative LLMs.\n\n"
        "It retrieves relevant document chunks from vector storage to provide factually grounded context.\n\n"
        "This architectural pattern eliminates LLM hallucinations."
    )
    pages = DocumentParser.parse_document("test_rag.txt", raw_txt.encode("utf-8"))
    assert len(pages) >= 1
    assert "Retrieval-Augmented" in pages[0]["text"]

    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    chunks = chunker.chunk_document(pages, document_id="doc-123", owner_id="user-456")
    assert len(chunks) >= 2
    for c in chunks:
        assert c["document_id"] == "doc-123"
        assert c["owner_id"] == "user-456"
        assert "chunk_text" in c


def test_embedding_and_similarity():
    async def _test():
        vec1 = await EmbeddingService.get_embedding("Deep learning algorithms for NLP")
        vec2 = await EmbeddingService.get_embedding("Neural networks and natural language understanding")
        vec3 = await EmbeddingService.get_embedding("Astrobiology and interstellar nebulae")

        sim_related = EmbeddingService.cosine_similarity(vec1, vec2)
        sim_unrelated = EmbeddingService.cosine_similarity(vec1, vec3)
        assert sim_related > sim_unrelated

    asyncio.run(_test())


def test_full_rag_api_cycle():
    # 1. Login
    login_res = client.post("/auth/demo")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload document
    sample_content = (
        "Enterprise Security Protocol:\n"
        "All data at rest is encrypted with AES-256 GCM.\n"
        "Multi-factor authentication (MFA) is strictly enforced for all administrative console access.\n"
        "SOC 2 Type II audit report was successfully passed with zero non-conformances."
    )
    files = {"file": ("security_policy.txt", sample_content.encode("utf-8"), "text/plain")}
    upload_res = client.post("/documents/upload", headers=headers, files=files)
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["document"]["document_id"]
    assert upload_res.json()["chunk_count"] >= 1

    # 3. Ask question via /chat/ask
    ask_payload = {
        "question": "What encryption standard is used for data at rest?",
        "document_id": doc_id,
        "top_k": 3
    }
    ask_res = client.post("/chat/ask", headers=headers, json=ask_payload)
    assert ask_res.status_code == 200
    answer_data = ask_res.json()
    assert "answer" in answer_data
    assert len(answer_data["sources"]) > 0
    assert answer_data["sources"][0]["document_id"] == doc_id

    # 4. Check conversation history
    conv_id = answer_data["conversation_id"]
    hist_res = client.get(f"/chat/history/{conv_id}", headers=headers)
    assert hist_res.status_code == 200
    msgs = hist_res.json()
    assert len(msgs) >= 2  # user + assistant

    # 5. Delete document
    del_res = client.delete(f"/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 200


if __name__ == "__main__":
    test_health_endpoint()
    test_auth_workflow()
    test_document_parser_and_chunker()
    test_embedding_and_similarity()
    test_full_rag_api_cycle()
    print("All backend tests in test_rag.py passed successfully! ✅")
