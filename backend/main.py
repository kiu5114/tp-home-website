"""FastAPI 应用入口（开发技术文档 §5.1）。

- 统一响应信封 + 全局异常处理（errors.install_exception_handlers）
- CORS（开发允许 web/admin 起源，避免 Windows localhost→IPv6）
- 挂载 /uploads 静态目录
- 注册全部路由模块
- lifespan：首版全量建表（Base.metadata.create_all）+ 幂等 seed
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import Base, SessionLocal, engine
from errors import ok
from routers import (
    admins,
    auth,
    content,
    dashboard,
    departments,
    dicts,
    job_applications_admin,
    leads,
    login_logs,
    menus,
    notices,
    online,
    operation_logs,
    permissions,
    posts,
    roles,
    site_config,
    upload,
)
from seed import run_seed

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 首版全量建表（开发用 SQLite；生产用 Alembic）
    Base.metadata.create_all(bind=engine)
    run_seed()
    yield


app = FastAPI(
    title="TP 全屋家居 · 企业官网与后台管理系统 API",
    version="1.0.0",
    description="依据《数据库设计文档 v1.2》《开发技术文档 v1.0》实现；统一响应信封 {code,message,data}。",
    lifespan=lifespan,
)

# CORS：开发允许 web/admin 起源（127.0.0.1 避 IPv6）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常 → 统一信封
from errors import install_exception_handlers  # noqa: E402

install_exception_handlers(app)

# 静态资源
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# 路由注册
app.include_router(auth.router)
app.include_router(admins.router)
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(departments.router)
app.include_router(content.router)
app.include_router(content.public)
app.include_router(leads.router)
app.include_router(job_applications_admin.router)
app.include_router(site_config.router)
app.include_router(operation_logs.router)
app.include_router(dashboard.router)
app.include_router(upload.router)
# 阶段二新增模块
app.include_router(menus.router)
app.include_router(dicts.router_types)
app.include_router(dicts.router_data)
app.include_router(notices.router)
app.include_router(posts.router)
app.include_router(login_logs.router)
app.include_router(online.router)


@app.get("/")
def root():
    return ok({"service": "TP 全屋家居 API", "docs": "/docs"})


@app.get("/api/health")
def health():
    return ok({"status": "ok"})
