"""岗位管理路由（系统管理，开发技术文档 §7.4）。

- 使用通用 CRUD 工厂，权限码 post:view / post:edit / post:delete。
- 区别于招聘职位（jobs / job_applications）。
"""
from __future__ import annotations

from fastapi import APIRouter

from crud_utils import make_crud_router
from models import Post

router = make_crud_router(
    Post,
    prefix="/api/admin/posts",
    perm="post",
    tags=["系统管理-岗位"],
    search_fields=("name",),
)
