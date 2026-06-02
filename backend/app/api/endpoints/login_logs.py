"""
登录日志 API
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db import get_db
from app.models.login_log import LoginLog
from app.schemas.response import PaginatedResponse

router = APIRouter(prefix="/login-logs", tags=["登录日志"])


class LoginLogResponse(BaseModel):
    """登录日志响应"""
    id: int
    user_id: int = None
    username: str = None
    ip_address: str = None
    status: str
    failure_reason: str = None
    created_at: datetime

    class Config:
        from_attributes = True


# 分页响应类型别名
PaginatedLoginLogs = PaginatedResponse[LoginLogResponse]


@router.get("/", response_model=PaginatedLoginLogs)
def get_login_logs(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    username: Optional[str] = Query(None, description="按用户名筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    db: Session = Depends(get_db)
):
    """获取登录日志列表（分页）"""
    query = db.query(LoginLog)

    if username:
        query = query.filter(LoginLog.username.like(f"%{username}%"))
    if status:
        query = query.filter(LoginLog.status == status)

    # 获取总数
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    items = query.order_by(LoginLog.created_at.desc()).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedLoginLogs(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )
