"""
设备管理 Pydantic Schemas
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.response import PaginatedResponse


# ========== 基础 Schemas ==========

class DeviceInterfaceBase(BaseModel):
    """设备接口基础"""
    name: str = Field(..., description="接口名称")
    interface_type: str = Field(..., description="接口类型: WAN/LAN/MPLS/Internet")
    status: str = Field("down", description="状态: up/down")
    speed: Optional[str] = Field(None, description="速率")
    mtu: int = Field(1500, description="MTU")
    ip_address: Optional[str] = Field(None, description="IP地址")
    subnet_mask: Optional[str] = Field(None, description="子网掩码")
    gateway: Optional[str] = Field(None, description="网关")
    packet_loss: float = Field(0, description="丢包率(%)")


class DeviceInterface(DeviceInterfaceBase):
    """设备接口响应"""
    id: int
    is_primary: bool = Field(False, description="是否为主链路")

    class Config:
        from_attributes = True


class DeviceTunnelBase(BaseModel):
    """设备隧道基础"""
    tunnel_name: str = Field(..., description="隧道名称")
    tunnel_type: str = Field(..., description="隧道类型: IPsec/GRE/VXLAN")
    peer_ip: Optional[str] = Field(None, description="对端IP")
    local_ip: Optional[str] = Field(None, description="本地IP")
    status: str = Field("down", description="状态: up/down/connecting")
    uptime: Optional[str] = Field(None, description="运行时长")
    tx_bytes: int = Field(0, description="发送字节数")
    rx_bytes: int = Field(0, description="接收字节数")
    tx_pps: float = Field(0, description="发送包/秒")
    rx_pps: float = Field(0, description="接收包/秒")


class DeviceTunnel(DeviceTunnelBase):
    """设备隧道响应"""
    id: int
    is_primary: bool = Field(False, description="是否为主链路")

    class Config:
        from_attributes = True


class DeviceAlertBase(BaseModel):
    """设备告警基础"""
    alert_type: str = Field(..., description="告警类型")
    severity: str = Field(..., description="严重级别: critical/major/minor")
    title: str = Field(..., description="告警标题")
    description: Optional[str] = Field(None, description="告警描述")


class DeviceAlert(DeviceAlertBase):
    """设备告警响应"""
    id: int
    device_id: str
    resolved: bool = Field(False, description="是否已解决")
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeviceUpgradeBase(BaseModel):
    """设备升级基础"""
    from_version: str = Field(..., description="源版本")
    to_version: str = Field(..., description="目标版本")
    status: str = Field("pending", description="状态: pending/downloading/installing/success/failed/rollback")
    progress: float = Field(0, ge=0, le=100, description="进度(%)")


class DeviceUpgrade(DeviceUpgradeBase):
    """设备升级响应"""
    id: int
    device_id: str
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== 主设备 Schemas ==========

class DeviceBase(BaseModel):
    """设备基础"""
    name: str = Field(..., description="设备名称")
    device_type: str = Field(..., description="设备类型: Edge/Gateway/CPE")
    site_id: Optional[str] = Field(None, description="所属站点ID")
    role: str = Field("standby", description="设备角色: active/standby")
    session_count: int = Field(0, description="当前会话数")


class DeviceCreate(DeviceBase):
    """创建设备"""
    site_name: Optional[str] = None
    firmware_version: str = Field("20.3.1", description="固件版本")
    serial_number: Optional[str] = Field(None, description="设备序列号")
    management_ip: Optional[str] = Field(None, description="管理IP")
    mac_address: Optional[str] = Field(None, description="MAC地址")


class DeviceUpdate(BaseModel):
    """更新设备"""
    name: Optional[str] = None
    device_type: Optional[str] = None
    site_id: Optional[str] = None
    current_policy: Optional[str] = None
    config_version: Optional[str] = None


class Device(DeviceBase):
    """设备响应"""
    id: str
    site_name: Optional[str] = None

    # 在线状态
    online_status: str
    heartbeat_status: str
    last_online: Optional[datetime]

    # 资源状态
    cpu_usage: float
    memory_usage: float
    temperature: Optional[float]
    bandwidth_usage: float

    # 配置状态
    config_version: str
    current_policy: Optional[str]
    sync_status: str
    sync_error: Optional[str]

    # 升级状态
    firmware_version: str
    upgrade_status: str
    upgrade_progress: float
    can_upgrade: bool
    target_version: Optional[str]

    # 健康评分
    health_score: int

    # 设备角色和会话
    role: str = Field("standby", description="设备角色: active/standby")
    session_count: int = Field(0, description="当前会话数")

    # 设备绑定信息
    serial_number: Optional[str] = None
    management_ip: Optional[str] = None
    mac_address: Optional[str] = None
    bind_status: str = Field("unbound", description="绑定状态: bound/unbound")
    bound_at: Optional[datetime] = None

    # 时间戳
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceDetail(Device):
    """设备详情（含关联数据）"""
    interfaces: List[DeviceInterface] = []
    tunnels: List[DeviceTunnel] = []
    alerts: List[DeviceAlert] = []
    upgrade_history: List[DeviceUpgrade] = []


class DeviceStats(BaseModel):
    """设备统计"""
    total: int = Field(0, description="总设备数")
    online: int = Field(0, description="在线设备数")
    offline: int = Field(0, description="离线设备数")
    healthy: int = Field(0, description="健康设备数(评分>=80)")
    warning: int = Field(0, description="告警设备数(评分60-79)")
    critical: int = Field(0, description="严重设备数(评分<60)")
    upgrading: int = Field(0, description="升级中设备数")


class DeviceListResponse(BaseModel):
    """设备列表响应（已弃用，请使用 PaginatedDevices）"""
    items: List[Device]
    total: int
    stats: DeviceStats


# ========== 操作 Schemas ==========

class DeviceAction(BaseModel):
    """设备操作"""
    action: str = Field(..., description="操作类型: restart/sync_config/start_upgrade/rollback")
    params: Optional[dict] = Field(None, description="操作参数")


class DeviceActionResponse(BaseModel):
    """设备操作响应"""
    success: bool
    message: str
    task_id: Optional[str] = None


# ========== 分页响应类型 ==========

# 使用通用分页响应模型
PaginatedDevices = PaginatedResponse[Device]
