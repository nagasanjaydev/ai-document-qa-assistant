import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    PROJECT_NAME: str = "AI Document QA Assistant"
    VERSION: str = "1.0.0"

    # Environment variables
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")

    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "doc_qa_assistant")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "super-secret-jwt-key-change-in-production-2025")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR_PATH: str = os.getenv("UPLOAD_DIR", "./uploads")
    UPLOAD_DIR: Path = BASE_DIR / UPLOAD_DIR_PATH
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20"))

    DATA_FALLBACK_DIR: Path = BASE_DIR / "data_storage"


settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
