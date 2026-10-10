import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.database.mongodb import db_manager
from backend.app.routes import auth, documents, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing AI Document QA Assistant backend services...")
    await db_manager.connect()
    yield
    logger.info("Gracefully closing database connections...")
    await db_manager.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise RAG Document QA Assistant with FastAPI, MongoDB, and Google Gemini API",
    lifespan=lifespan
)

# CORS configuration
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes at root level
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

# Also mount at /api prefix for proxy compatibility
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "mongodb_connected": db_manager.is_mongodb_connected,
        "database_status": db_manager.status_message,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY.strip()),
    }
