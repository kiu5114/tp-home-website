"""投递管理路由（后台，开发技术文档 §7.4）。

- 查看/状态流转（权限码 job_application:view / job_application:update）。
- 状态：未处理/已查看/已联系/不合适/已录用。
"""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from models import Admin, JobApplication
from schemas import build_schemas

router = APIRouter(prefix="/api/admin/job-applications", tags=["业务-投递管理"])


@router.get("")
def list_apps(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("job_application:view"))],
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    Out = build_schemas(JobApplication)[0]
    wheres = [JobApplication.is_activate == 1]
    if status:
        wheres.append(JobApplication.status == status)
    if keyword:
        wheres.append(or_(JobApplication.name.like(f"%{keyword}%"), JobApplication.phone.like(f"%{keyword}%")))
    total = db.scalar(select(func.count()).select_from(JobApplication).where(*wheres)) or 0
    rows = (
        db.scalars(
            select(JobApplication).where(*wheres).order_by(JobApplication.id.desc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
    )
    return ok({"list": [Out.model_validate(r) for r in rows], "total": total, "page": page, "page_size": page_size})


class AppUpdate(BaseModel):
    status: Optional[str] = None
    remark: Optional[str] = None


@router.put("/{item_id}")
def update_app(
    item_id: int,
    payload: AppUpdate,
    admin: Annotated[Admin, Depends(require_perm("job_application:update"))],
    db: DbSession = None,
):
    row = db.get(JobApplication, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("投递不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    row.updated_at = admin.id
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "job_application:update", target=str(item_id))
    return ok(build_schemas(JobApplication)[0].model_validate(row))
