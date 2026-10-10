import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    "*",  # Allow all for seamless deployment across custom domains
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

# Mount API routers (both root and /api prefixed)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "mongodb_connected": db_manager.is_mongodb_connected,
        "database_status": db_manager.status_message,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY.strip()),
    }


# Static React Frontend Serving (Production & Render Single-Service Deployment)
candidate_dirs = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path.cwd() / "frontend" / "dist",
    Path.cwd() / "dist",
]
frontend_dist = next((d for d in candidate_dirs if d.exists() and (d / "index.html").exists()), None)

if frontend_dist and frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If requested path matches a real static file in dist (like favicon.svg)
        if full_path:
            file_candidate = frontend_dist / full_path
            if file_candidate.is_file():
                return FileResponse(file_candidate)
        # Otherwise serve index.html for React SPA client routing
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs_url": "/docs",
            "status": "online"
        }
