"""登录日志路由（系统监控，开发技术文档 §7.4）。

- 只读列表（权限码 loginlog:view），由 auth 登录/登出自动写入（LoginLog）。
- 按登录时间倒序分页，可按用户名模糊筛选。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from crud_utils import paginate
from deps import DbSession, require_perm
from errors import ok
from models import Admin, LoginLog
from schemas import build_schemas

LoginLogOut, _, _ = build_schemas(LoginLog)

router = APIRouter(prefix="/api/admin/login-logs", tags=["系统监控-登录日志"])


@router.get("")
def list_login_logs(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("loginlog:view"))],
    username: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    extra = []
    if username:
        extra.append(LoginLog.username.like(f"%{username}%"))
    return ok(
        paginate(
            db=db,
            Model=LoginLog,
            Out=LoginLogOut,
            page=page,
            page_size=page_size,
            extra_wheres=extra,
            order_by=LoginLog.login_time.desc(),
        )
    )
