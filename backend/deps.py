"""依赖注入：数据库会话、当前管理员、RBAC 权限校验（依据开发技术文档 §5.2/§8）。

- get_db：提供数据库会话
- get_current_admin：解析 access token，返回激活的管理员，失败抛 AuthError(401)
- require_perm(code)：在 get_current_admin 基础上校验权限编码，无码抛 PermError(403)
- perm_dependency(code)：返回依赖工厂，供路由使用
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from database import SessionLocal
from errors import AuthError, PermError
from models import Admin, OperationLog, Role
from security import decode_token

SUPER_WILDCARD = "*"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def _extract_token(authorization: str | None) -> str:
    if not authorization:
        raise AuthError("缺少 Authorization 头")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Authorization 格式错误")
    return parts[1]


def get_current_admin(
    authorization: Annotated[str | None, Header()] = None,
    db: DbSession = None,
) -> Admin:
    token = _extract_token(authorization)
    try:
        payload = decode_token(token)
    except Exception:
        raise AuthError("token 无效")
    if payload.get("type") != "access":
        raise AuthError("token 类型错误")
    sub = payload.get("sub")
    if sub is None:
        raise AuthError("token 缺少 subject")
    admin = db.get(Admin, int(sub))
    if admin is None or admin.is_activate != 1:
        raise AuthError("管理员不存在或已禁用")
    return admin


CurrentAdmin = Annotated[Admin, Depends(get_current_admin)]


def _load_permissions(admin: Admin) -> list[str]:
    role = admin.role
    if role is None:
        return []
    perms = role.permissions
    if isinstance(perms, str):
        import json

        try:
            perms = json.loads(perms) or []
        except Exception:
            perms = []
    return perms or []


def has_perm(admin: Admin, code: str) -> bool:
    perms = _load_permissions(admin)
    if SUPER_WILDCARD in perms:
        return True
    return code in perms


def require_perm(code: str | None):
    """权限依赖工厂。code=None 表示仅登录即可。"""

    def _dep(admin: CurrentAdmin) -> Admin:
        if code is not None and not has_perm(admin, code):
            raise PermError(f"缺少权限：{code}")
        return admin

    return _dep


def record_log(
    db: Session,
    admin_id: int,
    action: str,
    target: str | None = None,
    ip: str | None = None,
) -> None:
    """写入操作日志（OperationLog，推导实体 §4.21）。"""
    log = OperationLog(created_at=admin_id, action=action, target=target, ip=ip)
    db.add(log)
    db.commit()
