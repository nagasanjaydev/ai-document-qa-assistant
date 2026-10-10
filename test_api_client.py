import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api():
    print("--- 1. Testing GET /health ---")
    r = client.get("/health")
    assert r.status_code == 200
    print("Health Status:", r.json())

    print("\n--- 2. Testing POST /auth/demo ---")
    r = client.post("/auth/demo")
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("User authenticated:", r.json()["user"])

    print("\n--- 3. Testing POST /documents/upload with TXT ---")
    with open("backend/sample_documents/rag_architecture_overview.txt", "rb") as f:
        r = client.post(
            "/documents/upload",
            headers=headers,
            files={"file": ("rag_architecture_overview.txt", f, "text/plain")}
        )
    assert r.status_code == 200
    txt_doc_id = r.json()["document"]["document_id"]
    print("TXT Upload success:", r.json()["message"])

    print("\n--- 4. Testing POST /documents/upload with DOCX ---")
    with open("backend/sample_documents/cloud_security_report.docx", "rb") as f:
        r = client.post(
            "/documents/upload",
            headers=headers,
            files={"file": ("cloud_security_report.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
    assert r.status_code == 200
    print("DOCX Upload success:", r.json()["message"])

    print("\n--- 5. Testing POST /documents/upload with PDF ---")
    with open("backend/sample_documents/employee_handbook_summary.pdf", "rb") as f:
        r = client.post(
            "/documents/upload",
            headers=headers,
            files={"file": ("employee_handbook_summary.pdf", f, "application/pdf")}
        )
    assert r.status_code == 200
    print("PDF Upload success:", r.json()["message"])

    print("\n--- 6. Testing GET /documents ---")
    r = client.get("/documents", headers=headers)
    assert r.status_code == 200
    docs = r.json()
    print(f"Listed {len(docs)} documents successfully.")
    for d in docs:
        print(f"  - {d['filename']} ({d['file_type'].upper()}, {d['chunk_count']} chunks)")

    print(f"\n--- 7. Testing GET /documents/{txt_doc_id}/chunks ---")
    r = client.get(f"/documents/{txt_doc_id}/chunks", headers=headers)
    assert r.status_code == 200
    chunks = r.json()
    print(f"Loaded {len(chunks)} chunks for inspector.")

    print("\n--- 8. Testing POST /chat/ask (RAG Retrieval + Grounded Answer) ---")
    payload = {
        "question": "What are the core components of the RAG architecture?",
        "document_id": txt_doc_id,
        "top_k": 3
    }
    r = client.post("/chat/ask", headers=headers, json=payload)
    assert r.status_code == 200
    ans_data = r.json()
    print("Answer model:", ans_data["model_used"])
    print(f"Citations returned: {len(ans_data['sources'])}")
    for i, s in enumerate(ans_data["sources"]):
        print(f"  Source #{i+1}: {s['filename']} (Page {s['page_number']}, Score: {s['relevance_score']})")
    print("\nAnswer Excerpt:\n", ans_data["answer"][:250], "...\n")

    print("\n--- 9. Testing GET /chat/history ---")
    r = client.get("/chat/history", headers=headers)
    assert r.status_code == 200
    convs = r.json()
    assert len(convs) >= 1
    print(f"Listed {len(convs)} conversation sessions.")
    conv_id = convs[0]["conversation_id"]

    print(f"\n--- 10. Testing GET /chat/history/{conv_id} ---")
    r = client.get(f"/chat/history/{conv_id}", headers=headers)
    assert r.status_code == 200
    msgs = r.json()
    print(f"Loaded {len(msgs)} messages in conversation.")

    print("\n--- 11. Testing GET /chat/status ---")
    r = client.get("/chat/status", headers=headers)
    assert r.status_code == 200
    print("System status:", r.json())

    print("\n=======================================================")
    print("ALL REST API ENDPOINTS VALIDATED AND PASSING 100%! 🚀")
    print("=======================================================")

if __name__ == "__main__":
    test_api()
