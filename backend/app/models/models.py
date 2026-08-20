import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from app.config import get_settings

settings = get_settings()
is_sqlite = settings.database_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    papers = relationship("PaperRecord", back_populates="owner")
    context_documents = relationship("ContextDocument", back_populates="owner")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    layout_config = Column(JSON, nullable=False, default=dict)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)


class ContextDocument(Base):
    __tablename__ = "context_documents"

    id = Column(String, primary_key=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="context_documents")
    chunks = relationship("ContextChunk", back_populates="document", cascade="all, delete-orphan")


class ContextChunk(Base):
    __tablename__ = "context_chunks"

    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("context_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # Stored as JSON array for SQLite; pgvector can be added in production migrations
    embedding = Column(JSON, nullable=True)

    document = relationship("ContextDocument", back_populates="chunks")


class PaperRecord(Base):
    __tablename__ = "papers"

    id = Column(String, primary_key=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    template_id = Column(String, ForeignKey("templates.id"), nullable=False)
    context_document_id = Column(String, ForeignKey("context_documents.id"), nullable=True)
    data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", back_populates="papers")
    answer_key = relationship("AnswerKeyRecord", back_populates="paper", uselist=False, cascade="all, delete-orphan")


class AnswerKeyRecord(Base):
    __tablename__ = "answer_keys"

    id = Column(String, primary_key=True)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False, unique=True)
    data = Column(JSON, nullable=False, default=dict)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    paper = relationship("PaperRecord", back_populates="answer_key")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def seed_builtin_templates(db: Session) -> None:
    from app.services.templates import BUILTIN_TEMPLATES

    for template in BUILTIN_TEMPLATES:
        existing = db.get(Template, template["id"])
        if existing is None:
            db.add(
                Template(
                    id=template["id"],
                    name=template["name"],
                    type=template["type"],
                    layout_config=template["layout_config"],
                    owner_id=None,
                )
            )
    db.commit()


if is_sqlite:

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
