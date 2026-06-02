"""
网络诊断相关的 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.response import PaginatedResponse


# ============= Ping 相关 Schemas =============

class PingRequest(BaseModel):
    """Ping 测试请求 Schema"""
    target: Optional[str] = Field(None, description="目标IP或域名，不传则使用设备IP")
    count: int = Field(default=5, ge=1, le=20, description="发送包数")
    interval: float = Field(default=1.0, ge=0.1, le=5.0, description="发送间隔(秒)")
    timeout: float = Field(default=2.0, ge=0.5, le=10.0, description="超时时间(秒)")
    packet_size: int = Field(default=32, ge=16, le=1472, description="数据包大小(字节)")


class PingResult(BaseModel):
    """Ping 测试结果 Schema"""
    id: int
    device_id: str
    target: str
    timestamp: datetime
    is_alive: bool
    packets_sent: int
    packets_received: int
    packet_loss: float
    min_rtt: Optional[float]
    max_rtt: Optional[float]
    avg_rtt: Optional[float]
    jitter: Optional[float]

    class Config:
        from_attributes = True


class PingHistoryList(PaginatedResponse[PingResult]):
    """Ping 历史记录分页响应"""
    pass


# ============= Traceroute 相关 Schemas =============

class TracerouteHop(BaseModel):
    """Traceroute 单跳信息 Schema"""
    hop_number: int = Field(..., description="跳数")
    ip: Optional[str] = Field(None, description="IP地址")
    hostname: Optional[str] = Field(None, description="主机名")
    rtt_list: List[float] = Field(default_factory=list, description="探测延迟列表(ms)")
    is_timeout: bool = Field(default=False, description="是否超时")
    status: str = Field(..., description="状态: success/timeout/filtered")


class TracerouteRequest(BaseModel):
    """Traceroute 测试请求 Schema"""
    destination: Optional[str] = Field(None, description="目标IP或域名，不传则使用设备IP")
    max_hops: int = Field(default=30, ge=5, le=64, description="最大跳数")
    timeout: float = Field(default=2.0, ge=0.5, le=10.0, description="超时时间(秒)")
    destination_port: int = Field(default=33434, ge=1024, le=65535, description="目标端口")


class TracerouteResult(BaseModel):
    """Traceroute 测试结果 Schema"""
    id: int
    device_id: str
    destination: str
    timestamp: datetime
    reached: bool
    total_hops: int
    hops: List[TracerouteHop]
    max_hops: int
    timeout: float
    has_timeout: bool
    timeout_hop: Optional[int]

    class Config:
        from_attributes = True


class TracerouteHistoryList(PaginatedResponse[TracerouteResult]):
    """Traceroute 历史记录分页响应"""
    pass


# ============= 链路探测相关 Schemas =============

class LinkProbeRequest(BaseModel):
    """链路探测请求 Schema"""
    link_ids: List[str] = Field(..., description="要探测的链路ID列表")
    interval: int = Field(default=5, ge=1, le=60, description="探测间隔(秒)")
    count: Optional[int] = Field(None, ge=1, le=100, description="探测次数，不传则持续探测")


class LinkProbeResult(BaseModel):
    """链路探测结果 Schema"""
    id: int
    link_id: str
    target: str
    timestamp: datetime
    latency: Optional[float]
    packet_loss: float
    jitter: Optional[float]
    bandwidth_total: Optional[float]
    bandwidth_used: Optional[float]
    bandwidth_utilization: Optional[float]
    sla_score: Optional[float]
    health_status: Optional[str]
    probe_type: str

    class Config:
        from_attributes = True


class LinkProbeHistoryList(PaginatedResponse[LinkProbeResult]):
    """链路探测历史记录分页响应"""
    pass


# ============= SLA 计算相关 =============

class SLAMetrics(BaseModel):
    """SLA 指标 Schema"""
    latency: float = Field(..., description="延迟(ms)")
    packet_loss: float = Field(..., description="丢包率(%)")
    jitter: float = Field(..., description="抖动(ms)")


class SLAScore(BaseModel):
    """SLA 评分结果 Schema"""
    sla_score: float = Field(..., description="SLA总分(0-100)")
    latency_score: float = Field(..., description="延迟得分")
    loss_score: float = Field(..., description="丢包得分")
    jitter_score: float = Field(..., description="抖动得分")
    health_status: str = Field(..., description="健康状态: healthy/degraded/down")


# ============= 批量诊断请求 =============

class BatchPingRequest(BaseModel):
    """批量 Ping 请求 Schema"""
    device_ids: List[str] = Field(..., description="设备ID列表")
    count: int = Field(default=5, ge=1, le=10, description="发送包数")
    timeout: float = Field(default=2.0, ge=0.5, le=10.0, description="超时时间(秒)")


class BatchPingResult(BaseModel):
    """批量 Ping 结果 Schema"""
    device_id: str
    device_name: str
    target: str
    success: bool
    is_alive: Optional[bool] = None
    error: Optional[str] = None
    avg_rtt: Optional[float] = None
    packet_loss: Optional[float] = None
