"""
审计日志 API
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db import get_db
from app.models.audit_log import AuditLog
from app.schemas.response import PaginatedResponse

router = APIRouter(prefix="/audit-logs", tags=["审计日志"])


class AuditLogResponse(BaseModel):
    """审计日志响应"""
    id: int
    user_id: int = None
    username: str = None
    action: str
    resource_type: str = None
    resource_id: str = None
    details: str = None
    ip_address: str = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# 分页响应类型别名
PaginatedAuditLogs = PaginatedResponse[AuditLogResponse]


@router.get("/", response_model=PaginatedAuditLogs)
def get_audit_logs(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    action: Optional[str] = Query(None, description="按操作类型筛选"),
    username: Optional[str] = Query(None, description="按用户名筛选"),
    db: Session = Depends(get_db)
):
    """获取审计日志列表（分页）"""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username.like(f"%{username}%"))

    # 获取总数
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedAuditLogs(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )
