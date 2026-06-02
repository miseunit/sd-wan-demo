"""
通知配置
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.db import Base

class NotificationConfig(Base):
    """通知配置表"""
    __tablename__ = "notification_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="配置ID")
    name = Column(String(100), nullable=False, comment="配置名称")
    type = Column(String(20), index=True, comment="通知类型: email/sms/webhook")
    config = Column(Text, comment="配置信息（JSON）")
    alert_types = Column(Text, comment="告警类型（JSON数组）")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
