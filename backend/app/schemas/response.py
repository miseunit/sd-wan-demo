"""
统一响应格式模型
所有 API 接口统一返回 {code, message, data} 结构
"""
from typing import Any, Generic, Optional, TypeVar, List
from pydantic import BaseModel, Field
from pydantic import ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int
    message: str
    data: Optional[T] = None


# ============================================================
#  分页响应模型（通用）
# ============================================================

class PaginatedResponse(BaseModel, Generic[T]):
    """
    通用分页响应模型
    所有分页接口统一返回此格式
    """
    items: List[T] = Field(..., description="当前页数据列表")
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码（从1开始）")
    pageSize: int = Field(..., alias="pageSize", description="每页记录数")
    totalPages: int = Field(..., alias="totalPages", description="总页数")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


def success(data: Any = None, message: str = "操作成功") -> dict:
    """
    构建成功响应

    Args:
        data: 实际数据
        message: 提示消息
    """
    return {
        "code": 200,
        "message": message,
        "data": data,
    }


def error(code: int = 500, message: str = "操作失败") -> dict:
    """
    构建错误响应

    Args:
        code: 错误码（使用 HTTP 状态码）
        message: 错误消息
    """
    return {
        "code": code,
        "message": message,
        "data": None,
    }


# 常用消息映射
SUCCESS_MESSAGES = {
    "GET": "获取成功",
    "POST": "创建成功",
    "PUT": "更新成功",
    "PATCH": "更新成功",
    "DELETE": "删除成功",
}