import os

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import auth, export, generation, papers, templates, upload
from app.config import get_settings
from app.db import init_db, seed_builtin_templates
from app.models.models import SessionLocal

settings = get_settings()

app = FastAPI(
    title="AI Question Paper Generator",
    description="Backend API for generating, editing, and exporting exam papers",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(templates.router)
app.include_router(upload.router)
app.include_router(papers.router)
app.include_router(generation.router)
app.include_router(generation.estimate_router)
app.include_router(export.router)


@app.on_event("startup")
def on_startup():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    init_db()
    db = SessionLocal()
    try:
        seed_builtin_templates(db)
    finally:
        db.close()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.ollama_model,
    }


@app.get("/exports/{filename}")
async def download_export(filename: str):
    path = os.path.join(settings.export_dir, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    media = (
        "application/pdf"
        if filename.endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(path, filename=filename, media_type=media)
