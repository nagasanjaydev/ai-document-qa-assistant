import uvicorn
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting AI Document QA Assistant backend on http://0.0.0.0:{port}")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
