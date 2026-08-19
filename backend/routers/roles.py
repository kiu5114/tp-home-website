"""角色管理路由（RBAC，开发技术文档 §8）。

- 权限码 role:view / role:edit / role:delete。
- permissions 以权限编码列表存储（JSON）。
- 删除为软删除；超级管理员角色（id=1）不可删除/禁用。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from models import Admin, Role
from schemas import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/api/admin/roles", tags=["系统管理-角色"])


@router.get("")
def list_roles(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("role:view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    show_disabled: int = Query(0),
):
    wheres = [Role.is_activate == (0 if show_disabled else 1)]
    total = db.scalar(select(func.count()).select_from(Role).where(*wheres)) or 0
    rows = (
        db.scalars(
            select(Role).where(*wheres).order_by(Role.id).offset((page - 1) * page_size).limit(page_size)
        ).all()
    )
    return ok(
        {
            "list": [RoleOut.model_validate(r) for r in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{item_id}")
def get_role(item_id: int, db: DbSession, _: Annotated[Admin, Depends(require_perm("role:view"))]):
    row = db.get(Role, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("角色不存在")
    return ok(RoleOut.model_validate(row))


@router.post("")
def create_role(
    payload: RoleCreate,
    admin: Annotated[Admin, Depends(require_perm("role:edit"))],
    db: DbSession = None,
):
    row = Role(
        name=payload.name,
        permissions=payload.permissions,
        description=payload.description,
        created_at=admin.id,
        updated_at=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "role:create", target=row.name)
    return ok(RoleOut.model_validate(row))


@router.put("/{item_id}")
def update_role(
    item_id: int,
    payload: RoleUpdate,
    admin: Annotated[Admin, Depends(require_perm("role:edit"))],
    db: DbSession = None,
):
    if item_id == 1:
        raise BizError("超级管理员角色不可修改")
    row = db.get(Role, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("角色不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    row.updated_at = admin.id
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "role:update", target=row.name)
    return ok(RoleOut.model_validate(row))


@router.delete("/{item_id}")
def delete_role(
    item_id: int,
    admin: Annotated[Admin, Depends(require_perm("role:delete"))],
    db: DbSession = None,
):
    if item_id == 1:
        raise BizError("超级管理员角色不可删除")
    if db.query(Admin).filter(Admin.role_id == item_id, Admin.is_activate == 1).first():
        raise BizError("该角色下仍有管理员，无法删除")
    row = db.get(Role, item_id)
    if row is None:
        raise BizError("角色不存在")
    row.is_activate = 0
    row.updated_at = admin.id
    db.commit()
    record_log(db, admin.id, "role:delete", target=row.name)
    return ok({"id": item_id})
