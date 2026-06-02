"""
设备管理模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, BigInteger
)
from sqlalchemy.orm import relationship

from app.db import Base


class Device(Base):
    """设备表"""
    __tablename__ = "devices"

    id = Column(String(50), primary_key=True, comment="设备ID")
    name = Column(String(50), unique=True, nullable=False, index=True, comment="设备名称")
    device_type = Column(String(20), nullable=False, comment="设备类型: Edge/Gateway/CPE")
    site_id = Column(String(50), ForeignKey("sites.id"), nullable=True, index=True, comment="所属站点ID")
    site_name = Column(String(100), comment="所属站点名称（冗余，便于查询）")

    # 在线状态
    online_status = Column(String(20), nullable=False, default="offline", index=True, comment="在线状态: online/offline")
    heartbeat_status = Column(String(20), default="unknown", comment="心跳状态: ok/timeout/unknown")
    last_online = Column(DateTime, comment="最后在线时间")

    # 资源状态
    cpu_usage = Column(Float, default=0, comment="CPU使用率(%)")
    memory_usage = Column(Float, default=0, comment="内存使用率(%)")
    temperature = Column(Float, comment="温度(°C)")
    bandwidth_usage = Column(Float, default=0, comment="带宽占用(Mbps)")

    # 配置状态
    config_version = Column(String(50), default="1.0.0", comment="配置版本")
    current_policy = Column(String(100), comment="当前策略")
    sync_status = Column(String(20), default="synced", comment="同步状态: synced/pending/failed")
    sync_error = Column(Text, comment="同步错误信息")

    # 升级状态
    firmware_version = Column(String(50), default="20.3.1", comment="固件版本")
    upgrade_status = Column(String(20), default="none", comment="升级状态: none/downloading/installing/rollback/failed")
    upgrade_progress = Column(Float, default=0, comment="升级进度(%)")
    can_upgrade = Column(Boolean, default=False, comment="是否可升级")
    target_version = Column(String(50), comment="目标升级版本")

    # 健康评分
    health_score = Column(Integer, default=100, comment="健康评分(0-100)")

    # 设备角色和会话
    role = Column(String(20), default="standby", comment="设备角色: active(主设备)/standby(备设备)")
    session_count = Column(Integer, default=0, comment="当前会话数")

    # 设备绑定信息
    serial_number = Column(String(50), nullable=True, comment="设备序列号")
    management_ip = Column(String(50), nullable=True, comment="管理IP")
    mac_address = Column(String(20), nullable=True, comment="MAC地址")
    bind_status = Column(String(20), default="unbound", comment="绑定状态: bound/unbound")
    bound_at = Column(DateTime, comment="绑定时间")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    interfaces = relationship("DeviceInterface", back_populates="device", cascade="all, delete-orphan")
    tunnels = relationship("DeviceTunnel", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("DeviceAlert", back_populates="device", cascade="all, delete-orphan")
    upgrade_history = relationship("DeviceUpgrade", back_populates="device", cascade="all, delete-orphan")


class DeviceInterface(Base):
    """设备接口表"""
    __tablename__ = "device_interfaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False, comment="接口名称")
    interface_type = Column(String(20), nullable=False, comment="接口类型: WAN/LAN/MPLS/Internet")
    status = Column(String(20), default="down", comment="状态: up/down")
    speed = Column(String(20), comment="速率")
    mtu = Column(Integer, default=1500, comment="MTU")
    ip_address = Column(String(50), comment="IP地址")
    subnet_mask = Column(String(50), comment="子网掩码")
    gateway = Column(String(50), comment="网关")
    packet_loss = Column(Float, default=0, comment="丢包率(%)")
    is_primary = Column(Boolean, default=False, comment="是否为主链路")

    # 关联的链路ID（接口自动生成 WAN 链路）
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=True, index=True, comment="关联的链路ID")

    device = relationship("Device", back_populates="interfaces")


class DeviceTunnel(Base):
    """设备隧道表"""
    __tablename__ = "device_tunnels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True)
    tunnel_name = Column(String(100), nullable=False, comment="隧道名称")
    tunnel_type = Column(String(20), nullable=False, comment="隧道类型: IPsec/GRE/VXLAN")
    peer_ip = Column(String(50), comment="对端IP")
    local_ip = Column(String(50), comment="本地IP")
    status = Column(String(20), default="down", comment="状态: up/down/connecting")
    uptime = Column(String(50), comment="运行时长")
    tx_bytes = Column(BigInteger, default=0, comment="发送字节数")
    rx_bytes = Column(BigInteger, default=0, comment="接收字节数")
    tx_pps = Column(Float, default=0, comment="发送包/秒")
    rx_pps = Column(Float, default=0, comment="接收包/秒")
    is_primary = Column(Boolean, default=False, comment="是否为主链路")

    # 关联的链路ID（隧道自动生成 Overlay 链路）
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=True, index=True, comment="关联的链路ID")

    device = relationship("Device", back_populates="tunnels")


class DeviceAlert(Base):
    """设备告警表"""
    __tablename__ = "device_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False, comment="告警类型: device_down/cpu_high/tunnel_down/config_failed")
    severity = Column(String(20), nullable=False, comment="严重级别: critical/major/minor")
    title = Column(String(200), nullable=False, comment="告警标题")
    description = Column(Text, comment="告警描述")
    resolved = Column(Boolean, default=False, comment="是否已解决")
    created_at = Column(DateTime, default=datetime.utcnow, comment="告警时间")
    resolved_at = Column(DateTime, comment="解决时间")

    device = relationship("Device", back_populates="alerts")


class DeviceUpgrade(Base):
    """设备升级记录表"""
    __tablename__ = "device_upgrades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True)
    from_version = Column(String(50), nullable=False, comment="源版本")
    to_version = Column(String(50), nullable=False, comment="目标版本")
    status = Column(String(20), default="pending", comment="状态: pending/downloading/installing/success/failed/rollback")
    progress = Column(Float, default=0, comment="进度(%)")
    error_message = Column(Text, comment="错误信息")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")

    device = relationship("Device", back_populates="upgrade_history")
