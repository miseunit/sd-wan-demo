"""
FastAPI 应用入口
"""
import json
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings
from app.db import init_db, seed_db
from app.schemas.response import success, error, SUCCESS_MESSAGES
from app.api.endpoints import (
    users,
    sites,
    policies,
    devices,
    alerts,
    dashboard,
    links,
    smart_routing,
    # settings,   # 待实现
    # roles,      # 待实现
    # audit_logs, # 待实现
    # login_logs, # 待实现
    # alert_rules,# 待实现
    # notifications,# 待实现
    # webhooks,   # 待实现
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    # 启动时初始化数据库并填充种子数据
    init_db()
    seed_db()
    yield
    # 关闭时的清理工作（如需要）


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SD-WAN Demo 后端 API",
    lifespan=lifespan
)


# ============================================================
#  统一响应格式中间件（纯 ASGI 实现）
# ============================================================

# 需要排除的路径（不包装响应）
EXCLUDE_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}


class UnifiedResponseMiddleware:
    """
    纯 ASGI 中间件，统一包装 API 响应为 {code, message, data} 格式。
    使用纯 ASGI 实现避免 BaseHTTPMiddleware 对 StreamingResponse 的兼容问题。
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # 仅处理 HTTP 请求
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # 排除非 API 路径
        if path in EXCLUDE_PATHS or not path.startswith(settings.API_PREFIX):
            await self.app(scope, receive, send)
            return

        # 排除 WebSocket
        if path.endswith("/ws"):
            await self.app(scope, receive, send)
            return

        # 收集内部应用的响应
        status_code = 200
        response_headers: list[tuple[bytes, bytes]] = []
        response_body = bytearray()

        async def send_wrapper(message: dict):
            nonlocal status_code, response_headers, response_body

            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                response_headers = message.get("headers", [])
            elif message["type"] == "http.response.body":
                chunk = message.get("body", b"")
                if chunk:
                    response_body.extend(chunk)

        await self.app(scope, receive, send_wrapper)

        # 检查 content-type
        ct_lower = {
            k.decode("latin-1").lower(): v.decode("latin-1")
            for k, v in response_headers
        }
        content_type = ct_lower.get("content-type", "")

        # 204 包装为 200 + 统一格式
        if status_code == 204:
            await self._send_wrapped(send, 200, success(data=None, message="删除成功"), response_headers)
            return

        # 非 JSON 响应（文件下载等）原样返回
        if "application/json" not in content_type:
            await send({"type": "http.response.start", "status": status_code, "headers": response_headers})
            await send({"type": "http.response.body", "body": bytes(response_body)})
            return

        # 解析 JSON
        if response_body:
            try:
                data = json.loads(bytes(response_body))
            except (json.JSONDecodeError, Exception):
                # 无法解析，原样返回
                await send({"type": "http.response.start", "status": status_code, "headers": response_headers})
                await send({"type": "http.response.body", "body": bytes(response_body)})
                return
        else:
            data = None

        # 排除已经是统一格式的响应（防止重复包装）
        if isinstance(data, dict) and "code" in data and "message" in data:
            await send({"type": "http.response.start", "status": status_code, "headers": response_headers})
            await send({"type": "http.response.body", "body": bytes(response_body)})
            return

        # 包装为统一格式
        method = scope.get("method", "GET").upper()
        default_message = SUCCESS_MESSAGES.get(method, "操作成功")
        wrapped = success(data=data, message=default_message)

        await self._send_wrapped(send, status_code, wrapped, response_headers)

    @staticmethod
    async def _send_wrapped(send: Send, status_code: int, content: dict,
                            original_headers: list[tuple[bytes, bytes]]):
        """发送包装后的 JSON 响应，保留原始 headers（除 content-length）"""
        body_bytes = json.dumps(content, ensure_ascii=False).encode("utf-8")
        new_headers = [
            (k, v) for k, v in original_headers
            if k.decode("latin-1").lower() != "content-length"
        ]
        new_headers.append((b"content-length", str(len(body_bytes)).encode("latin-1")))

        await send({"type": "http.response.start", "status": status_code, "headers": new_headers})
        await send({"type": "http.response.body", "body": body_bytes})


# 注册中间件（必须在 CORS 之前，作为最外层）
app.add_middleware(UnifiedResponseMiddleware)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  统一异常处理
# ============================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    HTTP 异常统一处理
    将 FastAPI/Starlette 的 HTTPException 转换为统一格式
    """
    # 从 detail 中提取消息
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=error(code=exc.status_code, message=message),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    请求参数校验异常统一处理
    将参数校验错误转换为统一格式
    """
    errors = exc.errors()
    # 提取第一个错误作为消息
    if errors:
        first_error = errors[0]
        loc = " -> ".join(str(l) for l in first_error.get("loc", []) if l != "body")
        msg = first_error.get("msg", "参数校验失败")
        message = f"{loc}: {msg}" if loc else msg
    else:
        message = "请求参数校验失败"

    return JSONResponse(
        status_code=422,
        content=error(code=422, message=message),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    全局未捕获异常处理
    防止内部错误信息泄露
    """
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content=error(code=500, message="服务器内部错误，请稍后重试"),
    )


# 注册路由
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(sites.router, prefix=settings.API_PREFIX)
app.include_router(policies.router, prefix=settings.API_PREFIX)
app.include_router(devices.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(links.router, prefix=settings.API_PREFIX)
app.include_router(smart_routing.router, prefix=settings.API_PREFIX)
# app.include_router(settings.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(roles.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(audit_logs.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(login_logs.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(alert_rules.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(notifications.router, prefix=settings.API_PREFIX)  # 待实现
# app.include_router(webhooks.router, prefix=settings.API_PREFIX)  # 待实现


@app.get("/", tags=["根路径"])
def read_root():
    """根路径"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health", tags=["健康检查"])
def health_check():
    """健康检查"""
    return {"status": "healthy"}
