"""
网络诊断数据模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from app.db import Base


class PingHistory(Base):
    """Ping 历史记录表"""
    __tablename__ = "ping_history"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True, comment="设备ID")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, comment="测试时间")

    # 目标信息
    target = Column(String(255), nullable=False, comment="目标IP或域名")

    # 结果状态
    is_alive = Column(Boolean, nullable=False, comment="是否在线")

    # 数据包统计
    packets_sent = Column(Integer, nullable=False, comment="发送包数")
    packets_received = Column(Integer, nullable=False, comment="接收包数")
    packet_loss = Column(Float, default=0, comment="丢包率(%)")

    # 延迟统计
    min_rtt = Column(Float, comment="最小延迟(ms)")
    max_rtt = Column(Float, comment="最大延迟(ms)")
    avg_rtt = Column(Float, comment="平均延迟(ms)")
    jitter = Column(Float, comment="抖动(ms)")

    # 测试参数
    count = Column(Integer, comment="测试包数")
    interval = Column(Float, comment="发送间隔(秒)")
    timeout = Column(Float, comment="超时时间(秒)")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")


class TracerouteHistory(Base):
    """Traceroute 历史记录表"""
    __tablename__ = "traceroute_history"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    device_id = Column(String(50), ForeignKey("devices.id"), nullable=False, index=True, comment="设备ID")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, comment="测试时间")

    # 目标信息
    destination = Column(String(255), nullable=False, comment="目标IP或域名")

    # 结果状态
    reached = Column(Boolean, nullable=False, comment="是否到达目标")
    total_hops = Column(Integer, comment="总跳数")

    # 跳数信息 (JSON格式存储)
    hops = Column(JSON, comment="每跳信息列表")

    # 测试参数
    max_hops = Column(Integer, comment="最大跳数")
    timeout = Column(Float, comment="超时时间(秒)")

    # 异常标记
    has_timeout = Column(Boolean, default=False, comment="是否有超时跳数")
    timeout_hop = Column(Integer, comment="第一个超时跳数")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")


class LinkProbeHistory(Base):
    """链路探测历史记录表"""
    __tablename__ = "link_probe_history"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=False, index=True, comment="链路ID")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, comment="探测时间")

    # 目标信息
    target = Column(String(255), nullable=False, comment="目标IP或域名")

    # 质量指标
    latency = Column(Float, comment="延迟(ms)")
    packet_loss = Column(Float, default=0, comment="丢包率(%)")
    jitter = Column(Float, comment="抖动(ms)")

    # 带宽相关
    bandwidth_total = Column(Float, comment="总带宽(Mbps)")
    bandwidth_used = Column(Float, comment="已用带宽(Mbps)")
    bandwidth_utilization = Column(Float, comment="带宽利用率(%)")

    # SLA 评分
    sla_score = Column(Float, comment="SLA评分(0-100)")

    # 健康状态
    health_status = Column(String(20), comment="健康状态: healthy/degraded/down")

    # 探测类型
    probe_type = Column(String(20), default="periodic", comment="探测类型: periodic/manual")

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
