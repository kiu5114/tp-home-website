"""统一响应信封 + 异常定义与处理器（依据开发技术文档 §9.1/§9.3）。

所有接口经统一响应信封返回：{code, message, data}
- 0     成功
- 401   未鉴权/过期
- 403   无权限
- 422   参数校验失败
- 400   业务错误
- 500   服务器错误
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def ok(data=None, message: str = "ok"):
    return {"code": 0, "message": message, "data": data}


def fail(code: int, message: str, data=None):
    return {"code": code, "message": message, "data": data}


class AppError(Exception):
    """业务异常基类，携带错误码与文案。"""

    code = 400
    message = "业务错误"

    def __init__(self, message: str | None = None, code: int | None = None, data=None):
        self.code = code if code is not None else self.code
        self.message = message or self.message
        self.data = data
        super().__init__(self.message)


class AuthError(AppError):
    code = 401
    message = "未鉴权或登录已过期"


class PermError(AppError):
    code = 403
    message = "无权限访问该资源"


class BizError(AppError):
    code = 400
    message = "操作失败"


def install_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器，统一转为响应信封。"""

    @app.exception_handler(AppError)
    async def _app_error_handler(request: Request, exc: AppError):
        return JSONResponse(status_code=200, content=fail(exc.code, exc.message, exc.data))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error_handler(request: Request, exc: StarletteHTTPException):
        # 401/403/404/500 等标准 HTTP 异常 → 信封
        return JSONResponse(
            status_code=200,
            content=fail(exc.status_code, str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=200,
            content=fail(422, "参数校验失败", exc.errors()),
        )

    @app.exception_handler(Exception)
    async def _unhandled_error_handler(request: Request, exc: Exception):
        # 兜底：避免泄露堆栈，统一 500 信封
        return JSONResponse(
            status_code=200,
            content=fail(500, "服务器内部错误"),
        )
