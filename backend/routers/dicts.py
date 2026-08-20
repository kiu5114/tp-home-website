"""字典管理路由（系统管理，开发技术文档 §7.4）。

- 字典类型 / 字典数据 两套标准 CRUD，权限码 dict:view / dict:edit / dict:delete。
- 字典数据按 type_id 归属字典类型（外键级联删除）。
"""
from __future__ import annotations

from fastapi import APIRouter

from crud_utils import make_crud_router
from models import DictData, DictType

router_types = make_crud_router(
    DictType,
    prefix="/api/admin/dict-types",
    perm="dict",
    tags=["系统管理-字典"],
    search_fields=("name", "type_code"),
)

router_data = make_crud_router(
    DictData,
    prefix="/api/admin/dict-data",
    perm="dict",
    tags=["系统管理-字典数据"],
    search_fields=("label", "value"),
)
