"""
SD-WAN 告警模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship

from app.db import Base


class Alert(Base):
    """告警表"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="告警ID")
    level = Column(String(20), nullable=False, index=True, comment="告警等级: critical/warning/info")
    status = Column(String(20), nullable=False, default="new", index=True, comment="状态: new/acknowledged/in_progress/resolved")
    title = Column(String(200), nullable=False, comment="告警标题")
    message = Column(Text, nullable=False, comment="告警详情")
    source_type = Column(String(20), nullable=False, comment="告警来源: site/link/device")
    source_id = Column(String(50), nullable=False, index=True, comment="来源ID")
    source_name = Column(String(100), comment="来源名称（冗余字段，方便查询）")
    region = Column(String(10), comment="区域")
    metric_type = Column(String(50), comment="指标类型: latency/loss/bandwidth/cpu/memory")
    metric_value = Column(Float, comment="当前指标值")
    threshold = Column(Float, comment="阈值")
    root_cause = Column(Text, comment="根因分析")
    related_alerts = Column(Text, comment="关联告警ID列表（JSON）")
    acknowledged_by = Column(String(50), comment="确认人")
    acknowledged_at = Column(DateTime, comment="确认时间")
    resolved_at = Column(DateTime, comment="恢复时间")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="发生时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AlertHistory(Base):
    """告警历史表（用于时间线展示）"""
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False, index=True, comment="关联告警ID")
    action = Column(String(20), nullable=False, comment="操作: created/acknowledged/resolved/updated")
    operator = Column(String(50), comment="操作人")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.utcnow)
