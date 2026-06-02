"""
策略相关的 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field
from app.schemas.response import PaginatedResponse


VALID_TYPES = ("route", "qos", "app_aware", "security")
VALID_STATUSES = ("active", "inactive", "draft")

TYPE_LABELS = {
    "route": "路由策略",
    "qos": "QoS 策略",
    "app_aware": "应用感知策略",
    "security": "安全策略",
}

STATUS_LABELS = {
    "active": "启用",
    "inactive": "禁用",
    "draft": "草稿",
}


class PolicyBase(BaseModel):
    """策略基础 Schema"""
    name: str = Field(..., min_length=2, max_length=100, description="策略名称")
    type: str = Field(..., description="策略类型: route/qos/app_aware/security")
    priority: int = Field(100, ge=1, le=9999, description="优先级")
    description: Optional[str] = Field(None, max_length=500, description="策略描述")
    match_conditions: Optional[Union[dict, list]] = Field(None, description="匹配条件（JSON 对象或数组）")
    action_config: Optional[Union[dict, list]] = Field(None, description="动作配置（JSON 对象或数组）")
    applied_sites: Optional[List[str]] = Field(None, description="应用的站点ID列表")


class PolicyCreate(PolicyBase):
    """创建策略 Schema"""
    pass


class PolicyUpdate(BaseModel):
    """更新策略 Schema（所有字段可选）"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    type: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=9999)
    description: Optional[str] = Field(None, max_length=500)
    match_conditions: Optional[Union[dict, list]] = None
    action_config: Optional[Union[dict, list]] = None
    applied_sites: Optional[List[str]] = None


class PolicyInDB(PolicyBase):
    """数据库中的策略 Schema"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Policy(PolicyInDB):
    """返回给前端的策略 Schema"""
    pass


class PolicyStatusUpdate(BaseModel):
    """策略状态切换 Schema"""
    status: str = Field(..., description="目标状态: active/inactive")


# 分页响应类型别名
PaginatedPolicies = PaginatedResponse[Policy]
