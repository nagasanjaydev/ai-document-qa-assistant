import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import db_manager
from backend.app.routers import auth, documents, chat

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up AI Document QA Assistant backend...")
    await db_manager.connect()
    yield
    logger.info("Shutting down AI Document QA Assistant backend...")
    await db_manager.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI + MongoDB + Gemini RAG Assistant for PDF, DOCX, and TXT Q&A",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "mongodb_connected": db_manager.is_mongodb_connected,
        "database_status": db_manager.status_message,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY.strip()),
    }
