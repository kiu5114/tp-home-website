"""Alembic 环境（数据库设计文档 §7）。

- 复用 backend.database 的 DATABASE_URL（环境变量切换 SQLite/PostgreSQL）。
- 导入全部模型以注册元数据到 Base.metadata。
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from database import Base, DATABASE_URL

# 导入模型，确保元数据完整（数据库设计文档 §4 全部 20 表）
import models  # noqa: F401
from models import (  # noqa: F401
    Admin,
    Department,
    Role,
    ProductSeries,
    SpaceCategory,
    Product,
    Case,
    NewsArticle,
    Job,
    JobApplication,
    Lead,
    Store,
    SiteConfig,
    Banner,
    Highlight,
    AboutPage,
    Milestone,
    NewsCategory,
    Permission,
    OperationLog,
)

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = DATABASE_URL
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
