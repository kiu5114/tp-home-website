"""操作日志路由（只读，开发技术文档 §7.4、§8）。

- GET 列表（权限码 log:view）。按创建时间倒序分页。
- 返回操作人姓名（优先 name，其次 username），并将时间统一转换为东八区展示。
"""
from __future__ import annotations

from datetime import timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from deps import DbSession, require_perm
from errors import ok
from models import Admin, OperationLog

router = APIRouter(prefix="/api/admin/operation-logs", tags=["系统管理-操作日志"])

SHANGHAI = ZoneInfo("Asia/Shanghai")


def _fmt_shanghai(dt):
    """将日志时间统一格式化为东八区字符串（兼容 SQLite 无 tz 的 UTC 时间）。"""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(SHANGHAI).strftime("%Y-%m-%d %H:%M:%S")


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
    rows = db.execute(
        select(OperationLog, Admin)
        .join(Admin, Admin.id == OperationLog.created_at, isouter=True)
        .where(*wheres)
        .order_by(OperationLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    def _item(log: OperationLog, admin: Admin | None):
        operator_name = None
        if admin is not None:
            operator_name = admin.name or admin.username
        if not operator_name and log.created_at:
            operator_name = f"管理员 #{log.created_at}"
        return {
            "id": log.id,
            "created_at": log.created_at,
            "action": log.action,
            "target": log.target,
            "ip": log.ip,
            "created_date": _fmt_shanghai(log.created_date),
            "operator_name": operator_name or "—",
        }

    return ok(
        {
            "list": [_item(log, admin) for log, admin in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )
