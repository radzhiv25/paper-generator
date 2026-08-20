"""Embedding and retrieval for context chunks."""

from __future__ import annotations

import hashlib
import math
import re
from typing import Sequence

import httpx

from app.config import Settings


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9]+", text.lower())


def _hash_embedding(text: str, dims: int = 1536) -> list[float]:
    """Deterministic local embedding when no model is available."""
    vec = [0.0] * dims
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for token in tokens:
        h = int(hashlib.sha256(token.encode()).hexdigest(), 16)
        idx = h % dims
        sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


async def embed_text(text: str, settings: Settings, api_key: str | None = None) -> list[float]:
    if settings.llm_provider in ("openai", "byok") and (api_key or settings.openai_api_key):
        return await _openai_embed(text, settings, api_key or settings.openai_api_key)
    return await _ollama_embed_or_fallback(text, settings)


async def _ollama_embed_or_fallback(text: str, settings: Settings) -> list[float]:
    url = settings.ollama_base_url.rstrip("/")
    if url.endswith("/v1"):
        url = url[:-3]
    embed_url = f"{url}/api/embeddings"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                embed_url,
                json={"model": settings.embedding_model, "prompt": text},
            )
            if response.status_code == 200:
                data = response.json()
                embedding = data.get("embedding")
                if embedding:
                    return embedding
    except (httpx.HTTPError, KeyError):
        pass
    return _hash_embedding(text)


async def _openai_embed(text: str, settings: Settings, api_key: str) -> list[float]:
    base = settings.ollama_base_url if settings.llm_provider == "byok" else "https://api.openai.com/v1"
    if not base.endswith("/v1"):
        base = f"{base.rstrip('/')}/v1"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{base}/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": "text-embedding-3-small", "input": text},
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def retrieve_top_chunks(
    query_embedding: list[float],
    chunks: list[tuple[str, list[float] | None, str]],
    top_k: int = 5,
) -> list[str]:
    scored: list[tuple[float, str]] = []
    for chunk_id, embedding, content in chunks:
        if embedding:
            score = cosine_similarity(query_embedding, embedding)
        else:
            score = 0.0
        scored.append((score, content))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [content for _, content in scored[:top_k]]
