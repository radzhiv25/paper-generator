# PaperCue — AI Question Paper Generator for CBSE Teachers

PaperCue lets teachers describe the exam paper they need in plain English, generates a fully structured CBSE question paper via LLM, and opens it in a Word-like editor where every question can be re-prompted individually. Papers are saved automatically and can be exported to DOCX.

- Generates Section A–E CBSE papers with correct marks, difficulty distribution, and sub-questions
- Renders LaTeX equations and chemical formulas inline using KaTeX
- Supports Bring Your Own Key (BYOK) via OpenRouter — no backend restart needed to switch models
- Structured output is always Pydantic-validated before hitting the editor; bad LLM output is retried automatically

> **Screenshot placeholder** — add `docs/screenshot.png` once the UI stabilises.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TipTap, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic v2, httpx |
| AI | OpenRouter (BYOK), local Ollama, Anthropic Claude (server-key), mock fixtures |
| Auth | Supabase (frontend session + JWT); JWT validation in FastAPI `deps.py` |
| Database | SQLite (dev default), PostgreSQL + pgvector (production) |
| Export | docxtpl (DOCX); PDF planned |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) [Ollama](https://ollama.com) for local LLM generation
- (Optional) Supabase project for auth — the app runs in local guest mode without it

---

## Quick start

**Terminal 1 — backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit as needed (see env vars table below)
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
cp .env.example .env            # set VITE_API_BASE_URL if not using default
npm run dev
```

App: http://localhost:5173

The frontend calls `http://localhost:8000` by default. If the backend is unreachable it falls back to mock fixture data automatically (development only).

---

## AI provider setup

### Option A — Mock / dev (no key, no model needed)

```bash
# backend/.env
LLM_PROVIDER=mock
```

The backend returns a pre-built sample CBSE paper instantly. Use this when developing frontend features.

### Option B — OpenRouter BYOK (recommended for quality)

1. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. In `backend/.env`:
   ```
   LLM_PROVIDER=byok
   ```
3. In the app, open **Settings** (sidebar icon) → select **OpenRouter** → paste your `sk-or-…` key → pick a model preset → **Save**.

No backend restart needed. The key stays in your browser and is sent as a request header only during generation.

Recommended model slugs for CBSE papers (via OpenRouter):

| Slug | Notes |
|---|---|
| `openai/gpt-4o-mini` | Best value; handles LaTeX + chemistry well |
| `openai/gpt-4o` | Highest quality; use for final papers |
| `anthropic/claude-3.5-sonnet` | Excellent reasoning; slightly slower |
| `anthropic/claude-3-haiku-20240307` | Fast and cheap; good for drafts |
| `google/gemini-flash-1.5` | Cheapest; adequate for simple papers |

### Option C — Local Ollama (free, runs on your machine)

```bash
# Install Ollama: https://ollama.com
ollama pull llama3.2            # or llama3.1:8b for better quality

# backend/.env
LLM_PROVIDER=local
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
```

Start Ollama before starting the backend. No key needed in Settings.

Note: smaller local models (< 13B) may produce malformed JSON. The backend retries automatically, but complex papers with sub-questions and formulas work best with 7B+ instruction-tuned models.

### Option D — Claude server-key (Anthropic direct, no browser key)

```bash
# backend/.env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-…
```

Uses `claude-sonnet-4-20250514` on the server side. No Settings panel configuration needed. This is the recommended setup for production deployment where you control the key.

---

## BYOK via Settings panel

When `LLM_PROVIDER=byok` is set on the backend, the AI provider is fully controlled from the browser:

1. Open **Settings** in the left sidebar.
2. Select a **Provider** (OpenRouter, OpenAI, Anthropic, or Custom for Ollama/LM Studio/vLLM).
3. For **Custom**, enter the base URL of your OpenAI-compatible endpoint (e.g. `http://localhost:1234/v1`).
4. Paste your **API key** (optional for local servers).
5. Pick a **Model** from the preset chips or type a slug manually.
6. Click **Save** — the key is stored in browser localStorage only.

The key indicator shows the first 8 characters of the saved key so you can confirm which key is active. No backend restart is needed to switch providers or models.

---

## CBSE paper structure

PaperCue generates papers following the standard CBSE pattern:

| Section | Type | Marks each | Notes |
|---|---|---|---|
| A | MCQ / Very Short Answer | 1 | MCQs have exactly 4 options |
| B | Short Answer I | 2 | Direct concept questions |
| C | Short Answer II | 3 | Explanation or derivation |
| D | Long Answer | 5 | Sub-questions (a)(b)(c) summing to 5 |
| E | Case / Source-based | 4–5 | Passage in main content + sub-questions |

Sub-questions (`sub_questions` array on a Question) carry their own `marks` and `content`. Sections D and E support internal choice (OR): a second question of the same marks with `"OR"` as the first text block.

All mathematical expressions use LaTeX equation blocks (rendered via KaTeX). All chemical formulas and reactions use `chem_notation` blocks.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./paper_generator.db` | SQLAlchemy connection string |
| `LLM_PROVIDER` | `local` | `local` / `claude` / `byok` / `mock` |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible base URL for local model |
| `OLLAMA_MODEL` | `llama3.2` | Model slug passed to local endpoint |
| `ANTHROPIC_API_KEY` | — | Server-side Claude key (used when `LLM_PROVIDER=claude`) |
| `USE_MOCK_LLM` | `false` | Force mock for all requests regardless of provider |
| `JWT_SECRET` | `dev-secret-…` | Supabase JWT verification secret |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase service role key (server-side only) |
| `UPLOAD_DIR` | `./uploads` | Temporary storage for uploaded context files |
| `EXPORT_DIR` | `./exports` | Output directory for generated DOCX/PDF files |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama model for RAG embeddings |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL |
| `VITE_SUPABASE_URL` | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | — | Supabase anon/public key |
| `VITE_USE_FIXTURES` | — | Set to `true` to force fixture data without a backend |

---

## Project structure

```
paper-generator/
  backend/
    app/
      api/          # Route handlers (papers, generation, upload, export, templates)
      models/       # SQLAlchemy ORM
      schemas/      # Pydantic schemas — data contract with frontend
      services/     # LLM client, PDF parser, RAG, DOCX export, job tracker
    alembic/        # Database migrations
  frontend/
    src/
      editor/       # TipTap extensions, Paper↔TipTap converters, TypeScript schema
      components/   # DocumentCanvas, PromptPanel, AnswerKey, Sidebar, Auth, Landing
      state/        # PaperContext, AuthContext, ThemeContext
      api/          # Fetch wrappers (all API calls go through api/client.ts)
      lib/          # Settings helpers (BYOK localStorage), Supabase client
  docs/             # PRD and supporting documentation
  AGENT.md          # Full developer/agent onboarding guide
  PROGRESS.md       # Feature status tracker
  SKILLS.md         # Claude Code slash commands and agent workflow guide
```

---

## Contributing

Read `AGENT.md` before making any changes. It documents:

- The data contract between frontend and backend schemas (must be kept in sync)
- The BYOK key flow and why keys must never be stored server-side
- LLM provider compatibility rules (`response_format`, `options.num_predict`)
- SDE standards: auth dependency injection, Pydantic validation, API client usage

For multi-file changes that cross the frontend/backend boundary, always update `backend/app/schemas/paper.py` and `frontend/src/editor/schema.ts` together in the same commit.
