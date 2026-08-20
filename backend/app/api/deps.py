"""Auth helpers — local JWT for dev; Supabase delegation stubs."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.models import User

security = HTTPBearer(auto_error=False)
settings = get_settings()


def hash_password(password: str) -> str:
    salt = "paper-generator-dev-salt"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def get_or_create_dev_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "dev@localhost").first()
    if user:
        return user
    user = User(
        id=str(uuid.uuid4()),
        email="dev@localhost",
        name="Dev User",
        password_hash=hash_password("devpassword"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        return get_or_create_dev_user(db)

    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def supabase_signup_stub(email: str, password: str, name: str) -> dict:
  """Stub for Supabase Auth delegation — returns local token in dev."""
  return {"message": "Supabase signup stub — use local auth in dev", "email": email, "name": name}


async def supabase_login_stub(email: str, password: str) -> dict:
    return {"message": "Supabase login stub — use local auth in dev", "email": email}
