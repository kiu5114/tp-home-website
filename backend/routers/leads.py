"""留言/预约管理路由（后台，开发技术文档 §7.4）。

- 列表/流转(状态+处理人)/删除/导出 Excel(CSV)（权限码 lead:view / lead:update / lead:delete / lead:export）。
- 公开提交的线索在此跟进；状态：未处理/已联系/跟进中/已成交/无效。
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, or_, select

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from models import Admin, Lead
from schemas import build_schemas

router = APIRouter(prefix="/api/admin/leads", tags=["业务-留言预约"])


@router.get("")
def list_leads(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("lead:view"))],
    type: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    LeadOut = build_schemas(Lead)[0]
    wheres = [Lead.is_activate == 1]
    if type:
        wheres.append(Lead.type == type)
    if status:
        wheres.append(Lead.status == status)
    if keyword:
        wheres.append(or_(Lead.name.like(f"%{keyword}%"), Lead.phone.like(f"%{keyword}%")))
    total = db.scalar(select(func.count()).select_from(Lead).where(*wheres)) or 0
    rows = (
        db.scalars(
            select(Lead).where(*wheres).order_by(Lead.id.desc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
    )
    return ok(
        {
            "list": [LeadOut.model_validate(r) for r in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    remark: Optional[str] = None
    handler_id: Optional[int] = None


@router.put("/{item_id}")
def update_lead(
    item_id: int,
    payload: LeadUpdate,
    admin: Annotated[Admin, Depends(require_perm("lead:update"))],
    db: DbSession = None,
):
    row = db.get(Lead, item_id)
    if row is None or row.is_activate != 1:
        raise BizError("线索不存在")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    row.updated_at = admin.id
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "lead:update", target=str(item_id))
    return ok(build_schemas(Lead)[0].model_validate(row))


@router.delete("/{item_id}")
def delete_lead(
    item_id: int,
    admin: Annotated[Admin, Depends(require_perm("lead:delete"))],
    db: DbSession = None,
):
    row = db.get(Lead, item_id)
    if row is None:
        raise BizError("线索不存在")
    row.is_activate = 0
    row.updated_at = admin.id
    db.commit()
    record_log(db, admin.id, "lead:delete", target=str(item_id))
    return ok({"id": item_id})


@router.get("/export")
def export_leads(
    db: DbSession,
    _: Annotated[Admin, Depends(require_perm("lead:export"))],
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    wheres = [Lead.is_activate == 1]
    if type:
        wheres.append(Lead.type == type)
    if status:
        wheres.append(Lead.status == status)
    rows = db.scalars(select(Lead).where(*wheres).order_by(Lead.id.desc())).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ID", "类型", "姓名", "电话", "城市", "需求类型", "门店", "状态", "留言", "来源页", "创建时间"])
    for r in rows:
        writer.writerow(
            [
                r.id,
                r.type,
                r.name,
                r.phone,
                r.city or "",
                r.requirement_type,
                r.store or "",
                r.status,
                (r.message or "").replace("\n", " "),
                r.source_page,
                r.created_date,
            ]
        )
    buf.seek(0)
    headers = {"Content-Disposition": "attachment; filename=leads_export.csv"}
    return StreamingResponse(iter([buf.getvalue().encode("utf-8-sig")]), media_type="text/csv", headers=headers)
