"""在线用户路由（系统监控，开发技术文档 §7.4）。

- 权限码 online:view。
- 当前系统为 JWT 无状态鉴权，无服务端会话；此处展示「已启用管理员」并按最近登录时间排序，
  作为在线/活跃账号的近似视图（last_login_at 越近越活跃）。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from deps import DbSession, require_perm
from errors import ok
from models import Admin, Role

router = APIRouter(prefix="/api/admin/online", tags=["系统监控-在线用户"])


@router.get("")
def list_online(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("online:view"))],
):
    rows = db.scalars(
        select(Admin).where(Admin.is_activate == 1).order_by(Admin.last_login_at.desc())
    ).all()
    data = [
        {
            "id": a.id,
            "username": a.username,
            "name": a.name,
            "role_name": a.role.name if a.role else None,
            "last_login_at": a.last_login_at.isoformat() if a.last_login_at else None,
            "is_activate": a.is_activate,
        }
        for a in rows
    ]
    return ok({"list": data, "total": len(data)})
