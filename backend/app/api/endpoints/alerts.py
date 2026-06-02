"""
告警相关的 API 路由
"""
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db import get_db
from app.models.alert import Alert as AlertModel, AlertHistory
from app.schemas.alert import (
    Alert, AlertCreate, AlertUpdate, AlertStats, AlertWithTimeline, AlertTimelineEntry,
    VALID_LEVELS, VALID_STATUSES, VALID_SOURCE_TYPES, PaginatedAlerts,
)

router = APIRouter(prefix="/alerts", tags=["告警中心"])

# WebSocket 连接管理
class ConnectionManager:
    """WebSocket 连接管理器"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    告警 WebSocket 端点
    用于实时推送告警信息
    """
    await manager.connect(websocket)
    try:
        while True:
            # 保持连接，接收客户端心跳
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/", response_model=Alert, summary="创建告警")
def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    """
    创建新告警

    - **level**: 告警等级（critical/warning/info）
    - **title**: 告警标题
    - **message**: 告警详情
    - **source_type**: 告警来源（site/link/device）
    - **source_id**: 来源ID
    """
    # 校验等级
    if alert.level not in VALID_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的告警等级，允许值: {', '.join(VALID_LEVELS)}"
        )

    # 校验来源类型
    if alert.source_type not in VALID_SOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的来源类型，允许值: {', '.join(VALID_SOURCE_TYPES)}"
        )

    # 序列化关联告警
    related = json.dumps(alert.related_alerts) if alert.related_alerts else None

    new_alert = AlertModel(
        level=alert.level,
        title=alert.title,
        message=alert.message,
        source_type=alert.source_type,
        source_id=alert.source_id,
        source_name=alert.source_name,
        region=alert.region,
        metric_type=alert.metric_type,
        metric_value=alert.metric_value,
        threshold=alert.threshold,
        root_cause=alert.root_cause,
        related_alerts=related,
        status='new',
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # 记录历史
    history = AlertHistory(alert_id=new_alert.id, action="created", remark="告警发生")
    db.add(history)
    db.commit()

    return _format_alert(new_alert)


@router.get("/", response_model=PaginatedAlerts, summary="获取告警列表（分页）")
def get_alerts(
    level: Optional[str] = Query(None, description="按等级筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    source_type: Optional[str] = Query(None, description="按来源类型筛选"),
    source_id: Optional[str] = Query(None, description="按来源ID筛选"),
    search: Optional[str] = Query(None, description="搜索标题/消息"),
    time_range: Optional[str] = Query(None, description="时间范围: 5min/1hour/24hour"),
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    db: Session = Depends(get_db),
):
    """
    获取告警列表（分页）

    - **level**: 按等级筛选（critical/warning/info）
    - **status**: 按状态筛选（new/acknowledged/in_progress/resolved）
    - **source_type**: 按来源类型筛选（site/link/device）
    - **source_id**: 按来源ID筛选
    - **search**: 搜索标题或消息（模糊匹配）
    - **time_range**: 时间范围筛选（5min/1hour/24hour）
    - **page**: 页码（从1开始，默认第1页）
    - **pageSize**: 每页记录数（默认10，最大500）
    """
    query = db.query(AlertModel)

    if level:
        query = query.filter(AlertModel.level == level)
    if status:
        query = query.filter(AlertModel.status == status)
    if source_type:
        query = query.filter(AlertModel.source_type == source_type)
    if source_id:
        query = query.filter(AlertModel.source_id == source_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            AlertModel.title.ilike(search_pattern),
            AlertModel.message.ilike(search_pattern),
            AlertModel.source_name.ilike(search_pattern),
        ))

    # 时间范围过滤
    if time_range:
        from datetime import timedelta
        now = datetime.utcnow()
        if time_range == "5min":
            query = query.filter(AlertModel.created_at >= now - timedelta(minutes=5))
        elif time_range == "1hour":
            query = query.filter(AlertModel.created_at >= now - timedelta(hours=1))
        elif time_range == "24hour":
            query = query.filter(AlertModel.created_at >= now - timedelta(hours=24))

    # 获取总数
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    alerts = query.order_by(AlertModel.created_at.desc()).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedAlerts(
        items=[_format_alert(a) for a in alerts],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/stats", response_model=AlertStats, summary="获取告警统计")
def get_alert_stats(db: Session = Depends(get_db)):
    """
    获取告警统计信息
    """
    from sqlalchemy import func
    total = db.query(AlertModel).count()
    critical = db.query(AlertModel).filter(AlertModel.level == "critical").count()
    warning = db.query(AlertModel).filter(AlertModel.level == "warning").count()
    info = db.query(AlertModel).filter(AlertModel.level == "info").count()
    new_count = db.query(AlertModel).filter(AlertModel.status == "new").count()
    acknowledged = db.query(AlertModel).filter(AlertModel.status == "acknowledged").count()
    in_progress = db.query(AlertModel).filter(AlertModel.status == "in_progress").count()
    resolved = db.query(AlertModel).filter(AlertModel.status == "resolved").count()

    return AlertStats(
        total=total, critical=critical, warning=warning, info=info,
        new=new_count, acknowledged=acknowledged, in_progress=in_progress, resolved=resolved,
    )


@router.get("/{alert_id}", response_model=AlertWithTimeline, summary="获取告警详情")
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    获取告警详情（含时间线）
    """
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="告警不存在"
        )

    # 获取时间线
    history = db.query(AlertHistory).filter(
        AlertHistory.alert_id == alert_id
    ).order_by(AlertHistory.created_at.asc()).all()

    result = _format_alert(alert)
    result["timeline"] = [
        AlertTimelineEntry(
            id=h.id,
            action=h.action,
            operator=h.operator,
            remark=h.remark,
            created_at=h.created_at,
        )
        for h in history
    ]

    return result


@router.patch("/{alert_id}", response_model=Alert, summary="更新告警状态")
def update_alert(alert_id: int, update: AlertUpdate, db: Session = Depends(get_db)):
    """
    更新告警状态

    - **status**: 新状态（acknowledged/in_progress/resolved）
    - **acknowledged_by**: 确认人
    - **root_cause**: 根因分析
    - **remark**: 备注
    """
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="告警不存在"
        )

    # 更新状态
    if update.status:
        if update.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的状态，允许值: {', '.join(VALID_STATUSES)}"
            )
        alert.status = update.status

        # 记录时间
        if update.status == "acknowledged":
            alert.acknowledged_at = datetime.utcnow()
        elif update.status == "resolved":
            alert.resolved_at = datetime.utcnow()

    # 更新其他字段
    if update.acknowledged_by:
        alert.acknowledged_by = update.acknowledged_by
    if update.root_cause:
        alert.root_cause = update.root_cause

    # 记录历史
    action_map = {
        "acknowledged": "acknowledged",
        "in_progress": "updated",
        "resolved": "resolved",
    }
    history = AlertHistory(
        alert_id=alert_id,
        action=action_map.get(update.status, "updated"),
        operator=update.acknowledged_by,
        remark=update.remark or f"状态更新为 {update.status}",
    )
    db.add(history)

    db.commit()
    db.refresh(alert)

    return _format_alert(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除告警")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    删除告警（仅限已恢复的告警）
    """
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="告警不存在"
        )

    # 删除关联的历史记录
    db.query(AlertHistory).filter(AlertHistory.alert_id == alert_id).delete()
    db.delete(alert)
    db.commit()

    return None


def _format_alert(alert: AlertModel) -> dict:
    """将数据库模型转换为响应字典"""
    return {
        "id": alert.id,
        "level": alert.level,
        "status": alert.status,
        "title": alert.title,
        "message": alert.message,
        "source_type": alert.source_type,
        "source_id": alert.source_id,
        "source_name": alert.source_name,
        "region": alert.region,
        "metric_type": alert.metric_type,
        "metric_value": alert.metric_value,
        "threshold": alert.threshold,
        "root_cause": alert.root_cause,
        "related_alerts": json.loads(alert.related_alerts) if alert.related_alerts else [],
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_at": alert.acknowledged_at,
        "resolved_at": alert.resolved_at,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at,
    }
