"""
通知配置 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db import get_db
from app.models.notification_config import NotificationConfig

router = APIRouter(prefix="/notifications", tags=["通知配置"])


class NotificationConfigCreate(BaseModel):
    """创建通知配置"""
    name: str
    type: str
    config: str
    alert_types: str = "[]"


class NotificationConfigUpdate(BaseModel):
    """更新通知配置"""
    name: str = None
    config: str = None
    alert_types: str = None
    is_active: Optional[bool] = None


class NotificationConfigResponse(BaseModel):
    """通知配置响应"""
    id: int
    name: str
    type: str
    config: str
    alert_types: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[NotificationConfigResponse])
def get_notifications(type: Optional[str] = None, db: Session = Depends(get_db)):
    """获取通知配置列表"""
    query = db.query(NotificationConfig)
    if type:
        query = query.filter(NotificationConfig.type == type)
    return query.all()


@router.post("/", response_model=NotificationConfigResponse)
def create_notification(config: NotificationConfigCreate, db: Session = Depends(get_db)):
    """创建通知配置"""
    db_config = NotificationConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.put("/{config_id}", response_model=NotificationConfigResponse)
def update_notification(config_id: int, config: NotificationConfigUpdate, db: Session = Depends(get_db)):
    """更新通知配置"""
    db_config = db.query(NotificationConfig).filter(NotificationConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")

    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)

    db.commit()
    db.refresh(db_config)
    return db_config


@router.delete("/{config_id}")
def delete_notification(config_id: int, db: Session = Depends(get_db)):
    """删除通知配置"""
    db_config = db.query(NotificationConfig).filter(NotificationConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")

    db.delete(db_config)
    db.commit()
    return {"message": "删除成功"}
