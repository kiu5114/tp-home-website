"""通用 CRUD 路由工厂 + 分页工具（减少 20 张表的重复样板代码）。

- make_crud_router：为某模型生成 列表/详情/新增/修改/删除 五个接口，并自动套用 RBAC 权限依赖。
- 删除为软删除（is_activate=0），与数据库设计文档「通用生命周期」一致。
- 自动写入操作日志（OperationLog）。

注意：本文件不使用 `from __future__ import annotations`，因为 make_crud_router 内部函数
的参数注解引用了局部作用域的类型（Create/Update），必须即时求值才能被 FastAPI 正确解析。
"""
from typing import Any, Sequence

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from schemas import build_schemas


def paginate(
    db: Session,
    Model: type,
    Out,
    *,
    is_activate: int = 1,
    search: str | None = None,
    search_fields: Sequence[str] = (),
    page: int = 1,
    page_size: int = 10,
    order_by=None,
    extra_wheres: Sequence[Any] = (),
) -> dict:
    wheres = [Model.is_activate == is_activate, *extra_wheres]
    if search and search_fields:
        conds = [cast(getattr(Model, f), String).like(f"%{search}%") for f in search_fields]
        wheres.append(or_(*conds))

    total = db.scalar(select(func.count()).select_from(Model).where(*wheres)) or 0
    q = select(Model).where(*wheres)
    q = q.order_by(order_by if order_by is not None else Model.id.desc())
    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()
    return {
        "list": [Out.model_validate(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def make_crud_router(
    Model: type,
    *,
    prefix: str,
    perm: str,
    tags: list[str],
    search_fields: Sequence[str] = (),
    default_order=None,
) -> APIRouter:
    """生成标准后台 CRUD 路由。

    perm 形如 "product"，则权限码为 product:view / product:edit / product:delete。
    """
    Out, Create, Update = build_schemas(Model)
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", dependencies=[Depends(require_perm(f"{perm}:view"))])
    def list_items(
        db: DbSession,
        page: int = Query(1, ge=1),
        page_size: int = Query(10, ge=1, le=100),
        search: str | None = None,
        show_disabled: int = Query(0, description="1 显示全部（含禁用项）"),
    ):
        # show_disabled=1 → 不过滤（显示全部，便于后台管理查看禁用数据）
        # show_disabled=0 → 仅显示 is_activate=1（前台/默认启用态）
        # 注意：原写法 is_activate=0 if show_disabled else 1 语义反了——
        # 传 show_disabled=1 时实际查的是"仅禁用项"，导致新增数据查不到。
        kwargs = dict(
            db=db, Model=Model, Out=Out,
            search=search, search_fields=search_fields,
            page=page, page_size=page_size, order_by=default_order,
        )
        if not show_disabled:
            kwargs["is_activate"] = 1
        return ok(paginate(**kwargs))

    @router.get("/{item_id}", dependencies=[Depends(require_perm(f"{perm}:view"))])
    def get_item(item_id: int, db: DbSession):
        row = db.get(Model, item_id)
        if row is None or row.is_activate != 1:
            raise BizError("记录不存在")
        return ok(Out.model_validate(row))

    @router.post("", dependencies=[Depends(require_perm(f"{perm}:edit"))])
    def create_item(payload: Create, admin=Depends(require_perm(f"{perm}:edit")), db: DbSession = None):
        data = payload.model_dump(exclude_unset=True)
        row = Model(**data)
        row.created_at = admin.id
        row.updated_at = admin.id
        db.add(row)
        db.commit()
        db.refresh(row)
        record_log(db, admin.id, f"{perm}:create", target=str(getattr(row, "id", "")))
        return ok(Out.model_validate(row))

    @router.put("/{item_id}", dependencies=[Depends(require_perm(f"{perm}:edit"))])
    def update_item(
        item_id: int,
        payload: Update,
        admin=Depends(require_perm(f"{perm}:edit")),
        db: DbSession = None,
    ):
        row = db.get(Model, item_id)
        if row is None or row.is_activate != 1:
            raise BizError("记录不存在")
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(row, k, v)
        row.updated_at = admin.id
        db.commit()
        db.refresh(row)
        record_log(db, admin.id, f"{perm}:update", target=str(item_id))
        return ok(Out.model_validate(row))

    @router.delete("/{item_id}", dependencies=[Depends(require_perm(f"{perm}:delete"))])
    def delete_item(
        item_id: int,
        admin=Depends(require_perm(f"{perm}:delete")),
        db: DbSession = None,
    ):
        row = db.get(Model, item_id)
        if row is None:
            raise BizError("记录不存在")
        row.is_activate = 0
        row.updated_at = admin.id
        db.commit()
        record_log(db, admin.id, f"{perm}:delete", target=str(item_id))
        return ok({"id": item_id})

    return router
