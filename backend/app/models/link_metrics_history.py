"""
链路历史监控数据模型
用于存储每条链路的性能指标历史数据
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.db import Base


class LinkMetricsHistory(Base):
    """链路历史监控数据表"""
    __tablename__ = "link_metrics_history"

    id = Column(String(50), primary_key=True, comment="记录ID")
    link_id = Column(String(50), ForeignKey("wan_links.id"), nullable=False, index=True, comment="链路ID")
    time_range = Column(String(20), nullable=False, index=True, comment="时间范围: 5min/1hour/24hour")
    timestamp = Column(DateTime, nullable=False, index=True, comment="数据时间戳")

    # 性能指标
    latency = Column(Float, default=0, comment="延迟(ms)")
    loss = Column(Float, default=0, comment="丢包率(%)")
    jitter = Column(Float, default=0, comment="抖动(ms)")
    bandwidth = Column(Float, default=0, comment="使用带宽(Mbps)")
    throughput = Column(Float, default=0, comment="吞吐量(Mbps)")

    # 元数据
    created_at = Column(DateTime, default=datetime.utcnow, comment="记录创建时间")

    # 关联关系
    link = relationship("WanLink", backref="metrics_history")

    # 复合索引，加快查询速度
    __table_args__ = (
        Index('idx_link_time_range', 'link_id', 'time_range'),
        Index('idx_link_timestamp', 'link_id', 'timestamp'),
    )
