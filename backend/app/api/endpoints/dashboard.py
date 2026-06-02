"""
Dashboard 大屏相关的 API 路由
一次性返回所有 Dashboard 需要的数据
"""
import random
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.site import Site as SiteModel
from app.models.dashboard import DashboardTopologyLink, ApplicationSla, IspBandwidth
from app.models.alert import Alert as AlertModel
from app.schemas.dashboard import DashboardData

router = APIRouter(prefix="/dashboard", tags=["Dashboard大屏"])


@router.get("", response_model=DashboardData, summary="获取 Dashboard 全部数据")
def get_dashboard(db: Session = Depends(get_db)):
    """
    一次性返回 Dashboard 需要的全部数据
    包括：健康分数、统计、站点、链路、应用SLA、告警、ISP带宽
    查询时添加随机抖动模拟实时数据
    """
    return _build_dashboard_data(db)


def _build_dashboard_data(db: Session) -> dict:
    """构建 Dashboard 聚合数据"""
    # 查询所有站点
    sites = db.query(SiteModel).all()
    site_map = {s.id: s for s in sites}

    # 查询站点间拓扑链路
    topo_links = db.query(DashboardTopologyLink).all()

    # 查询应用 SLA
    app_slas = db.query(ApplicationSla).all()

    # 查询 ISP 带宽
    isp_bandwidths = db.query(IspBandwidth).all()

    # 查询告警（未 resolved 优先，取最近 10 条）
    alerts = (
        db.query(AlertModel)
        .filter(AlertModel.status != "resolved")
        .order_by(AlertModel.created_at.desc())
        .limit(10)
        .all()
    )

    # --- 构建站点数据（带随机抖动）---
    dashboard_sites = []
    for s in sites:
        sla_val = (s.sla or 99.0) + random.uniform(-0.3, 0.3)
        sla_val = max(0, min(100, sla_val))
        latency_val = max(0, (s.latency or 0) + random.uniform(-2, 2))

        dashboard_sites.append({
            "id": s.id,
            "name": s.display_name,
            "type": s.site_type or "branch",
            "cloudProvider": s.cloud_provider,
            "lat": s.lat or 0,
            "lng": s.lng or 0,
            "status": "online" if s.status != "offline" else "offline",
            "sla": round(sla_val, 1),
            "avgLatency": round(latency_val, 1),
            "activeTunnels": s.active_tunnels or 0,
            "totalBandwidth": s.bandwidth_total or "",
            "region": _get_region_name(s.region),
        })

    # --- 构建链路数据（带随机抖动）---
    dashboard_links = []
    for link in topo_links:
        source_site = site_map.get(link.source_site_id)
        target_site = site_map.get(link.target_site_id)
        if not source_site or not target_site:
            continue

        latency_val = max(0, link.avg_latency + random.uniform(-3, 3))
        loss_val = max(0, link.packet_loss + random.uniform(-0.02, 0.02))

        # 根据延迟/丢包计算健康状态
        if loss_val > 0.1 or latency_val > 50:
            health = "critical"
        elif loss_val > 0.05 or latency_val > 35:
            health = "warning"
        else:
            health = "good"

        dashboard_links.append({
            "id": f"link-{link.source_site_id}-{link.target_site_id}",
            "sourceId": link.source_site_id,
            "targetId": link.target_site_id,
            "sourceName": source_site.display_name.split("·")[0][:2],
            "targetName": target_site.display_name.split("·")[0][:2],
            "sourceCoords": [source_site.lat or 0, source_site.lng or 0],
            "targetCoords": [target_site.lat or 0, target_site.lng or 0],
            "avgLatency": round(latency_val, 1),
            "packetLoss": round(loss_val, 4),
            "bandwidth": link.bandwidth or "",
            "health": health,
            "status": link.status,
        })

    # --- 构建应用 SLA 数据（带随机抖动）---
    dashboard_apps = []
    for app in app_slas:
        availability = max(0, min(100, app.availability + random.uniform(-0.02, 0.02)))
        dashboard_apps.append({
            "id": f"app-{app.id}",
            "name": app.name,
            "shortName": app.short_name or "",
            "availability": round(availability, 2),
            "performance": app.performance,
            "color": app.color,
        })

    # --- 构建 ISP 带宽数据（带随机抖动）---
    dashboard_isp = []
    for isp in isp_bandwidths:
        used = min(isp.total_mbps, max(0, isp.used_mbps + random.uniform(-10, 10)))
        dashboard_isp.append({
            "isp": isp.isp,
            "shortName": isp.short_name or "",
            "usedMbps": round(used, 1),
            "totalMbps": isp.total_mbps,
            "color": isp.color,
        })

    # --- 构建告警数据 ---
    severity_map = {"critical": "critical", "warning": "major", "info": "minor"}
    metric_category_map = {
        "latency": "链路质量",
        "loss": "链路质量",
        "bandwidth": "带宽告警",
        "cpu": "设备状态",
        "memory": "设备状态",
    }
    dashboard_alerts = []
    for alert in alerts:
        dashboard_alerts.append({
            "id": f"alert-{alert.id}",
            "severity": severity_map.get(alert.level, "minor"),
            "title": alert.title,
            "siteName": alert.source_name or "",
            "siteId": alert.source_id,
            "description": alert.message or "",
            "timestamp": _format_time_ago(alert.created_at),
            "category": metric_category_map.get(alert.metric_type, "系统告警"),
        })

    # --- 统计数据 ---
    online_sites = sum(1 for s in sites if s.status == "online")
    offline_sites = sum(1 for s in sites if s.status == "offline")
    critical_alerts = sum(1 for a in alerts if a.level == "critical")

    stats = {
        "totalSites": len(sites),
        "onlineSites": online_sites,
        "offlineSites": offline_sites,
        "totalLinks": len(dashboard_links),
        "criticalAlerts": critical_alerts,
    }

    # --- 健康分数（avgSla * 0.6 + avgLinkHealth * 0.4）---
    avg_sla = sum(s["sla"] for s in dashboard_sites) / max(len(dashboard_sites), 1)
    good_links = sum(1 for l in dashboard_links if l["health"] == "good")
    avg_link_health = (good_links / max(len(dashboard_links), 1)) * 100
    health_score = round(avg_sla * 0.6 + avg_link_health * 0.4)

    return {
        "healthScore": health_score,
        "stats": stats,
        "sites": dashboard_sites,
        "links": dashboard_links,
        "applications": dashboard_apps,
        "alerts": dashboard_alerts,
        "ispBandwidth": dashboard_isp,
    }


# 区域代码 -> 中文名映射
_REGION_NAMES = {
    "CN": "国内",
    "SG": "亚太",
    "US": "北美",
    "EU": "欧洲",
}


def _get_region_name(region_code: str) -> str:
    """区域代码转中文名"""
    return _REGION_NAMES.get(region_code, region_code)


def _format_time_ago(dt) -> str:
    """将 datetime 格式化为"X 分钟前"的相对时间"""
    if not dt:
        return ""
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    diff = now - dt
    total_seconds = int(diff.total_seconds())

    if total_seconds < 60:
        return f"{total_seconds} 秒前"
    if total_seconds < 3600:
        return f"{total_seconds // 60} 分钟前"
    if total_seconds < 86400:
        return f"{total_seconds // 3600} 小时前"
    return f"{total_seconds // 86400} 天前"
