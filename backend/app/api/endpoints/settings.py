"""
系统设置 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db import get_db
from app.models.system_setting import SystemSetting

router = APIRouter(prefix="/settings", tags=["系统设置"])


class SettingCreate(BaseModel):
    """创建系统配置"""
    key: str
    value: str
    category: str
    description: str = ""


class SettingUpdate(BaseModel):
    """更新系统配置"""
    value: str


class SettingResponse(BaseModel):
    """系统配置响应"""
    key: str
    value: str
    category: str
    description: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[SettingResponse])
def get_settings(category: str = None, db: Session = Depends(get_db)):
    """获取系统配置列表"""
    query = db.query(SystemSetting)
    if category:
        query = query.filter(SystemSetting.category == category)
    return query.all()


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    """获取单个配置"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="配置不存在")
    return setting


@router.post("/", response_model=SettingResponse)
def create_setting(setting: SettingCreate, db: Session = Depends(get_db)):
    """创建系统配置"""
    existing = db.query(SystemSetting).filter(SystemSetting.key == setting.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="配置键已存在")

    db_setting = SystemSetting(**setting.model_dump())
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, setting: SettingUpdate, db: Session = Depends(get_db)):
    """更新系统配置"""
    db_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="配置不存在")

    db_setting.value = setting.value
    db.commit()
    db.refresh(db_setting)
    return db_setting


@router.delete("/{key}")
def delete_setting(key: str, db: Session = Depends(get_db)):
    """删除系统配置"""
    db_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="配置不存在")

    db.delete(db_setting)
    db.commit()
    return {"message": "删除成功"}
