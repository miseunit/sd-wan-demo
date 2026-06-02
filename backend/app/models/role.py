"""
角色模型（RBAC）
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db import Base

class Role(Base):
    """角色表"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="角色ID")
    name = Column(String(50), unique=True, nullable=False, index=True, comment="角色名: admin/operator/viewer")
    display_name = Column(String(100), nullable=False, comment="显示名称")
    description = Column(Text, comment="角色描述")
    permissions = Column(Text, comment="权限列表（JSON数组）")
    is_system = Column(Boolean, default=False, comment="是否系统角色")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
