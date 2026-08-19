"""数据库引擎与会话（依据开发技术文档 §5.1 / 数据库设计文档 §2、§7）。

- DATABASE_URL 通过环境变量读取（dev: sqlite:///./tp_home.db / prod: postgresql://...），不硬编码。
- 开发用 SQLite，生产切 PostgreSQL（双形态映射见数据库设计文档 §2.2）。
"""
from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# 环境切换：开发 SQLite，生产 PostgreSQL（数据库设计文档 §7.3）
DEFAULT_SQLITE = "sqlite:///./tp_home.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE)

# SQLite 需要 check_same_thread=False 以支持 FastAPI 多线程
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


class Base(DeclarativeBase):
    """所有模型的声明基类。"""
