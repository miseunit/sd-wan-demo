"""
角色管理 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db import get_db
from app.models.role import Role

router = APIRouter(prefix="/roles", tags=["角色管理"])


class RoleCreate(BaseModel):
    """创建角色"""
    name: str
    display_name: str
    description: str = ""
    permissions: str = "[]"


class RoleUpdate(BaseModel):
    """更新角色"""
    display_name: str = None
    description: str = None
    permissions: str = None


class RoleResponse(BaseModel):
    """角色响应"""
    id: int
    name: str
    display_name: str
    description: str
    permissions: str
    is_system: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    """获取角色列表"""
    return db.query(Role).all()


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db)):
    """获取角色详情"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    return role


@router.post("/", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    """创建角色"""
    existing = db.query(Role).filter(Role.name == role.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="角色名已存在")

    db_role = Role(**role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """更新角色"""
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="角色不存在")
    if db_role.is_system:
        raise HTTPException(status_code=403, detail="系统角色不能修改")

    update_data = role.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_role, key, value)

    db.commit()
    db.refresh(db_role)
    return db_role


@router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """删除角色"""
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="角色不存在")
    if db_role.is_system:
        raise HTTPException(status_code=403, detail="系统角色不能删除")

    db.delete(db_role)
    db.commit()
    return {"message": "删除成功"}
