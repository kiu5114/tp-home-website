"""安全层：bcrypt 密码哈希 + JWT 双 token（依据开发技术文档 §8.1、§2.3；PRD §8.2）。

- 密码：passlib[bcrypt]
- 双 token：access（短时效，默认 30min）+ refresh（长时效，默认 7d）
- 密钥从环境变量 JWT_SECRET 读取（生产必须替换）
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

# bcrypt 上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置（从环境变量读取，缺失时给开发默认值）
JWT_SECRET = os.getenv("JWT_SECRET", "tp_dev_secret_change_me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: int | str) -> str:
    """生成 access token（短时效）。"""
    expire = _now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {"sub": str(subject), "type": "access", "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(subject: int | str) -> str:
    """生成 refresh token（长时效）。"""
    expire = _now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload: dict[str, Any] = {"sub": str(subject), "type": "refresh", "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """解码并校验 token，失败抛出 JWTError。"""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def is_access_token(token: str) -> bool:
    try:
        payload = decode_token(token)
        return payload.get("type") == "access"
    except JWTError:
        return False


def is_refresh_token(token: str) -> bool:
    try:
        payload = decode_token(token)
        return payload.get("type") == "refresh"
    except JWTError:
        return False
