"""
Webhook配置 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db import get_db
from app.models.webhook_config import WebhookConfig

router = APIRouter(prefix="/webhooks", tags=["Webhook配置"])


class WebhookConfigCreate(BaseModel):
    """创建Webhook配置"""
    name: str
    url: str
    method: str = "POST"
    headers: str = "{}"
    events: str = "[]"
    secret: str = ""


class WebhookConfigUpdate(BaseModel):
    """更新Webhook配置"""
    name: str = None
    url: str = None
    method: str = None
    headers: str = None
    events: str = None
    secret: str = None
    is_active: Optional[bool] = None


class WebhookConfigResponse(BaseModel):
    """Webhook配置响应"""
    id: int
    name: str
    url: str
    method: str
    headers: str
    events: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[WebhookConfigResponse])
def get_webhooks(db: Session = Depends(get_db)):
    """获取Webhook配置列表"""
    return db.query(WebhookConfig).all()


@router.post("/", response_model=WebhookConfigResponse)
def create_webhook(config: WebhookConfigCreate, db: Session = Depends(get_db)):
    """创建Webhook配置"""
    db_config = WebhookConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.put("/{config_id}", response_model=WebhookConfigResponse)
def update_webhook(config_id: int, config: WebhookConfigUpdate, db: Session = Depends(get_db)):
    """更新Webhook配置"""
    db_config = db.query(WebhookConfig).filter(WebhookConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")

    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)

    db.commit()
    db.refresh(db_config)
    return db_config


@router.delete("/{config_id}")
def delete_webhook(config_id: int, db: Session = Depends(get_db)):
    """删除Webhook配置"""
    db_config = db.query(WebhookConfig).filter(WebhookConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="配置不存在")

    db.delete(db_config)
    db.commit()
    return {"message": "删除成功"}
