"""菜单管理路由（系统管理，开发技术文档 §7.4）。

- 通用 CRUD：menu:view / menu:edit / menu:delete（列表/详情/新增/修改/删除）。
- GET /tree：返回启用菜单的完整树（含 children），供前端侧栏动态渲染（仅需登录即可）。
- 树形结构：parent_id 自引用（顶级为分组，path 为空；叶子 path 为路由或 http 外链）。

注意：tree_router 必须在 main.py 中先于 router（CRUD）注册，
否则 /tree 会被 CRUD 的 /{item_id} 捕获导致 422。
"""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from crud_utils import make_crud_router
from deps import CurrentAdmin, DbSession
from errors import ok
from models import Menu

# 树接口：登录即可访问（前端再按用户权限过滤显示）
tree_router = APIRouter(prefix="/api/admin/menus", tags=["系统管理-菜单"])


@tree_router.get("/tree")
def menu_tree(admin: CurrentAdmin, db: DbSession):
    """返回启用菜单的完整树（供侧栏动态渲染；前端再按当前用户权限过滤）。"""
    rows = db.scalars(
        select(Menu)
        .where(Menu.is_activate == 1, Menu.status == 1)
        .order_by(Menu.sort_order.asc(), Menu.id.asc())
    ).all()
    nodes: dict[int, dict] = {}
    for m in rows:
        nodes[m.id] = {
            "id": m.id,
            "name": m.name,
            "path": m.path,
            "icon": m.icon,
            "parent_id": m.parent_id,
            "sort_order": m.sort_order,
            "perm": m.perm,
            "status": m.status,
            "children": [],
        }
    roots: list[dict] = []
    for n in nodes.values():
        if n["parent_id"] and n["parent_id"] in nodes:
            nodes[n["parent_id"]]["children"].append(n)
        else:
            roots.append(n)
    return ok({"list": roots})


# 通用 CRUD（列表/详情/新增/修改/删除）
router = make_crud_router(
    Menu,
    prefix="/api/admin/menus",
    perm="menu",
    tags=["系统管理-菜单"],
    search_fields=("name", "path"),
)
