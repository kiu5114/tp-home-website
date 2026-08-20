"""鉴权路由：登录 / 刷新 / 当前管理员 / 改密 / 登出（开发技术文档 §7.3、§8）。

- 登录返回 access + refresh 双 token，以及管理员基础信息与权限（前端菜单/按钮级鉴权用）。
- 越权：无 token/失效 → 401（AuthError）；无权限 code → 403（PermError）。
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from deps import CurrentAdmin, DbSession, get_current_admin, record_log
from errors import AuthError, BizError, ok
from models import Admin, LoginLog
from schemas import AdminOut, ChangePasswordIn, LoginIn
from security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    is_refresh_token,
    verify_password,
    hash_password,
)

router = APIRouter(prefix="/api/admin", tags=["鉴权"])


def _admin_out(admin: Admin) -> dict:
    perms = admin.role.permissions if admin.role else []
    if isinstance(perms, str):
        import json

        try:
            perms = json.loads(perms) or []
        except Exception:
            perms = []
    return AdminOut(
        id=admin.id,
        username=admin.username,
        name=admin.name,
        nickname=admin.nickname,
        phone=admin.phone,
        email=admin.email,
        gender=admin.gender,
        position=admin.position,
        dept_id=admin.dept_id,
        role_id=admin.role_id,
        role_name=admin.role.name if admin.role else None,
        permissions=perms or [],
        is_activate=admin.is_activate,
        last_login_at=admin.last_login_at,
    ).model_dump()


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/login")
def login(payload: LoginIn, request: Request, db: DbSession):
    admin = db.query(Admin).filter(Admin.username == payload.username).first()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise AuthError("用户名或密码错误")
    if admin.is_activate != 1:
        raise AuthError("账号已禁用")
    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()
    access = create_access_token(admin.id)
    refresh = create_refresh_token(admin.id)
    record_log(db, admin.id, "login", target=admin.username, ip=_client_ip(request))
    db.add(LoginLog(admin_id=admin.id, username=admin.username, ip=_client_ip(request), status=1, user_agent=request.headers.get("user-agent")))
    db.commit()
    return ok(
        {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "admin": _admin_out(admin),
        }
    )


class RefreshIn(BaseModel):
    refresh_token: str


@router.post("/refresh")
def refresh(payload: RefreshIn, request: Request, db: DbSession):
    if not is_refresh_token(payload.refresh_token):
        raise AuthError("refresh token 无效")
    try:
        sub = decode_token(payload.refresh_token).get("sub")
    except Exception:
        raise AuthError("refresh token 无效")
    admin = db.get(Admin, int(sub))
    if admin is None or admin.is_activate != 1:
        raise AuthError("账号不存在或已禁用")
    new_access = create_access_token(admin.id)
    return ok({"access_token": new_access, "token_type": "bearer"})


@router.get("/me")
def me(admin: CurrentAdmin):
    return ok(_admin_out(admin))


@router.post("/change-password")
def change_password(payload: ChangePasswordIn, admin: CurrentAdmin, db: DbSession):
    if not verify_password(payload.old_password, admin.password_hash):
        raise BizError("原密码错误")
    admin.password_hash = hash_password(payload.new_password)
    admin.updated_at = admin.id
    db.commit()
    record_log(db, admin.id, "change_password", target=admin.username)
    return ok({"ok": True})


@router.post("/logout")
def logout(admin: CurrentAdmin, request: Request, db: DbSession):
    record_log(db, admin.id, "logout", target=admin.username, ip=_client_ip(request))
    db.add(LoginLog(admin_id=admin.id, username=admin.username, ip=_client_ip(request), status=1, user_agent=request.headers.get("user-agent")))
    db.commit()
    return ok({"ok": True})
