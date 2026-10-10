#!/usr/bin/env bash
# Render Build Script for AI Document QA Assistant
set -e

echo "=================================================="
echo "🚀 Starting Build Process on Render"
echo "=================================================="

# 1. Install Python dependencies
echo "📦 Installing Python dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# 2. Check or install Node.js (if running on native Python runtime without preinstalled Node)
echo "🔍 Checking Node.js runtime..."
if ! command -v node >/dev/null 2>&1; then
    echo "⚡ Node.js not detected. Installing Node.js via nvm..."
    export NVM_DIR="$HOME/.nvm"
    if [ ! -d "$NVM_DIR" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

echo "✅ Node version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 3. Build Vite React frontend
echo "🎨 Building React Frontend SPA..."
cd frontend
npm install
npm run build
cd ..

# 4. Verify build output
if [ -d "frontend/dist" ]; then
    echo "🎉 Frontend build successful! Assets ready in frontend/dist"
else
    echo "❌ Error: frontend/dist not found!"
    exit 1
fi

echo "=================================================="
echo "✅ Build completed successfully!"
echo "=================================================="
