"""站点配置路由（单行 id=1，开发技术文档 §7.4）。

- GET/PUT（权限码 site:view / site:edit）。应用层保证单行 id=1。
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select

from deps import DbSession, record_log, require_perm
from errors import ok
from models import Admin, SiteConfig
from schemas import build_schemas

router = APIRouter(prefix="/api/admin/site-config", tags=["系统管理-站点配置"])

SiteConfigOut = build_schemas(SiteConfig)[0]


class SiteConfigUpdate(BaseModel):
    site_name: str | None = None
    logo: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    company_address: str | None = None
    icp: str | None = None
    copyright: str | None = None


@router.get("")
def get_site_config(db: DbSession, _: Annotated[Admin, Depends(require_perm("site:view"))]):
    row = db.scalars(select(SiteConfig).where(SiteConfig.id == 1)).first()
    if row is None:
        return ok(None)
    return ok(SiteConfigOut.model_validate(row))


@router.put("")
def update_site_config(
    payload: SiteConfigUpdate,
    admin: Annotated[Admin, Depends(require_perm("site:edit"))],
    db: DbSession = None,
):
    row = db.scalars(select(SiteConfig).where(SiteConfig.id == 1)).first()
    if row is None:
        row = SiteConfig(id=1, created_at=admin.id, updated_at=admin.id)
        db.add(row)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    row.updated_at = admin.id
    db.commit()
    db.refresh(row)
    record_log(db, admin.id, "site:update", target="site_config")
    return ok(SiteConfigOut.model_validate(row))
