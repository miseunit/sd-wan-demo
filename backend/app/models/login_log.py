"""
登录日志
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.db import Base

class LoginLog(Base):
    """登录日志表"""
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="日志ID")
    user_id = Column(Integer, index=True, comment="用户ID")
    username = Column(String(50), comment="用户名")
    ip_address = Column(String(50), index=True, comment="IP地址")
    user_agent = Column(String(200), comment="用户代理")
    status = Column(String(20), index=True, comment="状态: success/failure")
    failure_reason = Column(String(100), comment="失败原因")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="登录时间")