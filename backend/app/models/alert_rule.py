"""
告警规则
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float
from app.db import Base

class AlertRule(Base):
    """告警规则表"""
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="规则ID")
    name = Column(String(100), nullable=False, comment="规则名称")
    type = Column(String(50), index=True, comment="告警类型: cpu/memory/link/sla/device")
    metric = Column(String(50), comment="监控指标: cpu_usage/latency/packet_loss")
    condition = Column(String(20), comment="触发条件: gt/lt/eq/gte/lte")
    threshold = Column(Float, comment="阈值")
    severity = Column(String(20), comment="严重级别: critical/warning/info")
    is_active = Column(Boolean, default=True, comment="是否启用")
    description = Column(Text, comment="规则描述")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
