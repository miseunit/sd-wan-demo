"""
操作审计日志
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db import Base

class AuditLog(Base):
    """操作审计日志表"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="日志ID")
    user_id = Column(Integer, index=True, comment="操作用户ID")
    username = Column(String(50), comment="操作用户名")
    action = Column(String(50), index=True, comment="操作类型: create/update/delete/login/logout")
    resource_type = Column(String(50), comment="资源类型: site/device/policy/user")
    resource_id = Column(String(50), comment="资源ID")
    details = Column(Text, comment="操作详情（JSON）")
    ip_address = Column(String(50), comment="IP地址")
    user_agent = Column(String(200), comment="用户代理")
    status = Column(String(20), comment="状态: success/failure")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="创建时间")