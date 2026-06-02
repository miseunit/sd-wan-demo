"""
系统基础配置模型
"""
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.db import Base

class SystemSetting(Base):
    """系统配置表"""
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, comment="配置键")
    value = Column(Text, comment="配置值")
    category = Column(String(50), index=True, comment="配置分类: basic/security/network/alert")
    description = Column(String(200), comment="配置说明")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
