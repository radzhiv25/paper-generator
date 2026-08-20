# AI Question Paper Generator

Full-stack app for generating, editing, and exporting exam papers with AI assistance.

## Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) Ollama for local LLM generation

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit as needed
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Frontend

```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_BASE_URL if not using default
npm run dev
```

App: http://localhost:5173

## Running together

1. Start the backend on port 8000.
2. Start the frontend dev server.
3. Open the app in your browser. The frontend calls `http://localhost:8000` by default (`VITE_API_BASE_URL`).

If the backend is unavailable, the frontend falls back to mock data automatically.

## AI providers

### Option A — Local Ollama (free, no API key)

```bash
# Install Ollama, then pull a model (use `ollama list` to see installed names)
ollama pull llama3.2

# backend/.env
LLM_PROVIDER=local
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=minimax-m3:cloud   # or llama3.2:3b, etc.
```

Start the backend and generate — no key needed in the app.

### Option B — OpenRouter (cheap hosted models)

1. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. In `backend/.env`:
   ```
   LLM_PROVIDER=byok
   OLLAMA_MODEL=openai/gpt-4o-mini
   ```
   Pick any model slug from the OpenRouter catalog.
3. In the app **Settings** panel: provider **OpenRouter**, paste your `sk-or-…` key, save.

### Option C — Other OpenAI-compatible servers (LM Studio, vLLM, etc.)

**Server-side (no browser key):**
```
LLM_PROVIDER=local
OLLAMA_BASE_URL=http://localhost:1234/v1
OLLAMA_MODEL=your-model-name
```

**Browser BYOK (key optional for local):**
```
LLM_PROVIDER=byok
OLLAMA_MODEL=your-model-name
```
Then in Settings choose **Custom** and set the base URL (e.g. `http://localhost:1234/v1`).

### Option D — Direct Anthropic (server key)

```
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-…
```

Keys in the Settings panel are only used when `LLM_PROVIDER=byok`.
