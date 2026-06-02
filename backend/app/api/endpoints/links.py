"""
WAN 链路管理相关的 API 路由
"""
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db import get_db
from app.models.link import WanLink as WanLinkModel, LinkSwitchEvent, LinkAlert
from app.models.site import Site, SiteLink
from app.schemas.link import (
    WanLink, WanLinkCreate, WanLinkUpdate, LinkStats,
    SwitchEvent, LinkAlert as LinkAlertSchema,
    HistoryPoint, PaginatedLinks,
)

router = APIRouter(prefix="/links", tags=["链路管理"])


# ============================================================
#  统计端点（具体路由优先）
# ============================================================

@router.get("/stats", response_model=LinkStats, summary="获取链路统计")
def get_link_stats(db: Session = Depends(get_db)):
    """
    获取链路统计信息
    """
    total = db.query(WanLinkModel).count()
    healthy = db.query(WanLinkModel).filter(WanLinkModel.health_status == "healthy").count()
    degraded = db.query(WanLinkModel).filter(WanLinkModel.health_status == "degraded").count()
    down = db.query(WanLinkModel).filter(WanLinkModel.health_status == "down").count()
    active_count = db.query(WanLinkModel).filter(WanLinkModel.active_status == "active").count()
    total_cost = db.query(func.sum(WanLinkModel.monthly_cost)).scalar() or 0

    return LinkStats(
        total=total,
        healthy=healthy,
        degraded=degraded,
        down=down,
        activeCount=active_count,
        totalCost=round(total_cost, 2),
    )


@router.get("/site-names", response_model=List[str], summary="获取所有站点名称")
def get_site_names(db: Session = Depends(get_db)):
    """
    获取所有链路关联的站点名称（去重）
    """
    results = db.query(WanLinkModel.site_name).distinct().all()
    return [r[0] for r in results]


# ============================================================
#  链路 CRUD 端点
# ============================================================

@router.get("/", response_model=PaginatedLinks, summary="获取链路列表（分页）")
def get_links(
    type: Optional[str] = Query(None, description="链路类型: MPLS/Internet/5G"),
    healthStatus: Optional[str] = Query(None, alias="healthStatus",
                                       description="健康状态: healthy/degraded/down"),
    siteName: Optional[str] = Query(None, alias="siteName", description="站点名称筛选"),
    deviceId: Optional[str] = Query(None, alias="deviceId", description="设备ID筛选"),
    search: Optional[str] = Query(None, description="搜索链路名称"),
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    db: Session = Depends(get_db),
):
    """
    获取链路列表，支持多条件筛选和分页

    - **type**: 链路类型筛选
    - **healthStatus**: 健康状态筛选
    - **siteName**: 站点名称筛选
    - **search**: 搜索关键词（链路名称/站点/ISP）
    - **page**: 页码（从1开始，默认第1页）
    - **pageSize**: 每页记录数（默认10，最大500）
    """
    query = db.query(WanLinkModel)

    if type:
        query = query.filter(WanLinkModel.type == type)
    if healthStatus:
        query = query.filter(WanLinkModel.health_status == healthStatus)
    if siteName:
        query = query.filter(WanLinkModel.site_name == siteName)
    if deviceId:
        query = query.filter(WanLinkModel.device_id == deviceId)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                WanLinkModel.name.ilike(search_pattern),
                WanLinkModel.site_name.ilike(search_pattern),
                WanLinkModel.isp.ilike(search_pattern),
            )
        )

    # 获取总数（在筛选之后）
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    links = query.order_by(WanLinkModel.name).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedLinks(
        items=[_format_link(link, db) for link in links],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.post("/", response_model=WanLink, status_code=status.HTTP_201_CREATED, summary="创建链路")
def create_link(link: WanLinkCreate, db: Session = Depends(get_db)):
    """
    创建新链路
    """
    # 验证站点存在
    site = db.query(Site).filter(Site.id == link.site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 获取设备信息（如果指定了 device_id）
    device_name = None
    if link.device_id:
        from app.models.device import Device
        device = db.query(Device).filter(Device.id == link.device_id).first()
        if device:
            device_name = device.name

    # 计算 SLA 评分
    sla_score = _calc_sla_score(0, 0, 0)

    new_link = WanLinkModel(
        id=f"link-{uuid.uuid4().hex[:8]}",
        name=link.name,
        type=link.type,
        site_id=link.site_id,
        site_name=site.display_name,
        device_id=link.device_id,
        device_name=device_name,
        isp=link.isp,
        health_status="healthy",
        active_status="standby",
        ip=link.ip,
        latency=0,
        loss=0,
        jitter=0,
        bandwidth=0,
        used_bandwidth=0,
        utilization=0,
        sla_score=sla_score,
        switch_policy=link.switch_policy,
        monthly_cost=link.monthly_cost,
    )

    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    return _format_link(new_link, db)


# ============================================================
#  单个链路操作端点
# ============================================================

@router.get("/{link_id}", response_model=WanLink, summary="获取链路详情")
def get_link(link_id: str, db: Session = Depends(get_db)):
    """
    获取链路详情（含切换历史和告警）
    """
    link = db.query(WanLinkModel).filter(WanLinkModel.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )
    return _format_link(link, db)


@router.put("/{link_id}", response_model=WanLink, summary="更新链路")
def update_link(link_id: str, link_update: WanLinkUpdate, db: Session = Depends(get_db)):
    """
    更新链路信息（部分更新）
    """
    link = db.query(WanLinkModel).filter(WanLinkModel.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )

    # 更新字段
    update_data = link_update.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(link, field, value)

    # 更新后重新计算 SLA 评分
    link.sla_score = _calc_sla_score(link.latency, link.loss, link.jitter)

    # 重新判断健康状态
    link.health_status = _calc_health_status(link)

    db.commit()
    db.refresh(link)

    return _format_link(link, db)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除链路")
def delete_link(link_id: str, db: Session = Depends(get_db)):
    """
    删除链路
    """
    link = db.query(WanLinkModel).filter(WanLinkModel.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )

    db.delete(link)
    db.commit()


# ============================================================
#  链路操作端点
# ============================================================

@router.get("/{link_id}/history", response_model=List[HistoryPoint], summary="获取链路历史数据")
def get_link_history(
    link_id: str,
    timeRange: str = Query("5min", alias="timeRange", description="时间范围: 5min/1hour/24hour"),
    db: Session = Depends(get_db),
):
    """
    获取链路历史性能数据

    - **timeRange**: 时间范围（5min/1hour/24hour）
    - 时间标签基于当前时间动态生成，确保始终显示最新的监控数据
    """
    from app.models.link_metrics_history import LinkMetricsHistory

    link = db.query(WanLinkModel).filter(WanLinkModel.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )

    # 从数据库查询历史数据（按时间戳升序排列）
    history_records = db.query(LinkMetricsHistory).filter(
        LinkMetricsHistory.link_id == link_id,
        LinkMetricsHistory.time_range == timeRange
    ).order_by(LinkMetricsHistory.timestamp.asc()).all()

    # 如果没有历史数据，返回空数组
    if not history_records:
        return []

    # 确定时间范围配置（用于动态计算时间标签）
    if timeRange == "5min":
        points = 12
        interval = timedelta(minutes=5)
    elif timeRange == "1hour":
        points = 60
        interval = timedelta(minutes=1)
    elif timeRange == "24hour":
        points = 24
        interval = timedelta(hours=1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的时间范围，允许值: 5min/1hour/24hour"
        )

    # 获取当前时间，从现在往前推生成时间标签
    # 使用本地时间而非UTC时间，确保显示的时区正确
    now = datetime.now()

    # 确定时间格式
    def format_time(dt: datetime) -> str:
        if timeRange in ["5min", "1hour"]:
            return dt.strftime("%H:%M")
        else:
            return dt.strftime("%m-%d %H:%M")

    # 转换为前端需要的格式
    # 使用当前时间动态生成时间标签，确保始终显示"最近"的监控数据
    result = []
    for i, record in enumerate(history_records):
        # 计算从现在往前推的时间点
        time_offset = now - (points - 1 - i) * interval

        result.append(HistoryPoint(
            time=format_time(time_offset),
            latency=round(record.latency, 2),
            loss=round(record.loss, 3),
            jitter=round(record.jitter, 2),
            bandwidth=round(record.bandwidth, 2),
            throughput=round(record.throughput, 2),
        ))

    return result


@router.post("/{link_id}/switch", summary="手动切换链路")
def switch_link(link_id: str, db: Session = Depends(get_db)):
    """
    手动切换到指定链路
    """
    link = db.query(WanLinkModel).filter(WanLinkModel.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )

    if link.health_status == "down":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法切换到故障链路"
        )

    # 查找同站点当前活跃链路
    current_active = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == link.site_id,
        WanLinkModel.active_status == "active",
        WanLinkModel.id != link.id,
    ).first()

    from_link_name = current_active.name if current_active else "无"

    # 更新链路状态
    if current_active:
        current_active.active_status = "standby"

    link.active_status = "active"

    # 记录切换事件
    event = LinkSwitchEvent(
        id=f"sw-{uuid.uuid4().hex[:6]}",
        link_id=link.id,
        time=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        from_link=from_link_name,
        to_link=link.name,
        reason="管理员手动切换链路",
    )
    db.add(event)

    # ====== 同步 site_links 表 + site.active_link_id ======
    # 将之前活跃的 site_link 设为 standby
    if current_active:
        prev_site_link = db.query(SiteLink).filter(
            SiteLink.wan_link_id == current_active.id
        ).first()
        if prev_site_link:
            prev_site_link.status = "standby"

    # 将新活跃的 site_link 设为 active，并更新 site.active_link_id
    new_site_link = db.query(SiteLink).filter(
        SiteLink.wan_link_id == link.id
    ).first()
    if new_site_link:
        new_site_link.status = "active"
        site = db.query(Site).filter(Site.id == link.site_id).first()
        if site:
            site.active_link_id = new_site_link.id

    db.commit()
    db.refresh(link)

    return {"success": True, "message": "链路切换成功"}


# ============================================================
#  辅助函数
# ============================================================

def _format_link(link: WanLinkModel, db: Session) -> dict:
    """将数据库模型转换为前端需要的响应字典"""
    # 获取切换事件
    events = db.query(LinkSwitchEvent).filter(
        LinkSwitchEvent.link_id == link.id
    ).order_by(LinkSwitchEvent.time.desc()).all()

    # 获取告警
    alerts = db.query(LinkAlert).filter(
        LinkAlert.link_id == link.id
    ).order_by(LinkAlert.timestamp.desc()).all()

    # 查询对应的 site_link_id
    site_link = db.query(SiteLink).filter(
        SiteLink.wan_link_id == link.id
    ).first()

    return {
        "id": link.id,
        "name": link.name,
        "type": link.type,
        "siteId": link.site_id,
        "siteName": link.site_name,
        "deviceId": link.device_id,
        "deviceName": link.device_name,
        "isp": link.isp or "",
        "healthStatus": link.health_status,
        "activeStatus": link.active_status,
        "ip": link.ip or "",
        "latency": link.latency,
        "loss": link.loss,
        "jitter": link.jitter,
        "bandwidth": link.bandwidth,
        "usedBandwidth": link.used_bandwidth,
        "utilization": link.utilization,
        "slaScore": round(link.sla_score, 1),
        "switchPolicy": link.switch_policy,
        "monthlyCost": link.monthly_cost,
        "switchHistory": [
            {
                "id": e.id,
                "linkId": e.link_id,
                "time": e.time,
                "fromLink": e.from_link,
                "toLink": e.to_link,
                "reason": e.reason,
            }
            for e in events
        ],
        "alerts": [
            {
                "id": a.id,
                "linkId": a.link_id,
                "severity": a.severity,
                "category": a.category or "",
                "title": a.title,
                "reason": a.reason or "",
                "timestamp": a.timestamp or "",
                "resolved": a.resolved,
            }
            for a in alerts
        ],
        "siteLinkId": site_link.id if site_link else None,
        "createdAt": link.created_at,
    }


def _calc_sla_score(latency: float, loss: float, jitter: float) -> float:
    """
    计算 SLA 评分（0-100）
    由延迟、丢包、抖动综合计算
    """
    latency_score = max(0, 40 - (latency / 200) * 40)
    loss_score = max(0, 35 - (loss / 1) * 35)
    jitter_score = max(0, 25 - (jitter / 50) * 25)
    return round(latency_score + loss_score + jitter_score, 1)


def _calc_health_status(link: WanLinkModel) -> str:
    """根据性能指标计算健康状态"""
    if link.active_status == "down":
        return "down"
    if link.latency > 100 or link.loss > 1 or link.jitter > 30:
        return "degraded"
    if link.latency > 40 or link.loss > 0.2 or link.jitter > 10:
        return "degraded"
    return "healthy"
