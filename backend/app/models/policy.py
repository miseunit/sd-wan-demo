"""
SD-WAN 策略模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime
)

from app.db import Base


class Policy(Base):
    """策略表"""
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="策略ID")
    name = Column(String(100), unique=True, nullable=False, index=True, comment="策略名称")
    type = Column(String(20), nullable=False, index=True, comment="策略类型: route/qos/app_aware/security")
    status = Column(String(20), nullable=False, default="draft", index=True, comment="状态: active/inactive/draft")
    priority = Column(Integer, default=100, comment="优先级（数字越小越优先）")
    description = Column(Text, comment="策略描述")
    match_conditions = Column(Text, comment="匹配条件（JSON）")
    action_config = Column(Text, comment="动作配置（JSON）")
    applied_sites = Column(String(500), default="", comment="应用的站点ID列表（逗号分隔）")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
