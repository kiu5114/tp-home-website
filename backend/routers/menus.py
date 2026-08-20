"""菜单管理路由（系统管理，开发技术文档 §7.4）。

- 使用通用 CRUD 工厂，权限码 menu:view / menu:edit / menu:delete。
- 树形结构：parent_id 自引用（顶级为分组）。
"""
from __future__ import annotations

from fastapi import APIRouter

from crud_utils import make_crud_router
from models import Menu

router = make_crud_router(
    Menu,
    prefix="/api/admin/menus",
    perm="menu",
    tags=["系统管理-菜单"],
    search_fields=("name", "path"),
)
