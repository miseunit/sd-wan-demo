"""
策略相关的 API 路由
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.policy import Policy as PolicyModel
from app.schemas.policy import (
    Policy, PolicyCreate, PolicyUpdate, PolicyStatusUpdate,
    VALID_TYPES, VALID_STATUSES, PaginatedPolicies,
)

router = APIRouter(prefix="/policies", tags=["策略管理"])


@router.post("/", response_model=Policy, summary="创建策略")
def create_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    """
    创建新策略

    - **name**: 策略名称（2-100字符，唯一）
    - **type**: 策略类型（route/qos/app_aware/security）
    - **priority**: 优先级（1-9999，数字越小越优先）
    - **description**: 策略描述（可选）
    - **match_conditions**: 匹配条件 JSON（可选）
    - **action_config**: 动作配置 JSON（可选）
    - **applied_sites**: 应用的站点ID列表（可选）
    """
    # 校验策略类型
    if policy.type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的策略类型，允许值: {', '.join(VALID_TYPES)}"
        )

    # 检查策略名是否已存在
    existing = db.query(PolicyModel).filter(PolicyModel.name == policy.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="策略名称已存在"
        )

    # 序列化 JSON 字段
    new_policy = PolicyModel(
        name=policy.name,
        type=policy.type,
        priority=policy.priority,
        description=policy.description,
        match_conditions=json.dumps(policy.match_conditions, ensure_ascii=False) if policy.match_conditions else None,
        action_config=json.dumps(policy.action_config, ensure_ascii=False) if policy.action_config else None,
        applied_sites=','.join(policy.applied_sites) if policy.applied_sites else '',
        status='draft',
    )

    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)

    return _format_policy(new_policy)


@router.get("/", response_model=PaginatedPolicies, summary="获取策略列表（分页）")
def get_policies(
    type: Optional[str] = Query(None, description="按类型筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    search: Optional[str] = Query(None, description="搜索策略名称"),
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    db: Session = Depends(get_db),
):
    """
    获取策略列表（分页）

    - **type**: 按类型筛选（route/qos/app_aware/security）
    - **status**: 按状态筛选（active/inactive/draft）
    - **search**: 搜索策略名称（模糊匹配）
    - **page**: 页码（从1开始，默认第1页）
    - **pageSize**: 每页记录数（默认10，最大500）
    """
    query = db.query(PolicyModel)

    if type:
        query = query.filter(PolicyModel.type == type)
    if status:
        query = query.filter(PolicyModel.status == status)
    if search:
        query = query.filter(PolicyModel.name.ilike(f"%{search}%"))

    # 获取总数
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    policies = query.order_by(PolicyModel.priority.asc(), PolicyModel.id.desc()).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedPolicies(
        items=[_format_policy(p) for p in policies],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/{policy_id}", response_model=Policy, summary="获取策略详情")
def get_policy(policy_id: int, db: Session = Depends(get_db)):
    """
    根据 ID 获取策略详情
    """
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="策略不存在"
        )
    return _format_policy(policy)


@router.put("/{policy_id}", response_model=Policy, summary="更新策略")
def update_policy(policy_id: int, policy_update: PolicyUpdate, db: Session = Depends(get_db)):
    """
    更新策略信息

    所有字段均为可选，仅更新传入的字段
    """
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="策略不存在"
        )

    update_data = policy_update.model_dump(exclude_unset=True)

    # 校验策略类型
    if 'type' in update_data and update_data['type'] not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的策略类型，允许值: {', '.join(VALID_TYPES)}"
        )

    # 检查名称唯一性
    if 'name' in update_data and update_data['name'] != policy.name:
        existing = db.query(PolicyModel).filter(PolicyModel.name == update_data['name']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="策略名称已存在"
            )

    # 序列化 JSON 字段和列表字段
    for field, value in update_data.items():
        if field in ('match_conditions', 'action_config') and value is not None:
            setattr(policy, field, json.dumps(value, ensure_ascii=False))
        elif field == 'applied_sites' and value is not None:
            setattr(policy, field, ','.join(value))
        else:
            setattr(policy, field, value)

    db.commit()
    db.refresh(policy)

    return _format_policy(policy)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除策略")
def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    """
    删除策略
    """
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="策略不存在"
        )

    db.delete(policy)
    db.commit()

    return None


@router.patch("/{policy_id}/status", response_model=Policy, summary="切换策略状态")
def toggle_policy_status(policy_id: int, status_update: PolicyStatusUpdate, db: Session = Depends(get_db)):
    """
    切换策略状态（启用/禁用）

    - **status**: 目标状态（active/inactive）
    """
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="策略不存在"
        )

    if status_update.status not in ('active', 'inactive'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="状态切换仅允许 active 或 inactive"
        )

    policy.status = status_update.status
    db.commit()
    db.refresh(policy)

    return _format_policy(policy)


def _format_policy(policy: PolicyModel) -> dict:
    """将数据库模型转换为响应字典（反序列化 JSON 字段）"""
    return {
        "id": policy.id,
        "name": policy.name,
        "type": policy.type,
        "status": policy.status,
        "priority": policy.priority,
        "description": policy.description,
        "match_conditions": json.loads(policy.match_conditions) if policy.match_conditions else None,
        "action_config": json.loads(policy.action_config) if policy.action_config else None,
        "applied_sites": policy.applied_sites.split(',') if policy.applied_sites else [],
        "created_at": policy.created_at,
        "updated_at": policy.updated_at,
    }
