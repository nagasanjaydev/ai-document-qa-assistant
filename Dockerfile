# =========================================================
# Stage 1: Build React Frontend
# =========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package manifests and install dependencies
COPY frontend/package*.json ./
RUN npm ci || npm install

# Copy frontend source code and build production bundle
COPY frontend/ ./
RUN npm run build

# =========================================================
# Stage 2: Production Python Backend & SPA Host
# =========================================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./backend/
COPY .env.example .env.example

# Copy compiled frontend SPA bundle into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory and data fallback directory
RUN mkdir -p /app/backend/uploads /app/backend/data_storage

# Default Render port (Render sets $PORT dynamically, defaults to 10000)
ENV PORT=10000
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 10000

# Start Uvicorn bound to 0.0.0.0 and $PORT
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
