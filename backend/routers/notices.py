"""通知公告路由（系统管理，开发技术文档 §7.4）。

- 使用通用 CRUD 工厂，权限码 notice:view / notice:edit / notice:delete。
"""
from __future__ import annotations

from fastapi import APIRouter

from crud_utils import make_crud_router
from models import Notice

router = make_crud_router(
    Notice,
    prefix="/api/admin/notices",
    perm="notice",
    tags=["系统管理-通知公告"],
    search_fields=("title",),
)
