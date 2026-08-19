"""文件上传路由（开发技术文档 §5.2、§9.4；PRD §12.2）。

- POST /api/admin/upload（multipart），校验 JPG/PNG/WebP/PDF，单文件 ≤5MB。
- 落盘 backend/uploads/，返回相对路径 /uploads/xxx（前端拼 API_BASE 即可访问）。
- 权限码 upload:edit。
"""
from __future__ import annotations

import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from pathlib import Path

from deps import DbSession, record_log, require_perm
from errors import BizError, ok
from models import Admin

router = APIRouter(prefix="/api/admin", tags=["上传"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload")
async def upload_file(
    admin: Annotated[Admin, Depends(require_perm("upload:edit"))],
    file: UploadFile = File(...),
    db: DbSession = None,
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise BizError("仅支持 JPG / PNG / WebP / PDF 格式")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise BizError("文件大小不能超过 5MB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / safe_name).write_bytes(data)

    path = f"/uploads/{safe_name}"
    record_log(db, admin.id, "upload", target=safe_name)
    return ok({"url": path, "filename": safe_name})
