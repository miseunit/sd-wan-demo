"""
批量操作任务模型
用于追踪批量站点操作的执行状态和结果
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship

from app.db import Base


class BatchTask(Base):
    """批量操作任务表"""
    __tablename__ = "batch_tasks"

    id = Column(String(50), primary_key=True, comment="任务ID（UUID）")
    action = Column(String(50), nullable=False, comment="操作类型: restart/switchLink/upgradeConfig")
    site_ids = Column(Text, nullable=False, comment="站点ID列表（JSON数组）")
    status = Column(String(20), nullable=False, default="pending", comment="状态: pending/running/completed/failed")
    created_by = Column(String(50), comment="创建人")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    error = Column(Text, comment="错误信息")

    results = relationship("BatchTaskResult", back_populates="task", cascade="all, delete-orphan")


class BatchTaskResult(Base):
    """批量操作单个站点结果表"""
    __tablename__ = "batch_task_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("batch_tasks.id"), nullable=False, index=True, comment="关联任务ID")
    site_id = Column(String(50), nullable=False, comment="站点ID")
    site_name = Column(String(100), comment="站点名称（冗余字段）")
    status = Column(String(20), nullable=False, comment="状态: success/failed/pending")
    error = Column(Text, comment="错误信息")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    task = relationship("BatchTask", back_populates="results")
