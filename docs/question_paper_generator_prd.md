# PRD: AI Question Paper Generator for Teachers

**Version:** 0.1 (Draft MVP scope)
**Author:** Rajeev
**Status:** Pre-build / planning

---

## 1. Problem Statement

Teachers spend significant time manually formatting question papers in Word — retyping questions, adjusting layouts to match board/institution templates (CBSE, general school format, etc.), balancing marks distribution, and separately preparing answer keys. Existing content (textbooks, notes, past papers as PDFs) isn't leveraged directly; it's re-read and re-typed.

## 2. Existing Landscape (so we don't rebuild what exists)

This category already has real players — worth being clear-eyed about this before building:

- **Eklavvya, EdutorAI, Quizbot, Quillionz, Smallpdf AI Question Generator, StudyFetch** — all let you upload a PDF/text/image and generate MCQs, short-answer, or descriptive questions, some with Bloom's Taxonomy leveling and export to PDF/CSV/PPT.
- **Eklavvya specifically claims support for math/chemistry notation** rendering correctly in both editor and PDF export, and targets exam-board workflows (blueprint → AI draft → teacher review) rather than just quiz generation. <cite index="1-1">Mathematical equations and chemistry notation render perfectly across languages in both the editor and final PDF exports, making the platform suitable for regional-medium schools and multilingual examination boards</cite>
- **Quizbot** generates from a wider range of sources (PDF, PPT, Word, video, audio, web links) and exports to Canvas/Blackboard/Kahoot/Quizlet.

**Where the gap actually is:** none of these are built around a *live, Word/Google-Docs-style editable canvas* with prompt-targeted line/paragraph edits (your keyboard-shortcut-to-edit-a-single-question idea). Most are chat-in/quiz-out or form-based generators, not "generate into a real document you then hand-edit like Word." That's your differentiation — not "AI generates questions from PDF" (that part is commoditized), but "AI generates into a document you actually finish and export like you would in Word, with surgical prompt edits." Keep this framing central or you're building a Quizbot clone.

## 3. Core User Flow

1. **Auth:** Teacher signs up / logs in.
2. **Home dashboard** (left sidebar: Home, Templates, Recent, Settings/Name at bottom-left).
3. **Template selection:** Pick existing template (CBSE format, general paper format, or upload their own Word/PDF as a template reference for formatting).
4. **Context upload:** Upload PDF/Word doc as content context (textbook chapter, notes, syllabus) — optional but primary use case.
5. **Prompt panel (right sidebar):** Teacher types what they want — e.g. "10 MCQs + 2 long-answer questions on thermodynamics, medium difficulty, total 50 marks."
6. **Generation:** Paper is generated into the center canvas, formatted per the selected template.
7. **Editable canvas:** Center behaves like a lightweight Word/Google Doc — direct manual editing supported.
8. **Targeted AI edit:** Select a line/question/paragraph → keyboard shortcut → prompt just that selection ("make this harder," "rephrase," "add a diagram note") without regenerating the whole paper.
9. **Answer key:** Auto-generated alongside the paper, clearly linked to each question, editable independently.
10. **Export:** Download as PDF/Word.

## 4. Information Architecture

**Left sidebar:** Home / Dashboard, Templates, Recent, (bottom) Name + Settings
**Center:** Upload zone → becomes live document canvas post-generation
**Right sidebar:** Prompt/chat panel, contextual to the currently open paper

## 5. Key Feature Decisions

### 5.1 Structured data as source of truth
Store each paper as structured JSON (sections → questions → metadata: marks, difficulty, type, source reference), not as raw formatted text or HTML blob. This is what makes targeted editing, answer-key linkage, marks-tallying, and multi-format export all work off one consistent model instead of three fragile parsers. (Covered in earlier discussion — this remains the central architectural decision.)

### 5.2 Targeted "select + shortcut" editing
Selection maps to a `q_id` in the JSON. Shortcut opens a small inline prompt scoped to just that block. Only that JSON node is sent to the LLM for regeneration, then patched back in — avoids full-paper regeneration and keeps the rest of the teacher's manual edits untouched.

### 5.3 Answer key generation
Generated as a **linked but separate structure** — each answer keyed to the same `q_id` as its question, not embedded inline in the paper. Teacher can edit answers independently of questions. Export can produce either "paper only," "answer key only," or "both."

### 5.4 Memory / context — opt-in, workspace-scoped
Do **not** default to persistent cross-session memory. Context (the uploaded PDF, prior prompts) should stay scoped to the current paper/workspace unless the teacher explicitly opts in to "remember this for future papers" (e.g. reusing a subject's syllabus context across multiple papers in a term). This is the right call — unscoped memory across unrelated papers (different subjects/classes) would just pollute generation with irrelevant context and increase hallucination risk. Make it an explicit toggle, off by default.

### 5.5 Special symbols (Physics/Chemistry)
This is a real, non-trivial requirement — not a footnote:
- **Math:** Use LaTeX rendering (KaTeX or MathJax) inside the TipTap canvas, store as LaTeX strings in your JSON schema (`"type": "equation", "latex": "..."`), and render to Word/PDF export using an equation-compatible export path (`python-docx` has limited native equation support — you may need to render equations as images or use OMML conversion for Word).
- **Chemistry:** Structural formulas/reaction notation are harder — most tools stop at subscripts/superscripts and basic notation (H₂O, CO₂, arrows, Δ) rather than full structural diagrams. Scope your MVP to **text-based chemistry notation** (subscripts, arrows, charges) and treat structural diagrams as a clear non-goal for v1. Don't let this become a scope trap — Eklavvya markets this as solved, but molecular structure rendering is a genuinely hard, separate problem (usually needs something like RDKit + image generation, not text/LaTeX).

## 6. Storage Strategy (bootstrapped, no infra budget)

You flagged not wanting to provision real storage yet. Reasonable path:

- **Paper content:** Store as JSON (source of truth) — a completed paper's JSON is typically a few KB, not the PDF itself. This is naturally cheap; you don't need to store papers "as markdown" to save space, JSON already is small text.
- **Uploaded PDFs (context):** Don't store the raw PDF long-term unless needed for re-generation. Extract text/chunks once, store *only the extracted+chunked text* (or embeddings), discard or time-limit the original file. This is your biggest space saver, not the output format.
- **Free-tier stack for MVP:**
  - **Postgres:** Supabase or Neon (both have usable free tiers, and Supabase bundles auth too — could save you building auth from scratch).
  - **File-ish storage (if you keep raw PDFs at all):** Supabase Storage or Cloudflare R2 free tier.
  - **Vector store:** `pgvector` inside the same Postgres instance — avoids standing up a separate vector DB for MVP scale.
  - **Hosting:** Vercel (frontend) + Railway/Render free tier (FastAPI backend) is a common free-tier-friendly combo.

**Correction on your instinct:** storing papers "as markdown to save space" doesn't actually solve your problem — JSON is comparably small, and markdown loses the structure you need for targeted editing and answer-key linkage. Save space by not hoarding raw PDFs, not by changing the output format.

## 7. Beta / BYOK (Bring Your Own API Key) Strategy

Good instinct for a bootstrapped beta — let teachers paste their own Claude/OpenAI key so you're not fronting inference costs while you validate demand.

- Store the key **client-side only** (browser storage / session), never persisted server-side, or if server-side, encrypted and scoped per-user with clear disclosure.
- Show token/cost estimates before generation so teachers aren't surprised by their own API bill.
- Plan the migration path early: once you *do* want to run generation on your own billing (post-beta), your LLM client should already be abstracted (same interface, swappable key source) — this connects back to the swappable local/prod LLM client we discussed earlier; BYOK is just a third mode of the same abstraction.

## 8. Tech Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Backend | FastAPI (Python) | You know it; best PDF/RAG ecosystem |
| PDF extraction | PyMuPDF | Handles layout/columns better than pypdf |
| Chunking/retrieval | Manual chunk + pgvector | No need for a separate vector DB at MVP scale |
| LLM (dev) | Local via Ollama (OpenAI-compatible endpoint) | Free iteration on plumbing |
| LLM (quality testing/prod) | Claude/GPT via API or BYOK | Structured JSON reliability matters here |
| Frontend | React + TipTap + Tailwind | TipTap is the standard for Google-Docs-style editable canvases |
| Math rendering | KaTeX/MathJax in-editor | LaTeX stored in JSON schema |
| DB | Postgres (Supabase/Neon free tier) | Also gives you auth for free via Supabase |
| Export | python-docx / docxtpl | Template-driven Word export |

## 9. MVP Scope (What Ships First)

**In scope:**
- Auth, dashboard, 1–2 built-in templates (CBSE-style, general)
- PDF upload → chunked context
- Prompt-based full-paper generation (structured JSON)
- Editable canvas with manual formatting
- Targeted selection-based re-prompt editing
- Linked, independently-editable answer key
- LaTeX-based math notation + basic chemistry text notation
- Export to Word/PDF
- BYOK for generation

**Explicitly out of scope for v1:**
- Chemistry structural diagrams / molecule drawing
- Cross-paper persistent memory (beyond opt-in toggle)
- Multi-institution/admin roles, bulk teacher management
- Real-time multi-teacher collaboration on same paper

## 10. Open Risks

- **LLM structured-output reliability** — needs schema validation (Pydantic) + retry logic; local models especially will drift from schema.
- **Equation export fidelity** — Word/LaTeX interop is a known pain point; validate early with a real sample rather than assuming `python-docx` handles it out of the box.
- **Differentiation risk** — the "PDF → AI-generated question paper" part alone is not novel (see Section 2); the editable-canvas + targeted-edit UX is what needs to be genuinely good, or this is a me-too tool.

---

# Part B: Technical Reference (for implementation)

This section exists so you and your collaborator can split work without a design meeting for every module. Treat Part A (above) as "why," this as "what to actually build."

## 11. Repo Structure

```
paper-gen/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── papers.py
│   │   │   ├── generation.py      # prompt -> LLM -> JSON
│   │   │   ├── upload.py          # PDF/docx ingestion
│   │   │   └── export.py          # JSON -> docx/pdf
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas (paper, question, answer)
│   │   ├── services/
│   │   │   ├── llm_client.py       # swappable: local / claude / openai / BYOK
│   │   │   ├── pdf_parser.py       # PyMuPDF extraction + chunking
│   │   │   ├── rag.py              # embedding + retrieval (pgvector)
│   │   │   └── docx_export.py      # docxtpl rendering
│   │   └── db.py
│   ├── requirements.txt
│   └── alembic/                    # migrations
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar/
│   │   │   ├── PromptPanel/
│   │   │   ├── DocumentCanvas/     # TipTap wrapper
│   │   │   └── ExportBar/
│   │   ├── editor/
│   │   │   ├── schema.ts           # TipTap node types mirroring backend JSON
│   │   │   └── extensions/         # equation node, question node, etc.
│   │   ├── api/                    # fetch wrappers matching backend routes
│   │   └── state/                  # current paper JSON, chat history
│   └── package.json
└── docs/
    └── question_paper_generator_prd.md   # this file
```

**Natural split for two people:** one owns `backend/app/services` + `api` (LLM plumbing, PDF parsing, export), the other owns `frontend/src` + the TipTap schema. The contract between you is the JSON schema in Section 12 — agree on it first, then build in parallel against a mocked version of it.

## 12. Core Data Model (the contract)

This is the single most important thing to lock before writing code — both frontend (TipTap rendering) and backend (LLM output, export) key off this shape.

```typescript
// Shared contract — mirror this as a Pydantic model in backend/app/schemas/paper.py
// and a TypeScript type in frontend/src/editor/schema.ts

interface Paper {
  paper_id: string;
  owner_id: string;
  template_id: string;
  metadata: {
    subject: string;
    grade_class: string;
    total_marks: number;
    duration: string;
    instructions?: string;
  };
  sections: Section[];
  created_at: string;
  updated_at: string;
}

interface Section {
  section_id: string;       // "A", "B", "C"
  instructions?: string;    // "Answer any 5 of the following"
  questions: Question[];
}

interface Question {
  q_id: string;              // "A1", "A2" — stable, used for targeted edits
  type: "mcq" | "short" | "long" | "numerical" | "freeform";
  content: ContentBlock[];   // supports mixed text + equation inline
  options?: string[];        // mcq only
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  source_chunk_id?: string;  // traceability to uploaded PDF, for dedup/audit
}

interface ContentBlock {
  type: "text" | "equation" | "chem_notation";
  value: string;             // plain text, or LaTeX string if type === "equation"
}

interface AnswerKey {
  paper_id: string;
  answers: {
    q_id: string;            // matches Question.q_id
    answer: ContentBlock[];
    explanation?: string;
  }[];
}
```

**Rules to enforce on the backend (Pydantic validation), not just trust the LLM:**
- Every `q_id` in `AnswerKey.answers` must exist in the paper's `sections[].questions[]`.
- Reject/retry LLM output that doesn't validate against this schema — don't pass malformed JSON to the frontend.
- `marks` must sum correctly against `metadata.total_marks` if you want to enforce that (flag mismatch to the user rather than silently blocking).

## 13. API Contract (v1)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/signup`, `/auth/login` | Auth (or delegate entirely to Supabase Auth) |
| `GET` | `/templates` | List built-in + user templates |
| `POST` | `/uploads/context` | Upload PDF/docx → returns `document_id`, triggers chunking |
| `GET` | `/uploads/{document_id}/chunks` | Debug/preview extracted chunks |
| `POST` | `/papers` | Create new paper (empty shell, linked to template + context doc) |
| `POST` | `/papers/{paper_id}/generate` | Full generation: `{ prompt, template_id, context_document_id }` → returns `Paper` JSON |
| `PATCH` | `/papers/{paper_id}/questions/{q_id}` | Targeted regeneration: `{ prompt }` → returns updated `Question` only |
| `PUT` | `/papers/{paper_id}` | Save manual edits (full paper JSON, from canvas autosave) |
| `GET` | `/papers/{paper_id}` | Fetch paper JSON |
| `GET` | `/papers/{paper_id}/answer-key` | Fetch linked answer key |
| `PATCH` | `/papers/{paper_id}/answer-key/{q_id}` | Edit single answer |
| `POST` | `/papers/{paper_id}/export` | `{ format: "docx" | "pdf", include: "paper" | "answer_key" | "both" }` → file URL |
| `GET` | `/papers/recent` | Dashboard "Recent" tab |

**Key implementation note on the `PATCH .../questions/{q_id}` route:** this is what powers the keyboard-shortcut targeted edit. Backend should send *only* that question's JSON + a small window of surrounding context (section instructions, subject) to the LLM — not the whole paper — to keep it fast and cheap.

## 14. Database Schema (Postgres)

```sql
-- Minimal MVP schema; expand as needed
users (id, email, name, created_at)
templates (id, name, type, layout_config JSONB, owner_id NULLABLE)  -- NULL owner = built-in
context_documents (id, owner_id, filename, extracted_text TEXT, status, created_at)
context_chunks (id, document_id, chunk_index, content TEXT, embedding VECTOR(1536))
papers (id, owner_id, template_id, context_document_id NULLABLE, data JSONB, created_at, updated_at)
answer_keys (id, paper_id, data JSONB, updated_at)
```

Storing `papers.data` and `answer_keys.data` as `JSONB` (not separate normalized tables per question) is the right call for MVP — you get full document reads/writes cheaply, and Postgres JSONB still lets you query into it later (`data -> 'sections'`) if you need reporting.

## 15. LLM Client Interface (swappable, per earlier discussion)

```python
# backend/app/services/llm_client.py
class LLMClient(Protocol):
    async def generate_paper(self, prompt: str, context_chunks: list[str], template: dict) -> Paper: ...
    async def regenerate_question(self, question: dict, prompt: str, context: str) -> dict: ...

# Concrete implementations: LocalOllamaClient, ClaudeClient, OpenAIClient, BYOKClient
# Selected via env var / user setting, same interface — this is what makes
# local-dev, prod-billing, and BYOK-beta all drop-in swappable without touching callers.
```

## 16. Suggested Task Split (2 devs)

**Dev A — Backend/AI:**
- FastAPI scaffold, auth (or Supabase wiring)
- PDF parsing + chunking (`pdf_parser.py`)
- LLM client + prompt engineering for structured JSON output
- Schema validation + retry logic
- docx/pdf export

**Dev B — Frontend:**
- React shell, sidebar, dashboard
- TipTap canvas wired to the `Paper` JSON schema (Section 12)
- Prompt panel + selection-based shortcut edit UX
- Equation rendering (KaTeX) in-editor

**Shared/first thing to build together:** Section 12's schema, and a fake/mocked `/papers/{id}/generate` response so both sides can build against a stable contract before the real LLM pipeline works.

## 17. Environment Variables (starter list)

```
DATABASE_URL=
SUPABASE_URL= / SUPABASE_KEY=          # if using Supabase for auth+db
LLM_PROVIDER=local|claude|openai|byok
ANTHROPIC_API_KEY=                      # server-side prod key (not used in BYOK mode)
OLLAMA_BASE_URL=http://localhost:11434/v1
STORAGE_BUCKET=                         # for any raw file retention
```
