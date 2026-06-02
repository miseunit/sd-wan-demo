"""
用户相关的 API 路由
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.db import get_db
from app.models.user import User as UserModel
from app.schemas.user import User, UserCreate, UserUpdate, UserLogin, PaginatedUsers
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_access_token
)

router = APIRouter(prefix="/users", tags=["用户管理"])

# OAuth2 密码模式
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/users/login")


@router.post("/login", summary="用户登录")
def login(
    user_credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    用户登录

    - **username**: 用户名
    - **password**: 密码

    返回访问令牌和刷新令牌
    """
    # 查找用户
    user = db.query(UserModel).filter(
        UserModel.username == user_credentials.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    # 验证 password
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    # 检查用户是否激活
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )

    # 创建令牌
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id}
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )

    # 更新登录时间
    user.updated_at = datetime.utcnow()

    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 1800,  # 30分钟
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser
        }
    }


@router.post("/register", response_model=User, status_code=201, summary="用户注册")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    用户注册

    - **username**: 用户名（3-50字符）
    - **email**: 邮箱地址
    - **password**: 密码（至少6字符）
    - **full_name**: 全名（可选）
    """
    # 检查用户名是否已存在
    db_user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    # 检查邮箱是否已存在
    db_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被使用"
        )

    # 密码加密
    hashed_password = get_password_hash(user_data.password)

    # 创建新用户
    new_user = UserModel(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name or user_data.username
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/me", summary="获取当前用户信息")
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    获取当前登录用户信息
    """
    try:
        payload = decode_access_token(token)
        user_id: int = payload.get("user_id")

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser,
            "is_active": user.is_active
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", summary="刷新访问令牌")
def refresh_token(
    refresh_token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    使用刷新令牌获取新的访问令牌

    - **refresh_token**: 刷新令牌

    返回新的访问令牌
    """
    try:
        # 解码刷新令牌
        payload = decode_access_token(refresh_token)
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        # 验证用户是否存在且激活
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新令牌"
            )

        # 创建新的访问令牌
        new_access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id}
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": 1800  # 30分钟
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("", response_model=PaginatedUsers, summary="获取用户列表（分页）")
def get_users(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    db: Session = Depends(get_db),
):
    """
    获取用户列表（分页）

    - **page**: 页码（从1开始，默认第1页）
    - **pageSize**: 每页记录数（默认10，最大500）
    """
    # 获取总数
    total = db.query(UserModel).count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    users = db.query(UserModel).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedUsers(
        items=users,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )
