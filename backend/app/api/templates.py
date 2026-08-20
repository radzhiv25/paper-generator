from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import Template
from app.schemas.paper import TemplateInfo
from app.services.templates import BUILTIN_TEMPLATES

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateInfo])
async def list_templates(db: Session = Depends(get_db)):
    db_templates = db.query(Template).all()
    if db_templates:
        return [
            TemplateInfo(
                id=t.id,
                name=t.name,
                type=t.type,
                layout_config=t.layout_config,
                owner_id=t.owner_id,
            )
            for t in db_templates
        ]
    return [TemplateInfo(**t) for t in BUILTIN_TEMPLATES]
