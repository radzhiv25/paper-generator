# PaperCue — Deployment Guide

Covers three deployment targets in ascending complexity:
1. **Single-server VPS** (Render / Railway / DigitalOcean Droplet) — recommended for early prod
2. **Supabase + Vercel / Netlify** — frontend on CDN, backend on a managed platform
3. **Docker Compose** — for self-hosted or on-prem requirements

---

## Architecture overview

```
Browser
  │
  ├── Frontend (React SPA)  ──────────────────────── Static CDN / Vite build
  │     Calls /api/* and /auth/* on the backend
  │
  └── Backend (FastAPI)  ──────────────────────────── Python process
        │
        ├── SQLite (dev) / PostgreSQL (prod)
        ├── Uploads dir  (PDFs)
        ├── Exports dir  (DOCX/PDF output)
        └── LLM gateway  (OpenRouter / Ollama / Claude API)
```

---

## Option A — Single-server VPS (Render / Railway / DO)

Best for MVP. Backend and frontend served from one process or two services on the same platform.

### 1. PostgreSQL database

Create a managed Postgres instance (Render Postgres, Railway Postgres, Supabase, or Neon). Copy the connection string — you need it as `DATABASE_URL`.

```
postgresql://user:password@host:5432/papercue
```

### 2. Backend — environment variables

Create `backend/.env` (or set as platform env vars):

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/papercue

# Auth (generate a long random string — used to sign session tokens)
JWT_SECRET=change-me-to-a-long-random-secret

# LLM — set ONE of these strategies:

# Strategy A: BYOK only (users supply their own key in Settings)
LLM_PROVIDER=byok

# Strategy B: Claude server-side key (you pay, no key needed from users)
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-...

# Strategy C: OpenRouter server-side key
# LLM_PROVIDER=byok
# (set a default BYOK key at the request level via the Settings panel)

# Supabase (optional — only if using Supabase Auth)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=service_role_key

# File storage
UPLOAD_DIR=/app/uploads
EXPORT_DIR=/app/exports

# Misc
USE_MOCK_LLM=false
```

### 3. Backend — deploy steps

```bash
cd backend

# Install deps
pip install -r requirements.txt

# Run DB migrations
alembic upgrade head

# Start server (replace 8000 with your platform's PORT)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production use Gunicorn with Uvicorn workers:

```bash
pip install gunicorn
gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w 2 \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

> **Timeout note:** LLM generation can take 30–90 s. Set `--timeout 120` (or higher for slow models).

### 4. Frontend — build

```bash
cd frontend

# Set env vars for the build
cp .env.example .env.production
```

Edit `.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co      # if using Supabase Auth
VITE_SUPABASE_ANON_KEY=eyJ...                            # if using Supabase Auth
```

Build:

```bash
npm install
npm run build
# Output → frontend/dist/
```

Serve `dist/` as a static site (Netlify, Vercel, Nginx, Render Static Site).

### 5. CORS

The backend must allow the frontend origin. Add to `backend/app/main.py` if not already there:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Option B — Vercel (frontend) + Render (backend)

### Frontend on Vercel

1. Connect the GitHub repo to Vercel.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`
4. Output dir: `dist`
5. Add env vars in the Vercel dashboard:
   - `VITE_API_BASE_URL` → your Render backend URL
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (if using Supabase Auth)

### Backend on Render

1. New **Web Service** → connect repo.
2. Root dir: `backend`
3. Runtime: **Python 3.11**
4. Build command:
   ```bash
   pip install -r requirements.txt && alembic upgrade head
   ```
5. Start command:
   ```bash
   gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 --bind 0.0.0.0:$PORT --timeout 120
   ```
6. Add env vars from section A above.
7. Attach a **Render PostgreSQL** instance — Render injects `DATABASE_URL` automatically.

---

## Option C — Docker Compose (self-hosted)

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: papercue
      POSTGRES_USER: papercue
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U papercue"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://papercue:${POSTGRES_PASSWORD}@db:5432/papercue
      JWT_SECRET: ${JWT_SECRET}
      LLM_PROVIDER: ${LLM_PROVIDER:-byok}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      UPLOAD_DIR: /app/uploads
      EXPORT_DIR: /app/exports
    volumes:
      - uploads:/app/uploads
      - exports:/app/exports
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8000}
    restart: unless-stopped
    ports:
      - "3000:80"

volumes:
  pgdata:
  uploads:
  exports:
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN alembic upgrade head || true   # migrations run at start instead (see entrypoint)

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 --bind 0.0.0.0:8000 --timeout 120"]
```

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `frontend/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend (alternative to separate domain)
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

### `.env` for Docker Compose

```env
POSTGRES_PASSWORD=choose-a-strong-password
JWT_SECRET=choose-a-long-random-secret
LLM_PROVIDER=byok
ANTHROPIC_API_KEY=          # leave empty if using BYOK
VITE_API_BASE_URL=http://localhost:8000
```

### Start

```bash
cp .env.example .env        # fill in secrets
docker compose up --build
```

Frontend: http://localhost:3000  
Backend API docs: http://localhost:8000/docs

---

## LLM provider in production

| Strategy | Who pays | Setup |
|---|---|---|
| **BYOK (default)** | User supplies key in Settings panel | `LLM_PROVIDER=byok` — no server key needed |
| **Claude server key** | You pay per generation | `LLM_PROVIDER=claude` + `ANTHROPIC_API_KEY` |
| **OpenRouter server key** | You pay, any model | `LLM_PROVIDER=byok`, inject default key at infra level |
| **Local Ollama** | Free, needs GPU server | `LLM_PROVIDER=local` + `OLLAMA_BASE_URL` + `OLLAMA_MODEL` |

Best models for CBSE paper quality (via OpenRouter):
- `openai/gpt-4o` — highest quality, ~$0.015/generation
- `openai/gpt-4o-mini` — good quality, ~$0.001/generation (recommended default)
- `anthropic/claude-3.5-sonnet` — excellent for structured output
- `google/gemini-flash-1.5` — fastest + cheapest

---

## Checklist before go-live

- [ ] `JWT_SECRET` is a random 64+ character string (not the dev default)
- [ ] `DATABASE_URL` points to PostgreSQL, not SQLite
- [ ] `alembic upgrade head` run after deploy
- [ ] CORS `allow_origins` set to exact frontend domain (not `*`)
- [ ] `UPLOAD_DIR` and `EXPORT_DIR` are on a persistent volume (not ephemeral container storage)
- [ ] Backend timeout ≥ 120 s (LLM calls are slow)
- [ ] HTTPS on both frontend and backend domains
- [ ] BYOK keys never logged server-side (verified in `llm_client.py`)
- [ ] `USE_MOCK_LLM=false` in production env

---

## Monitoring

The backend exposes:
- `GET /health` — liveness check (returns `{ status: "ok" }`)
- `GET /api/config` — returns active `llm_provider` and feature flags (no secrets)

Use these as health-check endpoints in your load balancer or uptime monitor.
