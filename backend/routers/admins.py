"""管理员管理路由（后台资源，开发技术文档 §7.4）。

- 列表/详情/新增/修改/删除，权限码 admin:view / admin:edit / admin:delete。
- 密码以 bcrypt 哈希存储；新增/修改密码走 security.hash_password。
- 删除为软删除（is_activate=0）；禁止删除当前登录账号。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from models import Admin
from routers.auth import _admin_out
from schemas import AdminCreate, AdminOut, AdminUpdate
from security import hash_password

router = APIRouter(prefix="/api/admin/admins", tags=["系统管理-管理员"])


@router.get("")
def list_admins(
    db: DbSession,
    admin: Annotated[Admin, Depends(require_perm("admin:view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = None,
    show_disabled: int = Query(0),
):
    wheres = [Admin.is_activate == (0 if show_disabled else 1)]
    if search:
        wheres.append(or_(Admin.username.like(f"%{search}%"), Admin.name.like(f"%{search}%")))
    total = db.scalar(select(func.count()).select_from(Admin).where(*wheres)) or 0
    rows = (
        db.scalars(
            select(Admin)
            .where(*wheres)
            .order_by(Admin.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return ok(
        {
            "list": [_admin_out(r) for r in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{item_id}")
def get_admin(item_id: int, db: DbSession, _: Annotated[Admin, Depends(require_perm("admin:view"))]):
    row = db.get(Admin, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("管理员不存在")
    return ok(_admin_out(row))


@router.post("")
def create_admin(
    payload: AdminCreate,
    admin: Annotated[Admin, Depends(require_perm("admin:edit"))],
    db: DbSession = None,
):
    if db.query(Admin).filter(Admin.username == payload.username).first():
        raise BizError("用户名已存在")
    row = Admin(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        nickname=payload.nickname,
        phone=payload.phone,
        email=payload.email,
        gender=payload.gender,
        position=payload.position,
        dept_id=payload.dept_id,
        role_id=payload.role_id,
        created_at=admin.id,
        updated_at=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "admin:create", target=row.username)
    return ok(_admin_out(row))


@router.put("/{item_id}")
def update_admin(
    item_id: int,
    payload: AdminUpdate,
    admin: Annotated[Admin, Depends(require_perm("admin:edit"))],
    db: DbSession = None,
):
    row = db.get(Admin, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("管理员不存在")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        row.password_hash = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(row, k, v)
    row.updated_at = admin.id
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "admin:update", target=row.username)
    return ok(_admin_out(row))


@router.delete("/{item_id}")
def delete_admin(
    item_id: int,
    admin: Annotated[Admin, Depends(require_perm("admin:delete"))],
    db: DbSession = None,
):
    if item_id == admin.id:
        raise BizError("不能删除当前登录账号")
    row = db.get(Admin, item_id)
    if row is None:
        raise BizError("管理员不存在")
    row.is_activate = 0
    row.updated_at = admin.id
    db.commit()
    record_log(db, admin.id, "admin:delete", target=row.username)
    return ok({"id": item_id})
