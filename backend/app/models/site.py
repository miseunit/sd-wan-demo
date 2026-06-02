"""
站点、链路、告警、历史数据模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship

from app.db import Base


class Site(Base):
    """站点表"""
    __tablename__ = "sites"

    id = Column(String(50), primary_key=True, comment="站点ID")
    name = Column(String(50), unique=True, nullable=False, index=True, comment="站点编码")
    display_name = Column(String(100), nullable=False, comment="站点显示名")
    region = Column(String(10), nullable=False, index=True, comment="区域: CN/SG/US/EU")
    status = Column(String(20), nullable=False, default="online", index=True, comment="状态: online/offline/warning")
    latency = Column(Float, default=0, comment="延迟(ms)")
    loss = Column(Float, default=0, comment="丢包率(%)")
    bandwidth_usage = Column(Float, default=0, comment="带宽使用率(%)")
    bandwidth_used = Column(String(20), default="0Mbps", comment="已用带宽")
    bandwidth_total = Column(String(20), default="100Mbps", comment="总带宽")
    active_link_id = Column(Integer, ForeignKey("site_links.id"), comment="当前活跃链路ID")
    active_wan_link_id = Column(String(50), comment="主WAN链路ID（关联wan_links.id）")
    backup_link_ids = Column(Text, comment="备用链路ID列表（JSON数组，关联wan_links.id）")
    device_model = Column(String(50), default="vEdge-1000", comment="设备型号")
    device_version = Column(String(20), default="20.3.1", comment="设备版本")
    uptime = Column(String(50), default="0天", comment="运行时长")
    route_policy = Column(String(50), default="SLA优先", comment="路由策略")
    qos_policy = Column(String(50), default="标准QoS", comment="QoS策略")
    priority = Column(String(20), default="medium", comment="优先级: high/medium/low")
    sla_latency = Column(Float, default=50, comment="SLA延迟阈值(ms)")
    sla_loss = Column(Float, default=0.1, comment="SLA丢包阈值(%)")
    lat = Column(Float, comment="纬度")
    lng = Column(Float, comment="经度")
    site_type = Column(String(20), default="branch", comment="类型: hq/branch/cloud")
    cloud_provider = Column(String(20), comment="云提供商: AWS/Azure/GCP")
    address = Column(String(200), comment="站点地址")
    manager = Column(String(50), comment="负责人")
    serial_number = Column(String(50), comment="CPE序列号")
    management_ip = Column(String(50), comment="管理IP")
    sla = Column(Float, default=99.0, comment="SLA分数")
    active_tunnels = Column(Integer, default=0, comment="活跃隧道数")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    links = relationship("SiteLink", back_populates="site", cascade="all, delete-orphan",
                         foreign_keys="[SiteLink.site_id]")
    alerts = relationship("SiteAlert", back_populates="site", cascade="all, delete-orphan")
    history = relationship("SiteHistory", back_populates="site", cascade="all, delete-orphan")


class SiteLink(Base):
    """站点链路表"""
    __tablename__ = "site_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True)
    link_type = Column(String(20), nullable=False, comment="链路类型: MPLS/Internet/5G")
    isp = Column(String(100), comment="ISP名称")
    ip = Column(String(50), comment="链路IP")
    bandwidth = Column(String(20), comment="总带宽")
    used_bandwidth = Column(String(20), comment="已用带宽")
    usage_percent = Column(Float, default=0, comment="使用率(%)")
    latency = Column(Float, default=0, comment="延迟(ms)")
    loss = Column(Float, default=0, comment="丢包率(%)")
    status = Column(String(20), default="standby", comment="状态: active/standby/down")
    wan_link_id = Column(String(50), index=True, comment="对应 wan_links.id，用于双向同步")

    site = relationship("Site", back_populates="links",
                       foreign_keys=[site_id])


class SiteAlert(Base):
    """站点告警表"""
    __tablename__ = "site_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True)
    severity = Column(String(20), nullable=False, comment="严重级别: critical/major")
    title = Column(String(200), nullable=False, comment="告警标题")
    reason = Column(Text, comment="告警原因")
    timestamp = Column(String(30), comment="告警时间")
    acknowledged = Column(Boolean, default=False, comment="是否已确认")
    acknowledged_by = Column(String(50), comment="确认人")
    acknowledged_at = Column(String(30), comment="确认时间")
    silenced = Column(Boolean, default=False, comment="是否已静默")
    silence_until = Column(String(30), comment="静默截止时间")

    site = relationship("Site", back_populates="alerts")


class SiteHistory(Base):
    """站点历史数据表"""
    __tablename__ = "site_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True)
    time_range = Column(String(10), nullable=False, comment="时间范围: 5min/1hour/24hour")
    time = Column(String(10), comment="时间点")
    latency = Column(Float, default=0)
    loss = Column(Float, default=0)
    bandwidth = Column(Float, default=0)
    jitter = Column(Float, default=0, comment="抖动(ms)")
    throughput = Column(Float, default=0, comment="吞吐量(Mbps)")

    site = relationship("Site", back_populates="history")