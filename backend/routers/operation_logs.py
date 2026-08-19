"""操作日志路由（只读，开发技术文档 §7.4、§8）。

- GET 列表（权限码 log:view）。按创建时间倒序分页。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from deps import DbSession, require_perm
from errors import ok
from models import Admin, OperationLog
from schemas import build_schemas

router = APIRouter(prefix="/api/admin/operation-logs", tags=["系统管理-操作日志"])

OpLogOut = build_schemas(OperationLog)[0]


@router.get("")
def list_logs(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("log:view"))],
    action: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    wheres = [OperationLog.is_activate == 1]
    if action:
        wheres.append(OperationLog.action == action)
    total = db.scalar(select(func.count()).select_from(OperationLog).where(*wheres)) or 0
    rows = (
        db.scalars(
            select(OperationLog).where(*wheres).order_by(OperationLog.id.desc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
    )
    return ok(
        {
            "list": [OpLogOut.model_validate(r) for r in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )
