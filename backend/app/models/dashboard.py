"""
Dashboard 相关数据模型
站点间拓扑链路、应用 SLA、ISP 带宽统计
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey

from app.db import Base


class DashboardTopologyLink(Base):
    """站点间拓扑链路（Dashboard/拓扑图专用）"""
    __tablename__ = "dashboard_topology_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True)
    target_site_id = Column(String(50), ForeignKey("sites.id"), nullable=False, index=True)
    avg_latency = Column(Float, default=0, comment="平均延迟(ms)")
    packet_loss = Column(Float, default=0, comment="丢包率(%)")
    bandwidth = Column(String(20), comment="带宽")
    health = Column(String(20), default="good", comment="健康状态: good/warning/critical")
    status = Column(String(20), default="active", comment="状态: active/standby/down")


class ApplicationSla(Base):
    """应用 SLA 监控"""
    __tablename__ = "application_slas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, comment="应用名称")
    short_name = Column(String(20), comment="简称")
    availability = Column(Float, default=99.0, comment="可用性(%)")
    performance = Column(Float, default=99.0, comment="性能(%)")
    color = Column(String(20), default="#0078d4", comment="标识颜色")


class IspBandwidth(Base):
    """ISP 带宽统计"""
    __tablename__ = "isp_bandwidths"

    id = Column(Integer, primary_key=True, autoincrement=True)
    isp = Column(String(50), nullable=False, comment="ISP名称")
    short_name = Column(String(20), comment="简称")
    used_mbps = Column(Float, default=0, comment="已用带宽(Mbps)")
    total_mbps = Column(Float, default=100, comment="总带宽(Mbps)")
    color = Column(String(20), default="#00b4d8", comment="标识颜色")
