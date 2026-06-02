"""
站点相关的 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.response import PaginatedResponse


# ============================================================
#  基础类型定义
# ============================================================

class SiteLink(BaseModel):
    """站点链路信息（来自 wan_links 表）"""
    id: str = Field(..., description="链路ID（wan_links.id）")
    name: str = Field(..., description="链路名称")
    link_type: str = Field(..., alias="linkType", description="链路类型: MPLS/Internet/5G")
    isp: Optional[str] = None
    bandwidth: str = Field(..., description="总带宽（如: 500 Mbps）")
    used_bandwidth: str = Field(..., alias="usedBandwidth", description="已用带宽（如: 200 Mbps）")
    usage_percent: float = Field(..., alias="usagePercent", description="使用率(%)")
    latency: float
    loss: float
    jitter: float = 0
    status: str = Field(..., description="使用状态: active/standby/down")
    health_status: str = Field(..., alias="healthStatus", description="健康状态: healthy/degraded/down")
    ip: Optional[str] = None
    sla_score: float = Field(..., alias="slaScore", description="SLA评分")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class SiteAlert(BaseModel):
    """告警信息"""
    id: int
    site_id: str = Field(..., alias="siteId")
    severity: str = Field(..., description="严重级别: critical/major/minor")
    title: str
    reason: Optional[str] = None
    timestamp: Optional[str] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = Field(None, alias="acknowledgedBy")
    acknowledged_at: Optional[str] = Field(None, alias="acknowledgedAt")
    silenced: bool = False
    silence_until: Optional[str] = Field(None, alias="silenceUntil")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class SiteConfig(BaseModel):
    """站点配置"""
    route_policy: str = Field(..., alias="routePolicy")
    qos_policy: str = Field(..., alias="qosPolicy")
    priority: str = Field(..., description="优先级: high/medium/low")
    sla_latency: float = Field(..., alias="slaLatency")
    sla_loss: float = Field(..., alias="slaLoss")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class HistoryPoint(BaseModel):
    """历史数据点"""
    time: str
    latency: float
    loss: float
    bandwidth: float
    jitter: float = 0
    throughput: float = 0


# ============================================================
#  站点相关 Schemas
# ============================================================

class SiteBase(BaseModel):
    """站点基础 Schema"""
    name: str = Field(..., min_length=2, max_length=50, description="站点编码")
    display_name: str = Field(..., max_length=100, alias="displayName", description="站点显示名")
    region: str = Field(..., description="区域: CN/SG/US/EU")
    site_type: str = Field("branch", description="类型: hq/branch/cloud")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class WanInterfaceConfig(BaseModel):
    """创建站点时配置的 WAN 接口"""
    name: str = Field(..., description="接口名称，如 WAN1/WAN2")
    interface_type: str = Field("WAN", description="接口类型")
    ip_address: Optional[str] = Field(None, description="IP地址")
    subnet_mask: Optional[str] = Field("255.255.255.0", description="子网掩码")
    gateway: Optional[str] = Field(None, description="网关")
    speed: Optional[str] = Field("1Gbps", description="速率")


class SiteCreate(SiteBase):
    """创建站点 Schema"""
    status: str = "online"
    latency: float = 0
    loss: float = 0
    bandwidth_usage: float = 0
    bandwidth_used: str = "0Mbps"
    bandwidth_total: str = "100Mbps"
    device_model: str = "vEdge-1000"
    device_version: str = "20.3.1"
    uptime: str = "0天"
    route_policy: str = "SLA优先"
    qos_policy: str = "标准QoS"
    priority: str = "medium"
    sla_latency: float = 50
    sla_loss: float = 0.1
    address: Optional[str] = Field(None, max_length=200, description="站点地址")
    manager: Optional[str] = Field(None, max_length=50, description="负责人")
    serial_number: Optional[str] = Field(None, max_length=50, description="CPE序列号")
    management_ip: Optional[str] = Field(None, max_length=50, description="管理IP")
    lat: Optional[float] = None
    lng: Optional[float] = None
    wan_interfaces: Optional[List[WanInterfaceConfig]] = None
    device_ids: Optional[List[str]] = Field(None, alias="deviceIds", description="绑定的设备ID列表")


class SiteUpdate(BaseModel):
    """更新站点 Schema（部分更新）"""
    display_name: Optional[str] = Field(None, max_length=100, alias="displayName")
    status: Optional[str] = None
    latency: Optional[float] = None
    loss: Optional[float] = None
    bandwidth_usage: Optional[float] = None
    bandwidth_used: Optional[str] = None
    bandwidth_total: Optional[str] = None
    device_model: Optional[str] = None
    device_version: Optional[str] = None
    uptime: Optional[str] = None
    route_policy: Optional[str] = None
    qos_policy: Optional[str] = None
    priority: Optional[str] = None
    sla_latency: Optional[float] = None
    sla_loss: Optional[float] = None
    address: Optional[str] = None
    manager: Optional[str] = None
    serial_number: Optional[str] = None
    management_ip: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    site_type: Optional[str] = None
    device_ids: Optional[List[str]] = Field(None, alias="deviceIds", description="绑定的设备ID列表")

    model_config = ConfigDict(populate_by_name=True)


class Site(SiteBase):
    """站点响应 Schema"""
    id: str
    status: str
    latency: float
    loss: float
    bandwidth_usage: float = Field(..., alias="bandwidthUsage")
    bandwidth_total: str = Field(..., alias="bandwidthTotal")
    bandwidth_used: str = Field(..., alias="bandwidthUsed")
    device_model: str = Field(..., alias="deviceModel")
    device_version: str = Field(..., alias="deviceVersion")
    uptime: str
    links: List[SiteLink]
    active_link_id: str = Field("", alias="activeLinkId")
    active_wan_link_id: Optional[str] = Field(None, alias="activeWanLinkId", description="主WAN链路ID")
    backup_link_ids: Optional[str] = Field(None, alias="backupLinkIds", description="备用链路ID列表（JSON）")
    config: SiteConfig
    alerts: List[SiteAlert]
    address: Optional[str] = None
    manager: Optional[str] = None
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    management_ip: Optional[str] = Field(None, alias="managementIp")
    site_type: Optional[str] = Field("", alias="siteType")
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True, from_attributes=True)


# ============================================================
#  统计相关 Schemas
# ============================================================

class SiteStats(BaseModel):
    """站点统计信息"""
    total: int
    online: int
    offline: int
    warning: int
    alert_count: int = Field(..., alias="alertCount")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# ============================================================
#  批量操作相关 Schemas
# ============================================================

class BatchActionRequest(BaseModel):
    """批量操作请求"""
    action: str = Field(..., description="操作类型: restart/switchLink/upgradeConfig")
    site_ids: List[str] = Field(..., min_length=1, alias="siteIds")

    model_config = ConfigDict(populate_by_name=True)


class BatchTaskResponse(BaseModel):
    """批量操作任务响应"""
    task_id: str = Field(..., alias="taskId")
    action: str
    total_count: int = Field(..., alias="totalCount")
    status: str
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class BatchTaskResultItem(BaseModel):
    """批量操作单个站点结果"""
    site_id: str = Field(..., alias="siteId")
    site_name: str = Field(..., alias="siteName")
    status: str
    error: Optional[str] = None
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class BatchTaskStatus(BaseModel):
    """批量操作任务状态"""
    task_id: str = Field(..., alias="taskId")
    action: str
    total_count: int = Field(..., alias="totalCount")
    completed_count: int = Field(..., alias="completedCount")
    success_count: int = Field(..., alias="successCount")
    failed_count: int = Field(..., alias="failedCount")
    status: str
    results: List[BatchTaskResultItem]
    created_at: datetime = Field(..., alias="createdAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# ============================================================
#  链路切换相关 Schemas
# ============================================================

class LinkSwitchRequest(BaseModel):
    """链路切换请求"""
    link_id: str = Field(..., alias="linkId")

    model_config = ConfigDict(populate_by_name=True)


class LinkSwitchResponse(BaseModel):
    """链路切换响应"""
    success: bool
    message: str
    previous_link_id: Optional[str] = Field(None, alias="previousLinkId")
    new_link_id: str = Field(..., alias="newLinkId")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# ============================================================
#  告警操作相关 Schemas
# ============================================================

class AlertAcknowledgeRequest(BaseModel):
    """告警确认请求"""
    operator: str = Field(..., description="确认人")
    remark: Optional[str] = None


class AlertSilenceRequest(BaseModel):
    """告警静默请求"""
    duration_minutes: int = Field(..., ge=1, le=1440, alias="durationMinutes", description="静默时长（分钟）")

    model_config = ConfigDict(populate_by_name=True)


class AlertAcknowledgeResponse(BaseModel):
    """告警确认响应"""
    success: bool
    message: str
    acknowledged_at: Optional[str] = Field(None, alias="acknowledgedAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# ============================================================
#  导出相关 Schemas
# ============================================================

class SiteExportRequest(BaseModel):
    """站点导出请求"""
    region: Optional[str] = None
    status: Optional[str] = None
    search: Optional[str] = None
    link_type: Optional[str] = Field(None, alias="linkType")
    format: str = "csv"
    include_alerts: bool = Field(False, alias="includeAlerts")
    include_links: bool = Field(True, alias="includeLinks")

    model_config = ConfigDict(populate_by_name=True)


# ============================================================
#  分页相关 Schemas
# ============================================================

# 使用通用分页响应模型
PaginatedSites = PaginatedResponse[Site]