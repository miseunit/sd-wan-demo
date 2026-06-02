"""
WAN 链路管理相关的 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.response import PaginatedResponse


# ============================================================
#  子资源 Schemas
# ============================================================

class SwitchEvent(BaseModel):
    """链路切换事件"""
    id: str
    linkId: str
    time: str
    fromLink: str
    toLink: str
    reason: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LinkAlert(BaseModel):
    """链路告警"""
    id: str
    linkId: str
    severity: str
    category: str
    title: str
    reason: str
    timestamp: str
    resolved: bool

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class HistoryPoint(BaseModel):
    """历史性能数据点"""
    time: str
    latency: float
    loss: float
    jitter: float
    bandwidth: float
    throughput: float = 0


# ============================================================
#  链路核心 Schemas
# ============================================================

class WanLinkBase(BaseModel):
    """链路基础 Schema"""
    name: str = Field(..., min_length=1, max_length=50, description="链路名称")
    type: str = Field(..., description="链路类型: MPLS/Internet/5G/WAN")
    site_id: str = Field(..., alias="siteId", description="所属站点ID")
    device_id: Optional[str] = Field(None, alias="deviceId", description="所属设备ID")
    isp: Optional[str] = None
    ip: Optional[str] = None
    switch_policy: str = Field("mpls-priority", alias="switchPolicy",
                               description="切换策略")
    monthly_cost: float = Field(0, alias="monthlyCost", description="月成本(元)")

    model_config = ConfigDict(populate_by_name=True)


class WanLinkCreate(WanLinkBase):
    """创建链路 Schema"""
    pass


class WanLinkUpdate(BaseModel):
    """更新链路 Schema（部分更新）"""
    name: Optional[str] = None
    type: Optional[str] = None
    isp: Optional[str] = None
    ip: Optional[str] = None
    health_status: Optional[str] = Field(None, alias="healthStatus")
    active_status: Optional[str] = Field(None, alias="activeStatus")
    latency: Optional[float] = None
    loss: Optional[float] = None
    jitter: Optional[float] = None
    bandwidth: Optional[float] = None
    used_bandwidth: Optional[float] = Field(None, alias="usedBandwidth")
    utilization: Optional[float] = None
    switch_policy: Optional[str] = Field(None, alias="switchPolicy")
    monthly_cost: Optional[float] = Field(None, alias="monthlyCost")

    model_config = ConfigDict(populate_by_name=True)


class WanLink(WanLinkBase):
    """链路响应 Schema"""
    id: str
    siteName: str
    deviceName: Optional[str] = Field(None, alias="deviceName", description="所属设备名称")
    healthStatus: str
    activeStatus: str
    latency: float
    loss: float
    jitter: float
    bandwidth: float
    usedBandwidth: float
    utilization: float
    slaScore: float
    switchHistory: List[SwitchEvent]
    alerts: List[LinkAlert]
    siteLinkId: Optional[int] = Field(None, alias="siteLinkId", description="对应 site_links 表中的链路ID")
    createdAt: datetime

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ============================================================
#  统计相关 Schemas
# ============================================================

class LinkStats(BaseModel):
    """链路统计信息"""
    total: int
    healthy: int
    degraded: int
    down: int
    activeCount: int = Field(..., alias="activeCount")
    totalCost: float = Field(..., alias="totalCost")

    model_config = ConfigDict(populate_by_name=True)


# ============================================================
#  分页相关 Schemas
# ============================================================

# 使用通用分页响应模型
PaginatedLinks = PaginatedResponse[WanLink]
