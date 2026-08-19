"""部门管理路由（系统管理，开发技术文档 §7.4）。

- 使用通用 CRUD 工厂，权限码 department:view / department:edit / department:delete。
- 支持 parent_id 自引用树形结构。
"""
from __future__ import annotations

from fastapi import APIRouter

from crud_utils import make_crud_router
from models import Department

router = make_crud_router(
    Department,
    prefix="/api/admin/departments",
    perm="department",
    tags=["系统管理-部门"],
    search_fields=("name",),
)
