"""
告警相关的 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.response import PaginatedResponse


VALID_LEVELS = ("critical", "warning", "info")
VALID_STATUSES = ("new", "acknowledged", "in_progress", "resolved")
VALID_SOURCE_TYPES = ("site", "link", "device")


class AlertBase(BaseModel):
    """告警基础 Schema"""
    level: str = Field(..., description="告警等级: critical/warning/info")
    title: str = Field(..., min_length=2, max_length=200, description="告警标题")
    message: str = Field(..., description="告警详情")
    source_type: str = Field(..., description="告警来源: site/link/device")
    source_id: str = Field(..., description="来源ID")
    source_name: Optional[str] = Field(None, description="来源名称")
    region: Optional[str] = Field(None, description="区域")
    metric_type: Optional[str] = Field(None, description="指标类型: latency/loss/bandwidth/cpu/memory")
    metric_value: Optional[float] = Field(None, description="当前指标值")
    threshold: Optional[float] = Field(None, description="阈值")
    root_cause: Optional[str] = Field(None, description="根因分析")
    related_alerts: Optional[List[int]] = Field(None, description="关联告警ID列表")


class AlertCreate(AlertBase):
    """创建告警 Schema"""
    pass


class AlertUpdate(BaseModel):
    """更新告警 Schema"""
    status: Optional[str] = Field(None, description="状态: acknowledged/in_progress/resolved")
    acknowledged_by: Optional[str] = Field(None, description="确认人")
    root_cause: Optional[str] = Field(None, description="根因分析")
    remark: Optional[str] = Field(None, description="备注")


class AlertInDB(AlertBase):
    """数据库中的告警 Schema"""
    id: int
    status: str
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Alert(AlertInDB):
    """返回给前端的告警 Schema"""
    pass


class AlertStats(BaseModel):
    """告警统计 Schema"""
    total: int
    critical: int
    warning: int
    info: int
    new: int
    acknowledged: int
    in_progress: int
    resolved: int


class AlertTimelineEntry(BaseModel):
    """告警时间线条目"""
    id: int
    action: str
    operator: Optional[str]
    remark: Optional[str]
    created_at: datetime


class AlertWithTimeline(Alert):
    """带时间线的告警详情"""
    timeline: List[AlertTimelineEntry] = []


# 分页响应类型别名
PaginatedAlerts = PaginatedResponse[Alert]
