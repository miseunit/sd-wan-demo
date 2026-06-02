"""
告警规则 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db import get_db
from app.models.alert_rule import AlertRule

router = APIRouter(prefix="/alert-rules", tags=["告警规则"])


class AlertRuleCreate(BaseModel):
    """创建告警规则"""
    name: str
    type: str
    metric: str = None
    condition: str = None
    threshold: float = None
    severity: str = "warning"
    description: str = ""


class AlertRuleUpdate(BaseModel):
    """更新告警规则"""
    name: str = None
    metric: str = None
    condition: str = None
    threshold: float = None
    severity: str = None
    is_active: bool = None
    description: str = None


class AlertRuleResponse(BaseModel):
    """告警规则响应"""
    id: int
    name: str
    type: str
    metric: str = None
    condition: str = None
    threshold: float = None
    severity: str
    is_active: bool
    description: str = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AlertRuleResponse])
def get_alert_rules(
    type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """获取告警规则列表"""
    query = db.query(AlertRule)

    if type:
        query = query.filter(AlertRule.type == type)
    if is_active is not None:
        query = query.filter(AlertRule.is_active == is_active)

    return query.all()


@router.post("/", response_model=AlertRuleResponse)
def create_alert_rule(rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """创建告警规则"""
    db_rule = AlertRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.put("/{rule_id}", response_model=AlertRuleResponse)
def update_alert_rule(rule_id: int, rule: AlertRuleUpdate, db: Session = Depends(get_db)):
    """更新告警规则"""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    update_data = rule.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rule, key, value)

    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.delete("/{rule_id}")
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    """删除告警规则"""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    db.delete(db_rule)
    db.commit()
    return {"message": "删除成功"}
