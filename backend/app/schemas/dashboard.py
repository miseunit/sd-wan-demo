"""
Dashboard 相关的 Pydantic Schemas
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class DashboardSite(BaseModel):
    """Dashboard 站点数据"""
    id: str
    name: str
    type: str = Field(..., description="类型: hq/branch/cloud")
    cloud_provider: Optional[str] = Field(None, alias="cloudProvider")
    lat: float
    lng: float
    status: str
    sla: float
    avgLatency: float = Field(0, alias="avgLatency")
    activeTunnels: int = Field(0, alias="activeTunnels")
    totalBandwidth: str = Field("", alias="totalBandwidth")
    region: str

    class Config:
        populate_by_name = True
        from_attributes = True


class DashboardLink(BaseModel):
    """Dashboard 链路数据"""
    id: str
    sourceId: str = Field(..., alias="sourceId")
    targetId: str = Field(..., alias="targetId")
    sourceName: str = Field("", alias="sourceName")
    targetName: str = Field("", alias="targetName")
    sourceCoords: List[float] = Field([], alias="sourceCoords")
    targetCoords: List[float] = Field([], alias="targetCoords")
    avgLatency: float = Field(0, alias="avgLatency")
    packetLoss: float = Field(0, alias="packetLoss")
    bandwidth: str = ""
    health: str = "good"
    status: str = "active"

    class Config:
        populate_by_name = True
        from_attributes = True


class DashboardApp(BaseModel):
    """Dashboard 应用 SLA 数据"""
    id: str
    name: str
    shortName: str = Field(..., alias="shortName")
    availability: float
    performance: float
    color: str

    class Config:
        populate_by_name = True
        from_attributes = True


class DashboardAlert(BaseModel):
    """Dashboard 告警数据"""
    id: str
    severity: str = Field(..., description="严重级别: critical/major/minor")
    title: str
    siteName: str = Field("", alias="siteName")
    siteId: str = Field("", alias="siteId")
    description: str = ""
    timestamp: str = ""
    category: str = ""

    class Config:
        populate_by_name = True
        from_attributes = True


class DashboardIspBandwidth(BaseModel):
    """Dashboard ISP 带宽数据"""
    isp: str
    shortName: str = Field("", alias="shortName")
    usedMbps: float = Field(0, alias="usedMbps")
    totalMbps: float = Field(100, alias="totalMbps")
    color: str

    class Config:
        populate_by_name = True
        from_attributes = True


class DashboardStats(BaseModel):
    """Dashboard 统计数据"""
    totalSites: int
    onlineSites: int
    offlineSites: int
    totalLinks: int
    criticalAlerts: int


class DashboardData(BaseModel):
    """Dashboard 聚合响应"""
    healthScore: float
    stats: DashboardStats
    sites: List[DashboardSite]
    links: List[DashboardLink]
    applications: List[DashboardApp]
    alerts: List[DashboardAlert]
    ispBandwidth: List[DashboardIspBandwidth]
