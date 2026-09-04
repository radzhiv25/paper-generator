# SKILLS.md — Claude Code Skills & Agent Workflows for PaperCue

Reference guide for AI agents and developers working in this repo using Claude Code.

---

## Available slash commands

These are Claude Code built-in skills that apply to this project. Invoke them with the `/` prefix in the Claude Code REPL.

| Command | What it does in this repo |
|---|---|
| `/commit` | Stages and commits with a conventional commit message (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Always include a scope: `feat(editor):`, `fix(llm):`, `chore(deps):`. |
| `/review-pr` | Reviews an open pull request. Useful before merging schema changes — ask it to check that both `schemas/paper.py` and `editor/schema.ts` were updated together. |
| `/simplify` | Reviews changed code for quality, redundancy, and reuse. Run after implementing a new TipTap extension or LLM client subclass to catch unnecessary duplication. |

---

## Recommended agent workflows

### Explore → Plan → Implement → Test

This is the standard workflow for any non-trivial change:

1. **Explore** — Use the Explore subagent (or direct tool calls) to read all files relevant to the change before writing anything. For schema changes, always read both `schemas/paper.py` and `editor/schema.ts`. For TipTap extension changes, read the extension file, the corresponding NodeView, and `paperToTipTap.ts` / `tipTapToPaper.ts` together before touching any of them.

2. **Plan** — Write out the change as a step-by-step plan in natural language before starting. For backend+frontend changes that cross the data contract, enumerate every file that needs to change. Identify which SDE standards apply (see AGENT.md).

3. **Implement** — Make changes in dependency order: schemas first, then services, then routes, then frontend types, then editor converters, then components. Never partially implement a schema change.

4. **Test** — Start with the mock LLM (`USE_MOCK_LLM=true`) to validate the data flow, then switch to BYOK/Ollama for a live generation test. Run type checks and linting before committing.

### Subagent roles

- **Explore agent** — Use for broad codebase searches: finding all usages of a type, locating where a header is read, understanding the full call chain for a route. Run it before planning any change that touches multiple files.

- **Plan agent** — Use for architectural decisions: adding a new LLM provider, redesigning the export pipeline, restructuring the editor extension set. Ask it to produce a phased plan with explicit file-level changes before any code is written.

- **General-purpose agent** — Use for multi-step implementation tasks: implement a full feature end-to-end, write tests for a service, refactor a module. Provide it with the output of the Explore and Plan agents as context.

---

## Key developer commands

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit LLM_PROVIDER, etc.

# Start dev server
uvicorn app.main:app --reload --port 8000

# Run with mock LLM (no Ollama or API key needed)
USE_MOCK_LLM=true uvicorn app.main:app --reload --port 8000

# Run database migrations
alembic upgrade head

# Run tests (once written)
pytest backend/tests/
```

API docs (Swagger UI): http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env               # set VITE_API_BASE_URL if needed

# Start dev server
npm run dev                        # http://localhost:5173

# Type check
npm run typecheck                  # or: npx tsc --noEmit

# Lint
npm run lint                       # ESLint

# Build for production
npm run build
```

### Run both together

```bash
# Terminal 1
USE_MOCK_LLM=true uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173. The frontend calls `http://localhost:8000` by default.

---

## Tips for working with TipTap extensions

TipTap extensions in this repo are interconnected. Before editing any of them, always read these three files together:

1. **The extension** (`editor/extensions/*.ts`) — defines the Node schema: node type name, attributes, parseHTML rules, renderHTML output.
2. **The NodeView** (`components/DocumentCanvas/QuestionNodeView.tsx`) — the React component that renders the node. The NodeView reads node attributes and renders content blocks, KaTeX, sub-questions, MCQ options.
3. **The converters** (`editor/paperToTipTap.ts`, `editor/tipTapToPaper.ts`) — translate between Paper JSON and TipTap JSON. These must agree with the extension's attribute names.

Checklist for adding a new node attribute:
- [ ] Add to extension `addAttributes()` in the `.ts` extension file
- [ ] Update `paperToTipTap.ts` to populate the new attribute when converting
- [ ] Update `tipTapToPaper.ts` to read the new attribute back out
- [ ] Update `QuestionNodeView.tsx` if the attribute affects rendering
- [ ] Update the TypeScript interface in `editor/schema.ts`
- [ ] Update the Pydantic model in `backend/app/schemas/paper.py`
- [ ] Update fixture JSON files if they need to be valid against the new schema

**KaTeX rendering:** `QuestionNodeView.tsx` renders both `equation` and `chem_notation` content blocks using KaTeX. MCQ options are also rendered through KaTeX if they contain formula characters (`\`, `^`, `_`, `$`). When adding new content block types, add a corresponding render branch in `QuestionNodeView.tsx`.

**EquationNode:** Inline equations in the TipTap body (not in the Paper JSON `content` array) use the `Equation` TipTap extension with KaTeX rendering. These are stored in `body_doc` on the Question and round-trip through `paperToTipTap.ts` / `tipTapToPaper.ts`.

---

## Tips for LLM prompt changes

The CBSE system prompt lives in `backend/app/services/llm_client.py` in two places:

- `LocalOllamaClient._paper_schema_hint()` — the JSON schema description sent with every request
- `LocalOllamaClient.generate_paper()` — the CBSE-specific system prompt with section structure, quality rules, and content block rules

**Workflow for changing the system prompt:**

1. Make the change in `llm_client.py`.
2. Test with mock first: `USE_MOCK_LLM=true` — confirm the route still returns a valid Paper (mock ignores the prompt, so this validates plumbing).
3. Test with local Ollama: `LLM_PROVIDER=local OLLAMA_MODEL=llama3.2` — use the `/docs` Swagger UI to POST a generation request and inspect the raw JSON in the backend logs.
4. Test with BYOK: use SettingsPanel to set an OpenRouter key and `openai/gpt-4o-mini`, then generate from the UI. Inspect the network tab to verify the structured output passes Pydantic validation without retries.
5. For the answer key schema hint, edit the `_paper_schema_hint()` return value. The sub-question `q_id` format (`"1a"`, `"2b"`) is documented there — keep it consistent with `Paper.all_question_ids()` on the backend.

**Do not change `_supports_json_mode` or `_is_ollama` logic** without testing against Claude (via BYOK), Gemini Flash (via OpenRouter), and local Ollama, as each has different compatibility requirements.

**Retry behavior:** `generate_with_retry` retries up to `max_retries` (default 2) times on any exception. If the LLM consistently produces invalid JSON, the schema hint in `_paper_schema_hint()` should be made more explicit before increasing retries.
