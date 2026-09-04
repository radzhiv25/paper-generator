"""Swappable LLM client for paper generation."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

import httpx

from app.config import Settings, get_settings
from app.schemas.paper import AnswerKey, Paper, Question


class LLMClient(Protocol):
    async def generate_paper(
        self,
        prompt: str,
        context_chunks: list[str],
        template: dict,
        paper_id: str,
        owner_id: str,
        template_id: str,
        paper_metadata: dict | None = None,
    ) -> tuple[Paper, AnswerKey]: ...

    async def regenerate_question(
        self,
        question: Question,
        prompt: str,
        context: str,
        subject: str,
        section_instructions: str | None,
    ) -> Question: ...


def _fixtures_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "fixtures"


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    if not text:
        raise ValueError("Empty LLM response")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def load_fixture_paper(paper_id: str, owner_id: str, template_id: str) -> Paper:
    raw = json.loads((_fixtures_dir() / "sample_cbse_paper.json").read_text())
    now = datetime.now(timezone.utc)
    raw["paper_id"] = paper_id
    raw["owner_id"] = owner_id
    raw["template_id"] = template_id
    raw["created_at"] = now.isoformat()
    raw["updated_at"] = now.isoformat()
    return Paper.model_validate(raw)


def load_fixture_answer_key(paper_id: str) -> AnswerKey:
    raw = json.loads((_fixtures_dir() / "sample_cbse_answer_key.json").read_text())
    raw["paper_id"] = paper_id
    return AnswerKey.model_validate(raw)


class MockLLMClient:
    """Returns fixture data for parallel frontend development."""

    async def generate_paper(
        self,
        prompt: str,
        context_chunks: list[str],
        template: dict,
        paper_id: str,
        owner_id: str,
        template_id: str,
        paper_metadata: dict | None = None,
    ) -> tuple[Paper, AnswerKey]:
        paper = load_fixture_paper(paper_id, owner_id, template_id)
        if paper_metadata:
            for key, value in paper_metadata.items():
                if value is not None and hasattr(paper.metadata, key):
                    setattr(paper.metadata, key, value)
        answer_key = load_fixture_answer_key(paper_id)
        answer_key.validate_against_paper(paper)
        return paper, answer_key

    async def regenerate_question(
        self,
        question: Question,
        prompt: str,
        context: str,
        subject: str,
        section_instructions: str | None,
    ) -> Question:
        updated = question.model_copy(deep=True)
        from app.schemas.paper import ContentBlock

        updated.content = [
            *updated.content,
            ContentBlock(type="text", value=f" [AI edit: {prompt[:80]}]"),
        ]
        if "harder" in prompt.lower() and updated.difficulty == "medium":
            updated.difficulty = "hard"
        elif "easier" in prompt.lower() and updated.difficulty == "hard":
            updated.difficulty = "medium"
        return updated


class LocalOllamaClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    @property
    def _is_ollama(self) -> bool:
        return "localhost" in self.base_url or "127.0.0.1" in self.base_url

    @property
    def _supports_json_mode(self) -> bool:
        """Only OpenAI-native models reliably support response_format json_object."""
        model = self.model or ""
        return model.startswith("openai/") or (self._is_ollama and not model.startswith("anthropic/"))

    async def _chat(self, messages: list[dict], api_key: str | None = None) -> str:
        import logging
        logger = logging.getLogger(__name__)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        # OpenRouter recommends these headers for identification
        if not self._is_ollama:
            headers["HTTP-Referer"] = "https://papercue.app"
            headers["X-Title"] = "PaperCue"
        payload: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
        }
        # json_object mode only for models that support it — Claude/Gemini don't
        if self._supports_json_mode:
            payload["response_format"] = {"type": "json_object"}
        # num_predict is Ollama-specific
        if self._is_ollama:
            payload["options"] = {"num_predict": 8192}
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if not response.is_success:
                logger.error(
                    "LLM request failed %s | model=%s | body=%s",
                    response.status_code,
                    self.model,
                    response.text[:500],
                )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    def _paper_schema_hint(self) -> str:
        return """
OUTPUT FORMAT: Return a single JSON object with exactly two keys: "paper" and "answer_key". No markdown fences, no extra text.

PAPER SCHEMA:
{
  "metadata": {"subject": str, "grade_class": str, "total_marks": int, "duration": str, "instructions": str},
  "sections": [{
    "section_id": str,
    "instructions": str,
    "questions": [{
      "q_id": str,
      "type": "mcq"|"short"|"long"|"numerical"|"freeform",
      "content": [ContentBlock],
      "options": [str],
      "marks": int,
      "difficulty": "easy"|"medium"|"hard",
      "sub_questions": [{"sq_id": str, "content": [ContentBlock], "marks": int}]
    }]
  }]
}

ContentBlock: {"type": "text"|"equation"|"chem_notation", "value": str}

ANSWER KEY SCHEMA:
{"answers": [{"q_id": str, "answer": [ContentBlock], "explanation": str}]}
For sub-questions use q_id like "1a", "1b", "2a" etc.

CONTENT BLOCK RULES:
- "text": plain prose, question stem, option text
- "equation": valid LaTeX without delimiters — e.g. "\\frac{d}{dx}(x^n) = nx^{n-1}", "\\vec{F} = m\\vec{a}", "\\int_0^\\infty e^{-x}dx"
  Physics: \\alpha \\beta \\gamma \\Delta \\theta \\lambda \\mu \\nu \\pi \\rho \\sigma \\omega \\Omega \\vec{v} \\hat{n}
  Units: "5 \\text{ ms}^{-1}", "9.8 \\text{ m/s}^2"
- "chem_notation": chemical formulas/equations — e.g. "H_2SO_4", "CaCO_3 \\rightarrow CaO + CO_2"
  Use \\rightarrow for reactions, \\rightleftharpoons for equilibrium, \\uparrow gas, \\downarrow precipitate
"""

    async def generate_paper(
        self,
        prompt: str,
        context_chunks: list[str],
        template: dict,
        paper_id: str,
        owner_id: str,
        template_id: str,
        paper_metadata: dict | None = None,
        api_key: str | None = None,
    ) -> tuple[Paper, AnswerKey]:
        context = "\n\n---\n\n".join(context_chunks[:8]) if context_chunks else "No uploaded context."
        system = """You are an expert CBSE exam paper generator for Indian school teachers (Classes 9–12).

CBSE PAPER STRUCTURE:
- Section A: MCQ / Very Short Answer — 1 mark each. MCQs must have exactly 4 options.
- Section B: Short Answer I — 2 marks each. Direct concept questions.
- Section C: Short Answer II — 3 marks each. Explanation or derivation.
- Section D: Long Answer — 5 marks each. Use sub_questions (a)(b)(c) that sum to 5.
- Section E: Case-based / Source-based — 4–5 marks. Provide a passage in main content, then sub_questions (a)(b)(c).
- Follow NCERT syllabus strictly. Use standard CBSE question language.
- Internal choice (OR) in Sections D and E: add a second question of same marks with "OR" as first text block.
- sub_questions marks must sum to parent question marks.

QUALITY:
- Factually accurate, NCERT-aligned, no repeated concepts.
- Difficulty: ~30% easy, ~50% medium, ~20% hard.
- Numerical questions: state given data, identify formula, solve step by step in answer key.
- All mathematical expressions MUST use equation content blocks with proper LaTeX.
- All chemical formulas/equations MUST use chem_notation content blocks.

""" + self._paper_schema_hint()
        metadata_hint = ""
        if paper_metadata:
            metadata_hint = (
                "Required paper metadata (use these exact values in paper.metadata): "
                f"{json.dumps(paper_metadata)}\n"
            )
        user = (
            f"CBSE Template: {json.dumps(template)}\n"
            f"{metadata_hint}"
            f"Syllabus/Context:\n{context}\n\n"
            f"Teacher requirement: {prompt}\n\n"
            "Generate a complete high-quality CBSE paper with answer key. "
            "Use equation blocks for all math/physics symbols and chem_notation for all chemistry."
        )
        raw = await self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            api_key=api_key,
        )
        data = _extract_json(raw)
        now = datetime.now(timezone.utc)
        paper_data = data.get("paper", data)
        paper_data["paper_id"] = paper_id
        paper_data["owner_id"] = owner_id
        paper_data["template_id"] = template_id
        paper_data["created_at"] = now.isoformat()
        paper_data["updated_at"] = now.isoformat()
        paper = Paper.model_validate(paper_data)
        ak_data = data.get("answer_key", {"answers": []})
        ak_data["paper_id"] = paper_id
        answer_key = AnswerKey.model_validate(ak_data)
        answer_key.validate_against_paper(paper)
        return paper, answer_key

    async def regenerate_question(
        self,
        question: Question,
        prompt: str,
        context: str,
        subject: str,
        section_instructions: str | None,
        api_key: str | None = None,
    ) -> Question:
        system = (
            "You regenerate a single exam question. Output JSON: "
            '{"question": <Question object with same q_id>}'
        )
        user = json.dumps(
            {
                "subject": subject,
                "section_instructions": section_instructions,
                "context": context,
                "current_question": question.model_dump(),
                "edit_instruction": prompt,
            }
        )
        raw = await self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            api_key=api_key,
        )
        data = _extract_json(raw)
        q_data = data.get("question", data)
        q_data["q_id"] = question.q_id
        return Question.model_validate(q_data)


class BYOKClient(LocalOllamaClient):
    """Uses caller-provided API key against OpenAI-compatible endpoint."""

    BYOK_DEFAULT_MODEL = "openai/gpt-4o-mini"

    def __init__(self, settings: Settings, base_url: str | None = None, model: str | None = None):
        super().__init__(settings)
        if base_url:
            self.base_url = base_url.rstrip("/")
        # Always override model for BYOK — never fall back to the Ollama model name
        self.model = model or self.BYOK_DEFAULT_MODEL


class ClaudeClient(LocalOllamaClient):
    def __init__(self, settings: Settings):
        super().__init__(settings)
        self.base_url = "https://api.anthropic.com/v1"
        self.model = "claude-sonnet-4-20250514"


async def check_ollama_available(settings: Settings) -> bool:
    try:
        base = settings.ollama_base_url.rstrip("/")
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(base.replace("/v1", "") + "/api/tags")
            return response.status_code == 200
    except httpx.HTTPError:
        return False


def get_llm_client(
    settings: Settings | None = None,
    force_mock: bool = False,
    byok_api_key: str | None = None,
    byok_base_url: str | None = None,
    byok_model: str | None = None,
) -> LLMClient:
    settings = settings or get_settings()
    if force_mock or settings.use_mock_llm or settings.llm_provider == "mock":
        return MockLLMClient()
    if settings.llm_provider == "byok" and byok_api_key:
        return BYOKClient(settings, base_url=byok_base_url or "https://api.openai.com/v1", model=byok_model or None)
    if settings.llm_provider == "claude" and settings.anthropic_api_key:
        return ClaudeClient(settings)
    return LocalOllamaClient(settings)


async def generate_with_retry(
    client: LLMClient,
    *,
    max_retries: int = 2,
    force_mock_on_failure: bool = False,
    api_key: str | None = None,
    **kwargs: Any,
) -> tuple[Paper, AnswerKey, str]:
    settings = get_settings()
    provider = settings.llm_provider
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            if isinstance(client, LocalOllamaClient) and api_key:
                paper, answer_key = await client.generate_paper(**kwargs, api_key=api_key)
            else:
                paper, answer_key = await client.generate_paper(**kwargs)
            return paper, answer_key, provider
        except Exception as exc:
            last_error = exc
            if attempt == max_retries - 1:
                break

    if force_mock_on_failure:
        mock = MockLLMClient()
        paper, answer_key = await mock.generate_paper(**kwargs)
        return paper, answer_key, "mock_fallback"

    raise RuntimeError(f"LLM generation failed after {max_retries} attempts: {last_error}") from last_error


async def regenerate_with_retry(
    client: LLMClient,
    *,
    max_retries: int = 3,
    force_mock_on_failure: bool = False,
    api_key: str | None = None,
    **kwargs: Any,
) -> Question:
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            if isinstance(client, LocalOllamaClient) and api_key:
                return await client.regenerate_question(**kwargs, api_key=api_key)
            return await client.regenerate_question(**kwargs)
        except Exception as exc:
            last_error = exc
            if attempt == max_retries - 1:
                break

    if force_mock_on_failure:
        mock = MockLLMClient()
        return await mock.regenerate_question(**kwargs)

    raise RuntimeError(f"Question regeneration failed: {last_error}")
