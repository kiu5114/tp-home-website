"""Pydantic v2 出入参（依据开发技术文档 §5.1、§9.1；对齐数据库设计文档 §4）。

- 提供通用 schema 工厂 `build_schemas(Model)`，为 20 张表自动生成 Out/Create/Update。
- 鉴权与管理员/角色相关使用手写 schema（含密码、权限字段）。
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, create_model
from sqlalchemy import JSON, Boolean, DateTime, Integer, SmallInteger, String, Text


# ---------- 通用 schema 工厂 ----------

def _sa_py(col_type: Any) -> Any:
    if isinstance(col_type, JSON):
        return Any
    if isinstance(col_type, (Integer, SmallInteger)):
        return int
    if isinstance(col_type, Boolean):
        return bool
    if isinstance(col_type, DateTime):
        return datetime
    return str


def _is_required(col) -> bool:
    return (col.nullable is False) and (col.default is None) and (col.server_default is None)


_AUDIT_OR_AUTO = {"id", "is_activate", "created_at", "created_date", "updated_at", "updated_date"}


def build_schemas(Model: type):
    """为模型生成 (Out, Create, Update) 三套 schema。"""
    cols = Model.__table__.columns
    out_fields: dict = {}
    create_fields: dict = {}
    update_fields: dict = {}

    for col in cols:
        pyt = _sa_py(col.type)
        out_fields[col.name] = (Optional[pyt], None)
        if col.name in _AUDIT_OR_AUTO:
            continue
        if _is_required(col):
            create_fields[col.name] = (pyt, ...)
        else:
            create_fields[col.name] = (Optional[pyt], None)
        update_fields[col.name] = (Optional[pyt], None)

    Out = create_model(
        f"{Model.__name__}Out",
        __config__=ConfigDict(from_attributes=True),
        **out_fields,
    )
    Create = create_model(f"{Model.__name__}Create", **create_fields)
    Update = create_model(f"{Model.__name__}Update", **update_fields)
    return Out, Create, Update


# ---------- 鉴权 / 管理员 / 角色 手写 schema ----------

class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AdminOut(BaseModel):
    """当前管理员及权限信息（供 /me 与列表返回）。"""

    model_config = ConfigDict(from_attributes=True)  # 允许直接从 ORM 对象校验

    id: int
    username: str
    name: Optional[str] = None
    nickname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: int = 0
    position: Optional[str] = None
    dept_id: Optional[int] = None
    role_id: int
    role_name: Optional[str] = None
    permissions: list[str] = []
    is_activate: int = 1
    last_login_at: Optional[datetime] = None


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


class AdminCreate(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    nickname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: int = 0
    position: Optional[str] = None
    dept_id: Optional[int] = None
    role_id: int


class AdminUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[int] = None
    position: Optional[str] = None
    dept_id: Optional[int] = None
    role_id: Optional[int] = None
    password: Optional[str] = None  # 可选改密
    is_activate: Optional[int] = None


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # 允许直接从 ORM 对象校验

    id: int
    name: str
    permissions: list[str] = []
    description: Optional[str] = None
    is_activate: int = 1


class RoleCreate(BaseModel):
    name: str
    permissions: list[str] = []
    description: Optional[str] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[list[str]] = None
    description: Optional[str] = None
    is_activate: Optional[int] = None


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # 允许直接从 ORM 对象校验

    id: int
    code: str
    name: str
    # 模型属性为 group_（列名 group 是保留字），用 validation_alias 从 ORM 取值
    group: str = Field(validation_alias="group_")
    remark: Optional[str] = None
    is_activate: int = 1
