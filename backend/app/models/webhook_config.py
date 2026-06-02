"""
Webhook配置
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.db import Base

class WebhookConfig(Base):
    """Webhook配置表"""
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="配置ID")
    name = Column(String(100), nullable=False, comment="配置名称")
    url = Column(String(500), nullable=False, comment="Webhook URL")
    method = Column(String(10), default="POST", comment="HTTP方法: POST/PUT/PATCH")
    headers = Column(Text, comment="请求头（JSON）")
    events = Column(Text, comment="触发事件（JSON数组）")
    secret = Column(String(200), comment="签名密钥")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
