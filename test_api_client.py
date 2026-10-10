import sys
import os
import io
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api():
    print("--- 1. Testing GET /api/health ---")
    r = client.get("/api/health")
    print("Status:", r.status_code, "Data:", r.json())
    assert r.status_code == 200

    print("\n--- 2. Testing POST /api/auth/demo ---")
    r = client.post("/api/auth/demo")
    print("Status:", r.status_code, "User:", r.json()["user"])
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 3. Testing POST /api/documents/upload with Sample TXT ---")
    with open("backend/sample_documents/rag_architecture_overview.txt", "rb") as f:
        r = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("rag_architecture_overview.txt", f, "text/plain")}
        )
    print("Status:", r.status_code, "Chunks created:", r.json()["chunk_count"])
    assert r.status_code == 200
    txt_doc_id = r.json()["document"]["id"]

    print("\n--- 4. Testing POST /api/documents/upload with Sample DOCX ---")
    with open("backend/sample_documents/cloud_security_report.docx", "rb") as f:
        r = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("cloud_security_report.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
    print("Status:", r.status_code, "Chunks created:", r.json()["chunk_count"])
    assert r.status_code == 200

    print("\n--- 5. Testing POST /api/documents/upload with Sample PDF ---")
    with open("backend/sample_documents/employee_handbook_summary.pdf", "rb") as f:
        r = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("employee_handbook_summary.pdf", f, "application/pdf")}
        )
    print("Status:", r.status_code, "Chunks created:", r.json()["chunk_count"])
    assert r.status_code == 200

    print("\n--- 6. Testing GET /api/documents (List Documents) ---")
    r = client.get("/api/documents", headers=headers)
    docs = r.json()
    print("Status:", r.status_code, f"Loaded {len(docs)} documents")
    for d in docs:
        print(f"  - {d['filename']} ({d['file_type'].upper()}, {d['chunk_count']} chunks)")
    assert r.status_code == 200
    assert len(docs) >= 3

    print("\n--- 7. Testing GET /api/documents/{id}/chunks inspection ---")
    r = client.get(f"/api/documents/{txt_doc_id}/chunks", headers=headers)
    chunks = r.json()
    print("Status:", r.status_code, f"Retrieved {len(chunks)} chunks")
    print(f"  Chunk 0 preview: {chunks[0]['content'][:60]}...")
    assert r.status_code == 200

    print("\n--- 8. Testing POST /api/chat/query (RAG Retrieval + Grounded Answer) ---")
    payload = {
        "query": "What are the core components of the RAG architecture?",
        "top_k": 3
    }
    r = client.post("/api/chat/query", headers=headers, json=payload)
    print("Status:", r.status_code)
    data = r.json()
    print("Conversation ID:", data["conversation_id"])
    print("Model Used:", data["model_used"])
    print(f"Citations Returned: {len(data['sources'])}")
    for i, src in enumerate(data["sources"]):
        print(f"  Source #{i+1}: {src['filename']} (Page {src['page_num']}, Score: {src['score']})")
    print("\nAnswer Excerpt:\n", data["answer"][:280], "...\n")
    assert r.status_code == 200
    assert len(data["sources"]) > 0

    print("\n--- 9. Testing POST /api/chat/query for Remote Work Policy ---")
    payload2 = {
        "query": "What is the equipment allowance and health benefits?",
        "top_k": 3
    }
    r2 = client.post("/api/chat/query", headers=headers, json=payload2)
    data2 = r2.json()
    print("Status:", r2.status_code)
    print("Top Citation:", data2["sources"][0]["filename"])
    print("\nAnswer Excerpt:\n", data2["answer"][:280], "...\n")
    assert r2.status_code == 200

    print("\n--- 10. Testing GET /api/chat/sessions ---")
    r = client.get("/api/chat/sessions", headers=headers)
    sessions = r.json()
    print("Status:", r.status_code, f"Sessions count: {len(sessions)}")
    assert r.status_code == 200
    assert len(sessions) >= 1

    session_id = sessions[0]["id"]
    print(f"\n--- 11. Testing GET /api/chat/sessions/{session_id}/messages ---")
    r = client.get(f"/api/chat/sessions/{session_id}/messages", headers=headers)
    messages = r.json()
    print("Status:", r.status_code, f"Messages count: {len(messages)}")
    assert r.status_code == 200
    assert len(messages) >= 2

    print("\n--- 12. Testing GET /api/chat/status ---")
    r = client.get("/api/chat/status", headers=headers)
    status_data = r.json()
    print("Status:", r.status_code)
    print("System Diagnostics:", json.dumps(status_data, indent=2))
    assert r.status_code == 200

    print("\n=======================================================")
    print("ALL API ENDPOINTS VALIDATED AND PASSING 100%! 🚀")
    print("=======================================================")

if __name__ == "__main__":
    test_api()
