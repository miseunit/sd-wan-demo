"""
WAN 链路管理数据模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship

from app.db import Base


class WanLink(Base):
    """WAN 链路表"""
    __tablename__ = "wan_links"

    id = Column(String(50), primary_key=True, comment="链路ID")
    name = Column(String(100), nullable=False, comment="链路名称，如 MPLS-BJ-1、ge0/1、至总部隧道")
    type = Column(String(20), nullable=False, index=True, comment="链路类型: MPLS/Internet/5G/LTE")
    link_category = Column(String(20), nullable=False, default="wan", index=True,
                           comment="链路类别: wan(物理链路)/overlay(隧道链路)")
    site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True, comment="所属站点ID")
    site_name = Column(String(100), nullable=False, comment="所属站点显示名")
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=True, index=True, comment="所属设备ID")
    device_name = Column(String(100), comment="所属设备名称（冗余）")

    # 来源信息（接口或隧道）
    source_type = Column(String(20), index=True, comment="来源类型: interface(接口)/tunnel(隧道)")
    source_id = Column(Integer, comment="来源ID（接口ID或隧道ID）")

    # 接口信息（WAN 链路专用）
    interface_name = Column(String(50), comment="接口名称，如 ge0/1、lte0、vlan100")
    interface_type = Column(String(20), comment="接口类型: physical/logical/virtual")

    # 隧道信息（Overlay 链路专用）
    tunnel_name = Column(String(100), comment="隧道名称")
    peer_device_id = Column(String(50), comment="对端设备ID")
    peer_site_id = Column(String(50), comment="对端站点ID")
    peer_site_name = Column(String(100), comment="对端站点名称")

    # 运营商信息
    isp = Column(String(100), comment="ISP 运营商")

    # 状态信息
    health_status = Column(String(20), nullable=False, default="healthy", index=True,
                           comment="健康状态: healthy/degraded/down")
    active_status = Column(String(20), nullable=False, default="standby",
                           comment="使用状态: active/standby/down")
    ip = Column(String(50), comment="IP 地址")
    local_ip = Column(String(50), comment="本地IP（隧道专用）")
    peer_ip = Column(String(50), comment="对端IP（隧道专用）")

    # 性能指标
    latency = Column(Float, default=0, comment="延迟(ms)")
    loss = Column(Float, default=0, comment="丢包率(%)")
    jitter = Column(Float, default=0, comment="抖动(ms)")
    bandwidth = Column(Float, default=0, comment="总带宽(Mbps)")
    used_bandwidth = Column(Float, default=0, comment="已用带宽(Mbps)")
    utilization = Column(Float, default=0, comment="利用率(%)")
    sla_score = Column(Float, default=100, comment="SLA 评分(0-100)")

    # 策略信息
    switch_policy = Column(String(30), default="mpls-priority",
                           comment="切换策略: mpls-priority/internet-fallback/load-balance/cost-optimize")
    monthly_cost = Column(Float, default=0, comment="月成本(元)")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    switch_events = relationship("LinkSwitchEvent", back_populates="link", cascade="all, delete-orphan")
    alerts = relationship("LinkAlert", back_populates="link", cascade="all, delete-orphan")


class LinkSwitchEvent(Base):
    """链路切换事件表"""
    __tablename__ = "link_switch_events"

    id = Column(String(50), primary_key=True, comment="事件ID")
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=False, index=True)
    time = Column(String(30), nullable=False, comment="切换时间")
    from_link = Column(String(100), comment="从哪条链路切走")
    to_link = Column(String(100), comment="切到哪条链路")
    reason = Column(Text, comment="切换原因")

    link = relationship("WanLink", back_populates="switch_events")


class LinkAlert(Base):
    """链路告警表"""
    __tablename__ = "link_alerts"

    id = Column(String(50), primary_key=True, comment="告警ID")
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=False, index=True)
    severity = Column(String(20), nullable=False, comment="严重级别: critical/major/minor")
    category = Column(String(30), comment="告警类别: link-down/sla-breach/auto-switch/quality-degrade")
    title = Column(String(200), nullable=False, comment="告警标题")
    reason = Column(Text, comment="告警原因")
    timestamp = Column(String(30), comment="告警时间")
    resolved = Column(Boolean, default=False, comment="是否已解决")

    link = relationship("WanLink", back_populates="alerts")
