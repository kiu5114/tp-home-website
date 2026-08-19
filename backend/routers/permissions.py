"""权限字典路由（只读，开发技术文档 §7.4、§8.3）。

- 权限项字典由 seed 预置；此处仅提供查询（permission:view）。
- 用于后台角色编辑时展示全部可选权限编码。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from deps import DbSession, require_perm
from errors import ok
from models import Admin, Permission
from schemas import PermissionOut

router = APIRouter(prefix="/api/admin/permissions", tags=["系统管理-权限字典"])


@router.get("")
def list_permissions(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("permission:view"))],
    group: str | None = None,
):
    q = select(Permission).where(Permission.is_activate == 1)
    if group:
        q = q.where(Permission.group_ == group)
    q = q.order_by(Permission.id)
    rows = db.scalars(q).all()
    return ok([PermissionOut.model_validate(r).model_dump() for r in rows])


@router.get("/groups")
def permission_groups(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("permission:view"))],
):
    rows = db.scalars(select(Permission.group_).distinct().where(Permission.is_activate == 1)).all()
    return ok(list(rows))
