"""
站点管理相关的 API 路由
"""
import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db import get_db, SessionLocal
from app.models.site import Site as SiteModel, SiteLink, SiteAlert, SiteHistory
from app.models.link import WanLink as WanLinkModel, LinkSwitchEvent
from app.models.batch_task import BatchTask, BatchTaskResult
from app.schemas.site import (
    Site, SiteCreate, SiteUpdate, SiteStats,
    SiteLink as SiteLinkSchema,
    SiteAlert as SiteAlertSchema,
    SiteConfig,
    HistoryPoint,
    BatchActionRequest, BatchTaskResponse, BatchTaskStatus, BatchTaskResultItem,
    LinkSwitchRequest, LinkSwitchResponse,
    AlertAcknowledgeRequest, AlertAcknowledgeResponse, AlertSilenceRequest,
    SiteExportRequest, PaginatedSites, WanInterfaceConfig,
)

router = APIRouter(prefix="/sites", tags=["站点管理"])

# WebSocket 连接管理
class ConnectionManager:
    """WebSocket 连接管理器"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


# ============================================================
#  WebSocket 端点
# ============================================================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    站点 WebSocket 端点
    用于实时推送站点状态更新
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


# ============================================================
#  基础 CRUD 端点（具体路由优先）
# ============================================================

@router.get("/stats", response_model=SiteStats, summary="获取站点统计")
def get_site_stats(db: Session = Depends(get_db)):
    """
    获取站点统计信息
    """
    total = db.query(SiteModel).count()
    online = db.query(SiteModel).filter(SiteModel.status == "online").count()
    offline = db.query(SiteModel).filter(SiteModel.status == "offline").count()
    warning = db.query(SiteModel).filter(SiteModel.status == "warning").count()
    alert_count = db.query(SiteAlert).filter(
        and_(
            SiteAlert.acknowledged == False,
            SiteAlert.silenced == False
        )
    ).count()

    return SiteStats(
        total=total,
        online=online,
        offline=offline,
        warning=warning,
        alertCount=alert_count
    )


@router.get("/export", summary="导出站点数据")
def export_sites(
    region: Optional[str] = Query(None, description="按区域筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    search: Optional[str] = Query(None, description="搜索站点名称"),
    link_type: Optional[str] = Query(None, alias="linkType", description="按链路类型筛选"),
    format: str = Query("csv", description="导出格式: csv/json"),
    include_alerts: bool = Query(False, alias="includeAlerts", description="是否包含告警"),
    include_links: bool = Query(True, alias="includeLinks", description="是否包含链路"),
    db: Session = Depends(get_db),
):
    """
    导出站点数据

    - **format**: 导出格式（csv/json）
    - **includeAlerts**: 是否包含告警信息
    - **includeLinks**: 是否包含链路信息
    """
    from fastapi.responses import PlainTextResponse, JSONResponse, StreamingResponse
    import csv
    from io import StringIO

    try:
        # 查询站点
        query = db.query(SiteModel)
        if region:
            query = query.filter(SiteModel.region == region)
        if status:
            query = query.filter(SiteModel.status == status)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(or_(
                SiteModel.name.ilike(search_pattern),
                SiteModel.display_name.ilike(search_pattern),
            ))
        if link_type:
            query = query.join(SiteLink, SiteModel.id == SiteLink.site_id).filter(SiteLink.link_type == link_type)

        sites = query.order_by(SiteModel.name).all()

        if format == "json":
            # JSON 导出
            data = [_format_site(s, db, include_alerts, include_links) for s in sites]
            return JSONResponse(
                content={"sites": data},
                headers={
                    "Content-Disposition": f"attachment; filename=sites_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )
        else:
            # CSV 导出
            output = StringIO()
            writer = csv.writer(output)

            # 表头
            headers = [
                "站点ID", "站点名称", "显示名称", "区域", "状态",
                "延迟(ms)", "丢包(%)", "带宽使用率(%)", "已用带宽", "总带宽",
                "设备型号", "设备版本", "运行时长", "路由策略", "QoS策略", "优先级",
                "SLA延迟(ms)", "SLA丢包(%)", "地址", "负责人", "CPE序列号", "管理IP", "站点类型"
            ]
            if include_links:
                headers.extend(["链路数量", "活跃链路ID"])
            if include_alerts:
                headers.extend(["告警数量", "未确认告警"])

            writer.writerow(headers)

            # 数据行
            for site in sites:
                row = [
                    site.id, site.name, site.display_name, site.region, site.status,
                    site.latency, site.loss, site.bandwidth_usage,
                    site.bandwidth_used, site.bandwidth_total,
                    site.device_model, site.device_version, site.uptime,
                    site.route_policy, site.qos_policy, site.priority,
                    site.sla_latency, site.sla_loss,
                    site.address or "", site.manager or "",
                    site.serial_number or "", site.management_ip or "",
                    site.site_type or "",
                ]

                if include_links:
                    row.append(len(site.links))
                    row.append(site.active_link_id or "")

                if include_alerts:
                    acknowledged_count = len([a for a in site.alerts if not a.acknowledged])
                    row.append(len(site.alerts))
                    row.append(acknowledged_count)

                writer.writerow(row)

            # 返回 CSV
            csv_content = output.getvalue()
            return StreamingResponse(
                iter([csv_content.encode("utf-8")]),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f"attachment; filename=sites_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"导出失败: {str(e)}"
        )


# ============================================================
#  链路同步辅助函数
# ============================================================

def _sync_device_links_to_site(db: Session, device_id: str, site_id: str):
    """
    将设备的接口同步为站点的链路
    设备的 WAN/MPLS/Internet 接口 → SiteLink + WanLink
    """
    from app.models.device import Device as DeviceModel, DeviceInterface

    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device or not site:
        return

    # 获取设备的 WAN 类型接口
    wan_interfaces = db.query(DeviceInterface).filter(
        DeviceInterface.device_id == device_id,
        DeviceInterface.interface_type.in_(["WAN", "MPLS", "Internet"])
    ).all()

    for iface in wan_interfaces:
        wan_link_id = f"device-{device_id}-iface-{iface.id}"
        # 接口类型直接作为链路类型，保持一致性
        link_type = iface.interface_type
        isp = _infer_isp(iface.name, iface.ip_address)

        # 同步 SiteLink
        existing_link = db.query(SiteLink).filter(
            SiteLink.site_id == site_id,
            SiteLink.wan_link_id == wan_link_id
        ).first()

        if existing_link:
            existing_link.ip = iface.ip_address
            existing_link.bandwidth = iface.speed or "100Mbps"
            existing_link.status = "active" if iface.status == "up" else "down"
            existing_link.loss = iface.packet_loss or 0
        else:
            db.add(SiteLink(
                site_id=site_id,
                link_type=link_type,
                isp=isp,
                ip=iface.ip_address,
                bandwidth=iface.speed or "100Mbps",
                used_bandwidth="0Mbps",
                usage_percent=0,
                latency=0,
                loss=iface.packet_loss or 0,
                status="active" if iface.status == "up" else "down",
                wan_link_id=wan_link_id,
            ))

        # 同步 WanLink（表格和详情页从这里读数据）
        existing_wan = db.query(WanLinkModel).filter(WanLinkModel.id == wan_link_id).first()
        if existing_wan:
            existing_wan.ip = iface.ip_address
            existing_wan.bandwidth = _parse_bandwidth(iface.speed)
            existing_wan.health_status = "healthy" if iface.status == "up" else "down"
            existing_wan.active_status = "active" if iface.status == "up" else "down"
            existing_wan.loss = iface.packet_loss or 0
            existing_wan.site_id = site_id
            existing_wan.site_name = site.display_name
        else:
            db.add(WanLinkModel(
                id=wan_link_id,
                name=iface.name,
                type=link_type,
                link_category="wan",
                site_id=site_id,
                site_name=site.display_name,
                device_id=device_id,
                device_name=device.name,
                source_type="interface",
                source_id=iface.id,
                interface_name=iface.name,
                interface_type=iface.interface_type,
                isp=isp,
                health_status="healthy" if iface.status == "up" else "down",
                active_status="standby",
                ip=iface.ip_address,
                bandwidth=_parse_bandwidth(iface.speed),
                used_bandwidth=0,
                utilization=0,
                latency=0,
                loss=iface.packet_loss or 0,
                jitter=0,
                sla_score=100,
            ))

    # 同步设备隧道为链路（可选，隧道通常是 Overlay）
    from app.models.device import DeviceTunnel
    tunnels = db.query(DeviceTunnel).filter(
        DeviceTunnel.device_id == device_id,
        DeviceTunnel.status == "up"
    ).all()

    for tunnel in tunnels:
        tunnel_link_id = f"device-{device_id}-tunnel-{tunnel.id}"

        # 同步 SiteLink
        existing = db.query(SiteLink).filter(
            SiteLink.site_id == site_id,
            SiteLink.wan_link_id == tunnel_link_id
        ).first()

        if not existing:
            db.add(SiteLink(
                site_id=site_id,
                link_type="MPLS",
                isp=f"{tunnel.tunnel_type} 隧道",
                ip=tunnel.local_ip,
                bandwidth="N/A",
                used_bandwidth="N/A",
                usage_percent=0,
                latency=0,
                loss=0,
                status="active",
                wan_link_id=tunnel_link_id,
            ))

        # 同步 WanLink
        existing_wan = db.query(WanLinkModel).filter(WanLinkModel.id == tunnel_link_id).first()
        if existing_wan:
            existing_wan.health_status = "healthy"
            existing_wan.active_status = "active"
            existing_wan.site_id = site_id
            existing_wan.site_name = site.display_name
        else:
            db.add(WanLinkModel(
                id=tunnel_link_id,
                name=tunnel.tunnel_name,
                type="MPLS",
                link_category="overlay",
                site_id=site_id,
                site_name=site.display_name,
                device_id=device_id,
                device_name=device.name,
                source_type="tunnel",
                source_id=tunnel.id,
                tunnel_name=tunnel.tunnel_name,
                local_ip=tunnel.local_ip,
                peer_ip=tunnel.peer_ip,
                isp=f"{tunnel.tunnel_type} 隧道",
                health_status="healthy",
                active_status="standby",
                bandwidth=0,
                used_bandwidth=0,
                utilization=0,
                latency=0,
                loss=0,
                jitter=0,
                sla_score=100,
            ))


def _infer_isp(interface_name: str, ip_address: str) -> str:
    """根据接口名称或 IP 推断 ISP"""
    name_lower = (interface_name or "").lower()
    if "china" in name_lower or "cmcc" in name_lower or "mobile" in name_lower:
        return "中国移动"
    if "unicom" in name_lower or "cu" in name_lower:
        return "中国联通"
    if "telecom" in name_lower or "ct" in name_lower:
        return "中国电信"
    if "mpls" in name_lower:
        return "MPLS 专线"
    if ip_address:
        # 简单根据 IP 段推断
        if ip_address.startswith("10.") or ip_address.startswith("192.168."):
            return "内网链路"
    return "运营商链路"


def _parse_bandwidth(speed_str: str) -> float:
    """
    从带宽字符串中提取数值（Mbps）
    例如: "100Mbps" → 100, "1 Gbps" → 1000, "N/A" → 0
    """
    if not speed_str:
        return 0
    import re
    match = re.search(r'([\d.]+)', speed_str)
    if not match:
        return 0
    value = float(match.group(1))
    if "gbps" in speed_str.lower() or "g" in speed_str.lower():
        value *= 1000
    return value


def _remove_device_links_from_site(db: Session, device_id: str, site_id: str):
    """移除设备关联的站点链路（SiteLink + WanLink）"""
    # 删除 SiteLink
    links = db.query(SiteLink).filter(
        SiteLink.site_id == site_id,
        SiteLink.wan_link_id.like(f"device-{device_id}-%")
    ).all()

    for link in links:
        db.delete(link)

    # 删除 WanLink
    wan_links = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == site_id,
        WanLinkModel.device_id == device_id
    ).all()

    for link in wan_links:
        db.delete(link)


# ============================================================
#  批量操作端点
# ============================================================

@router.post("/batch/action", response_model=BatchTaskResponse, summary="执行批量操作")
def batch_action(request: BatchActionRequest, db: Session = Depends(get_db)):
    """
    执行批量操作

    - **action**: 操作类型（restart/switchLink/upgradeConfig）
    - **siteIds**: 站点ID列表
    """
    # 验证操作类型
    valid_actions = ["restart", "switchLink", "upgradeConfig"]
    if request.action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的操作类型，允许值: {', '.join(valid_actions)}"
        )

    # 创建任务
    task_id = f"task-{uuid.uuid4().hex}"
    task = BatchTask(
        id=task_id,
        action=request.action,
        site_ids=json.dumps(request.site_ids),
        status="pending"
    )
    db.add(task)
    db.commit()

    # 异步执行任务（这里用简单的模拟，生产环境应使用 Celery 或类似工具）
    _execute_batch_task(task_id, request.action, request.site_ids, db)

    return BatchTaskResponse(
        taskId=task_id,
        action=request.action,
        totalCount=len(request.site_ids),
        status="pending",
        createdAt=datetime.utcnow()
    )


@router.get("/batch/tasks/{task_id}", response_model=BatchTaskStatus, summary="获取批量操作任务状态")
def get_batch_task_status(task_id: str, db: Session = Depends(get_db)):
    """
    获取批量操作任务状态
    """
    task = db.query(BatchTask).filter(BatchTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    # 获取结果
    results = db.query(BatchTaskResult).filter(
        BatchTaskResult.task_id == task_id
    ).order_by(BatchTaskResult.created_at.asc()).all()

    site_ids = json.loads(task.site_ids)
    completed_count = len([r for r in results if r.status in ("success", "failed")])
    success_count = len([r for r in results if r.status == "success"])
    failed_count = len([r for r in results if r.status == "failed"])

    return BatchTaskStatus(
        taskId=task.id,
        action=task.action,
        totalCount=len(site_ids),
        completedCount=completed_count,
        successCount=success_count,
        failedCount=failed_count,
        status=task.status,
        results=[
            BatchTaskResultItem(
                siteId=r.site_id,
                siteName=r.site_name or "",
                status=r.status,
                error=r.error,
                createdAt=r.created_at
            )
            for r in results
        ],
        createdAt=task.created_at,
        completedAt=task.completed_at
    )


# ============================================================
#  站点 CRUD 端点
# ============================================================

@router.get("/", response_model=PaginatedSites, summary="获取站点列表（分页）")
def get_sites(
    region: Optional[str] = Query(None, description="按区域筛选"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    search: Optional[str] = Query(None, description="搜索站点名称"),
    link_type: Optional[str] = Query(None, alias="linkType", description="按链路类型筛选"),
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    db: Session = Depends(get_db),
):
    """
    获取站点列表（分页）

    - **region**: 按区域筛选（CN/SG/US/EU）
    - **status**: 按状态筛选（online/offline/warning）
    - **search**: 搜索站点名称或显示名（模糊匹配）
    - **linkType**: 按链路类型筛选（MPLS/Internet/5G）
    - **page**: 页码（从1开始，默认第1页）
    - **pageSize**: 每页记录数（默认10，最大500）
    """
    query = db.query(SiteModel)

    if region:
        query = query.filter(SiteModel.region == region)
    if status:
        query = query.filter(SiteModel.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            SiteModel.name.ilike(search_pattern),
            SiteModel.display_name.ilike(search_pattern),
        ))
    if link_type:
        # 需要关联查询链路
        query = query.join(SiteLink, SiteModel.id == SiteLink.site_id).filter(SiteLink.link_type == link_type)

    # 获取总数（在筛选之后）
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    sites = query.order_by(SiteModel.name).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedSites(
        items=[_format_site(site, db) for site in sites],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.post("/", response_model=Site, summary="创建站点")
def create_site(site: SiteCreate, db: Session = Depends(get_db)):
    """
    创建新站点
    """
    # 检查站点名称是否已存在
    existing = db.query(SiteModel).filter(SiteModel.name == site.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="站点名称已存在"
        )

    # 创建站点
    new_site = SiteModel(
        id=f"site-{uuid.uuid4().hex[:8]}",
        name=site.name,
        display_name=site.display_name,
        region=site.region,
        status=site.status,
        latency=site.latency,
        loss=site.loss,
        bandwidth_usage=site.bandwidth_usage,
        bandwidth_used=site.bandwidth_used,
        bandwidth_total=site.bandwidth_total,
        device_model=site.device_model,
        device_version=site.device_version,
        uptime=site.uptime,
        route_policy=site.route_policy,
        qos_policy=site.qos_policy,
        priority=site.priority,
        sla_latency=site.sla_latency,
        sla_loss=site.sla_loss,
        address=site.address,
        manager=site.manager,
        serial_number=site.serial_number,
        management_ip=site.management_ip,
        site_type=site.site_type,
        lat=site.lat,
        lng=site.lng,
    )

    db.add(new_site)
    db.flush()

    # P1: 如果提供了 WAN 接口配置，自动创建默认 CPE 设备并配置接口
    if site.wan_interfaces:
        from app.models.device import Device as DeviceModel, DeviceInterface

        device = DeviceModel(
            id=f"device-{site.name.lower().replace('-', '')}",
            name=f"{site.name}-CPE",
            device_type="CPE",
            site_id=new_site.id,
            site_name=new_site.display_name,
            online_status="offline",
            health_score=0,
        )
        db.add(device)
        db.flush()

        for wan in site.wan_interfaces:
            db.add(DeviceInterface(
                device_id=device.id,
                name=wan.name,
                interface_type=wan.interface_type,
                status="down",
                ip_address=wan.ip_address,
                subnet_mask=wan.subnet_mask,
                gateway=wan.gateway,
                speed=wan.speed,
                mtu=1500,
            ))

    # 绑定设备到站点，并同步链路
    if site.device_ids:
        from app.models.device import Device as DeviceModel
        for device_id in site.device_ids:
            device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
            if device:
                device.site_id = new_site.id
                device.site_name = new_site.display_name
                # 同步设备接口为站点链路
                _sync_device_links_to_site(db, device_id, new_site.id)

    db.commit()
    db.refresh(new_site)

    return _format_site(new_site, db)


# ============================================================
#  单个站点操作端点（动态路由）
# ============================================================

@router.get("/{site_id}", response_model=Site, summary="获取站点详情")
def get_site(site_id: str, db: Session = Depends(get_db)):
    """
    获取站点详情（含链路和告警）
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )
    return _format_site(site, db)


@router.put("/{site_id}", response_model=Site, summary="更新站点")
def update_site(site_id: str, site_update: SiteUpdate, db: Session = Depends(get_db)):
    """
    更新站点信息（部分更新）
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 更新字段（排除 device_ids，单独处理）
    update_data = site_update.model_dump(exclude_unset=True, by_alias=False, exclude={"device_ids"})
    for field, value in update_data.items():
        setattr(site, field, value)

    # 处理设备绑定
    if site_update.device_ids is not None:
        from app.models.device import Device as DeviceModel
        # 先解绑当前站点的所有设备，并清除关联链路
        old_devices = db.query(DeviceModel).filter(DeviceModel.site_id == site_id).all()
        for device in old_devices:
            # 清除设备关联的链路
            _remove_device_links_from_site(db, device.id, site_id)
            device.site_id = None
            device.site_name = None

        # 绑定新设备，并同步链路
        for device_id in site_update.device_ids:
            device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
            if device:
                device.site_id = site.id
                device.site_name = site.display_name
                # 同步设备接口为站点链路
                _sync_device_links_to_site(db, device_id, site.id)

    db.commit()
    db.refresh(site)

    return _format_site(site, db)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除站点")
def delete_site(site_id: str, db: Session = Depends(get_db)):
    """
    删除站点，设备回到未分配状态
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 解绑设备，让设备回到未分配状态
    from app.models.device import Device as DeviceModel
    devices = db.query(DeviceModel).filter(DeviceModel.site_id == site_id).all()
    for device in devices:
        device.site_id = None
        device.site_name = None

    # 删除站点（级联删除链路、告警、历史）
    db.delete(site)
    db.commit()

    return None


@router.get("/{site_id}/history", response_model=List[HistoryPoint], summary="获取站点历史数据")
def get_site_history(
    site_id: str,
    time_range: str = Query("5min", description="时间范围: 5min/1hour/24hour"),
    db: Session = Depends(get_db),
):
    """
    获取站点历史数据（模拟生成）

    - **time_range**: 时间范围（5min/1hour/24hour）
    """
    # 验证站点存在
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 确定数据点数量和时间间隔
    if time_range == "5min":
        points = 12
        interval = timedelta(minutes=5)
    elif time_range == "1hour":
        points = 60
        interval = timedelta(minutes=1)
    elif time_range == "24hour":
        points = 24
        interval = timedelta(hours=1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的时间范围，允许值: 5min/1hour/24hour"
        )

    # 模拟历史数据（添加趋势、周期性波动和偶发异常）
    now = datetime.utcnow()
    history = []

    # 提取带宽数值（处理 "200 Mbps" 格式）
    def extract_bandwidth(bw_str: str) -> float:
        if not bw_str:
            return 0
        try:
            # 提取数字部分
            import re
            match = re.search(r'[\d.]+', bw_str)
            return float(match.group()) if match else 0
        except:
            return 0

    base_bandwidth = extract_bandwidth(site.bandwidth_used)

    # 生成一些随机种子，用于创建数据趋势
    import math
    trend_phase = random.random() * math.pi * 2  # 趋势相位
    anomaly_position = random.randint(0, points - 1)  # 异常点位置
    anomaly_active = random.random() < 0.3  # 30%概率出现异常

    for i in range(points):
        t = now - (points - 1 - i) * interval
        progress = i / (points - 1)  # 时间进度 0~1

        # 周期性波动（模拟真实网络的周期性变化）
        cycle = math.sin(progress * math.pi * 4 + trend_phase) * 0.15

        # 趋势变化（早期可能有波动，后期趋向稳定）
        trend = (1 - progress) * 0.1 + cycle

        # 偶发异常（模拟网络质量问题）
        anomaly = 0
        if anomaly_active and i == anomaly_position:
            anomaly = random.choice([0.3, -0.2, 0.5, -0.3])  # 突增或突降

        # 生成各项指标数据
        base_latency = max(1, site.latency)
        latency_variation = base_latency * 0.4 * (trend + anomaly)
        latency = max(0, base_latency + latency_variation + (random.random() - 0.5) * base_latency * 0.3)

        base_loss = max(0.001, site.loss)
        loss_variation = base_loss * 0.5 * (trend + anomaly)
        loss = max(0, round(base_loss + loss_variation + abs(random.random() - 0.5) * base_loss * 0.6, 3))

        base_jitter = 2  # 站点的抖动基准
        jitter_variation = base_jitter * 0.4 * (trend + anomaly)
        jitter = max(0, base_jitter + jitter_variation + (random.random() - 0.5) * base_jitter * 0.5)

        bw_cycle = math.sin(progress * math.pi * 6 + trend_phase + 1) * 0.1  # 带宽使用率的单独周期
        bandwidth_variation = base_bandwidth * (bw_cycle + anomaly * 0.5)
        bandwidth = max(0, base_bandwidth + bandwidth_variation + (random.random() - 0.5) * base_bandwidth * 0.2)

        # 吞吐量通常比使用带宽略低
        throughput = max(0, bandwidth * (0.8 + (random.random() - 0.5) * 0.15 + anomaly * 0.3))

        history.append(HistoryPoint(
            time=t.strftime("%H:%M") if time_range in ["5min", "1hour"] else t.strftime("%m-%d %H:%M"),
            latency=round(latency, 2),
            loss=loss,
            bandwidth=round(bandwidth, 2),
            jitter=round(jitter, 2),
            throughput=round(throughput, 2),
        ))

    return history


@router.post("/{site_id}/links/{link_id}/switch", response_model=LinkSwitchResponse, summary="切换站点链路")
def switch_link(site_id: str, link_id: str, db: Session = Depends(get_db)):
    """
    切换站点活跃链路

    - **link_id**: wan_links 表中的链路 ID（字符串）
    """
    # 验证站点存在
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 验证链路存在（从 wan_links 表）
    link = db.query(WanLinkModel).filter(
        and_(WanLinkModel.id == link_id, WanLinkModel.site_id == site_id)
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="链路不存在"
        )

    # 检查链路健康状态
    if link.health_status == "down":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法切换到故障链路"
        )

    # 查找之前活跃的链路
    previous_active = db.query(WanLinkModel).filter(
        and_(
            WanLinkModel.site_id == site_id,
            WanLinkModel.active_status == "active",
            WanLinkModel.id != link_id
        )
    ).first()

    previous_link_id = previous_active.id if previous_active else None

    # 更新 wan_links 表的 active_status
    # 将之前活跃的设为 standby
    if previous_active:
        previous_active.active_status = "standby"

    # 将新链路设为 active
    link.active_status = "active"

    # 记录切换事件
    from app.models.link import LinkSwitchEvent
    event = LinkSwitchEvent(
        id=f"sw-{uuid.uuid4().hex[:6]}",
        link_id=link_id,
        time=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        from_link=previous_active.name if previous_active else "无",
        to_link=link.name,
        reason=f"站点 {site.display_name} 链路切换",
    )
    db.add(event)

    db.commit()

    return LinkSwitchResponse(
        success=True,
        message="链路切换成功",
        previousLinkId=previous_link_id,
        newLinkId=link_id
    )


@router.post("/{site_id}/alerts/{alert_id}/acknowledge", response_model=AlertAcknowledgeResponse, summary="确认告警")
def acknowledge_alert(
    site_id: str,
    alert_id: str,
    request: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
):
    """
    确认告警
    """
    # 验证告警存在
    alert = db.query(SiteAlert).filter(
        and_(SiteAlert.id == int(alert_id), SiteAlert.site_id == site_id)
    ).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="告警不存在"
        )

    # 更新告警状态
    alert.acknowledged = True
    alert.acknowledged_by = request.operator
    alert.acknowledged_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    db.commit()

    return AlertAcknowledgeResponse(
        success=True,
        message="告警已确认",
        acknowledgedAt=alert.acknowledged_at
    )


@router.post("/{site_id}/alerts/{alert_id}/silence", response_model=AlertAcknowledgeResponse, summary="静默告警")
def silence_alert(
    site_id: str,
    alert_id: str,
    request: AlertSilenceRequest,
    db: Session = Depends(get_db),
):
    """
    静默告警
    """
    # 验证告警存在
    alert = db.query(SiteAlert).filter(
        and_(SiteAlert.id == int(alert_id), SiteAlert.site_id == site_id)
    ).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="告警不存在"
        )

    # 计算静默截止时间
    silence_until = (datetime.utcnow() + timedelta(minutes=request.duration_minutes)).strftime("%Y-%m-%d %H:%M:%S")

    # 更新告警状态
    alert.silenced = True
    alert.silence_until = silence_until

    db.commit()

    return AlertAcknowledgeResponse(
        success=True,
        message=f"告警已静默 {request.duration_minutes} 分钟",
        acknowledgedAt=silence_until
    )


@router.get("/{site_id}/devices", summary="获取站点下的所有设备")
def get_site_devices(site_id: str, db: Session = Depends(get_db)):
    """
    获取站点下的所有设备及统计信息

    返回该站点下的所有设备列表，以及设备统计信息（总数、在线数、离线数、主备设备数）
    """
    from app.models.device import Device as DeviceModel

    # 验证站点存在
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")

    # 获取设备列表
    devices = db.query(DeviceModel).filter(DeviceModel.site_id == site_id).all()

    # 计算统计
    total = len(devices)
    online = len([d for d in devices if d.online_status == "online"])
    offline = total - online
    active_count = len([d for d in devices if d.role == "active"])
    standby_count = total - active_count

    return {
        "site_id": site_id,
        "devices": devices,
        "stats": {
            "total": total,
            "online": online,
            "offline": offline,
            "active_count": active_count,
            "standby_count": standby_count
        }
    }


@router.get("/{site_id}/interfaces", summary="获取站点设备接口和隧道汇总")
def get_site_interfaces(site_id: str, db: Session = Depends(get_db)):
    """
    获取站点下所有设备的网络接口（WAN/LAN/MPLS/Internet）和隧道列表。
    如果没有任何主链路，自动将第一个 up 状态的接口设为主链路。
    """
    from app.models.device import Device as DeviceModel, DeviceInterface, DeviceTunnel

    # 验证站点存在
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")

    # 获取站点下所有设备
    devices = db.query(DeviceModel).filter(DeviceModel.site_id == site_id).all()
    device_ids = [d.id for d in devices]

    # 获取所有接口
    interfaces = db.query(DeviceInterface).filter(
        DeviceInterface.device_id.in_(device_ids)
    ).all() if device_ids else []

    # 获取所有隧道
    tunnels = db.query(DeviceTunnel).filter(
        DeviceTunnel.device_id.in_(device_ids)
    ).all() if device_ids else []

    # 自动设置默认主链路：如果没有主链路，将第一个 up 状态的接口设为主链路
    has_primary = any(i.is_primary for i in interfaces) or any(t.is_primary for t in tunnels)
    if not has_primary:
        # 优先从接口中找第一个 up 的
        first_up_interface = next((i for i in interfaces if i.status == "up"), None)
        if first_up_interface:
            first_up_interface.is_primary = True
            db.commit()
        else:
            # 接口没有 up 的，尝试从隧道中找
            first_up_tunnel = next((t for t in tunnels if t.status == "up"), None)
            if first_up_tunnel:
                first_up_tunnel.is_primary = True
                db.commit()

    return {
        "interfaces": [
            {
                "id": i.id,
                "name": i.name,
                "interfaceType": i.interface_type,
                "status": i.status,
                "speed": i.speed,
                "mtu": i.mtu,
                "ipAddress": i.ip_address,
                "subnetMask": i.subnet_mask,
                "gateway": i.gateway,
                "packetLoss": i.packet_loss,
                "deviceId": i.device_id,
                "isPrimary": i.is_primary or False,
            }
            for i in interfaces
        ],
        "tunnels": [
            {
                "id": t.id,
                "tunnelName": t.tunnel_name,
                "tunnelType": t.tunnel_type,
                "peerIp": t.peer_ip,
                "localIp": t.local_ip,
                "status": t.status,
                "uptime": t.uptime,
                "txBytes": t.tx_bytes,
                "rxBytes": t.rx_bytes,
                "txPps": t.tx_pps,
                "rxPps": t.rx_pps,
                "deviceId": t.device_id,
                "isPrimary": t.is_primary or False,
            }
            for t in tunnels
        ],
    }


@router.put("/{site_id}/primary-link", summary="设置站点主链路（接口或隧道）")
def set_primary_link(
    site_id: str,
    body: dict,
    db: Session = Depends(get_db)
):
    """
    设置站点的主链路，类型为 interface 或 tunnel。
    整个站点只能有一条主链路，设置新的会自动取消旧的（包括接口和隧道）。
    """
    from app.models.device import Device as DeviceModel, DeviceInterface, DeviceTunnel

    link_type = body.get("linkType")  # "interface" | "tunnel"
    link_id = body.get("linkId")

    if link_type not in ("interface", "tunnel") or not link_id:
        raise HTTPException(status_code=400, detail="参数错误：需要 linkType 和 linkId")

    # 验证站点存在
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")

    # 获取站点下所有设备ID
    devices = db.query(DeviceModel).filter(DeviceModel.site_id == site_id).all()
    device_ids = [d.id for d in devices]

    if not device_ids:
        raise HTTPException(status_code=400, detail="该站点无设备")

    # 取消该站点所有接口和隧道的主链路（整个站点只保留一条）
    db.query(DeviceInterface).filter(
        DeviceInterface.device_id.in_(device_ids),
        DeviceInterface.is_primary == True
    ).update({DeviceInterface.is_primary: False}, synchronize_session=False)

    db.query(DeviceTunnel).filter(
        DeviceTunnel.device_id.in_(device_ids),
        DeviceTunnel.is_primary == True
    ).update({DeviceTunnel.is_primary: False}, synchronize_session=False)

    # 设置目标为主链路
    if link_type == "interface":
        target = db.query(DeviceInterface).filter(
            DeviceInterface.id == link_id,
            DeviceInterface.device_id.in_(device_ids)
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="接口不存在")
        target.is_primary = True
    else:
        target = db.query(DeviceTunnel).filter(
            DeviceTunnel.id == link_id,
            DeviceTunnel.device_id.in_(device_ids)
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="隧道不存在")
        target.is_primary = True

    db.commit()
    return {"message": "主链路设置成功", "linkType": link_type, "linkId": link_id}


# ============================================================
#  辅助函数
# ============================================================

def _format_site(site: SiteModel, db: Session, include_alerts: bool = True, include_links: bool = True) -> dict:
    """将数据库模型转换为响应字典"""
    # 从 wan_links 表获取该站点的链路
    links = []
    active_link_id = ""
    if include_links:
        wan_links = db.query(WanLinkModel).filter(WanLinkModel.site_id == site.id).all()
        links = wan_links

        # 找到活跃的链路（active_status = 'active'）
        for link in wan_links:
            if link.active_status == "active":
                active_link_id = link.id
                break

        # 如果没有活跃链路，自动将第一条健康链路设为活跃
        if not active_link_id and links:
            first_healthy = next((l for l in links if l.health_status != "down"), None)
            if first_healthy:
                first_healthy.active_status = "active"
                active_link_id = first_healthy.id
                db.commit()

    # 获取告警
    alerts = []
    if include_alerts:
        alerts = db.query(SiteAlert).filter(SiteAlert.site_id == site.id).all()

    return {
        "id": site.id,
        "name": site.name,
        "displayName": site.display_name,
        "region": site.region,
        "status": site.status,
        "latency": site.latency,
        "loss": site.loss,
        "bandwidthUsage": site.bandwidth_usage,
        "bandwidthTotal": site.bandwidth_total,
        "bandwidthUsed": site.bandwidth_used,
        "deviceModel": site.device_model,
        "deviceVersion": site.device_version,
        "uptime": site.uptime,
        "address": site.address,
        "manager": site.manager,
        "serialNumber": site.serial_number,
        "managementIp": site.management_ip,
        "siteType": site.site_type or "",
        "lat": site.lat,
        "lng": site.lng,
        "links": [
            {
                "id": link.id,
                "name": link.name,
                "linkType": link.type,
                "isp": link.isp or "",
                "bandwidth": f"{link.bandwidth:.0f} Mbps" if link.bandwidth else "0 Mbps",
                "usedBandwidth": f"{link.used_bandwidth:.0f} Mbps" if link.used_bandwidth is not None else "0 Mbps",
                "usagePercent": link.utilization or 0,
                "latency": link.latency or 0,
                "loss": link.loss or 0,
                "jitter": link.jitter or 0,
                "status": link.active_status,
                "healthStatus": link.health_status,
                "ip": link.ip or "",
                "slaScore": link.sla_score or 100
            }
            for link in links
        ],
        "activeLinkId": active_link_id,
        "config": {
            "routePolicy": site.route_policy,
            "qosPolicy": site.qos_policy,
            "priority": site.priority,
            "slaLatency": site.sla_latency,
            "slaLoss": site.sla_loss
        },
        "alerts": [
            {
                "id": alert.id,
                "siteId": alert.site_id,
                "severity": alert.severity,
                "title": alert.title,
                "reason": alert.reason,
                "timestamp": alert.timestamp,
                "acknowledged": alert.acknowledged,
                "acknowledgedBy": alert.acknowledged_by,
                "acknowledgedAt": alert.acknowledged_at,
                "silenced": alert.silenced,
                "silenceUntil": alert.silence_until
            }
            for alert in alerts
        ],
        "activeWanLinkId": site.active_wan_link_id,
        "backupLinkIds": site.backup_link_ids,
        "createdAt": site.created_at.isoformat() if site.created_at else None,
        "updatedAt": site.updated_at.isoformat() if site.updated_at else None
    }


def _execute_batch_task(task_id: str, action: str, site_ids: List[str], db: Session):
    """
    执行批量操作任务（模拟实现）
    生产环境应使用 Celery 或类似异步任务队列
    """
    import time
    import threading

    def execute():
        time.sleep(1)  # 模拟延迟
        db = SessionLocal()
        try:
            # 更新任务状态
            task = db.query(BatchTask).filter(BatchTask.id == task_id).first()
            if not task:
                return

            task.status = "running"
            task.started_at = datetime.utcnow()
            db.commit()

            # 模拟执行每个站点的操作
            for site_id in site_ids:
                site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
                if not site:
                    # 站点不存在
                    result = BatchTaskResult(
                        task_id=task_id,
                        site_id=site_id,
                        site_name="",
                        status="failed",
                        error="站点不存在"
                    )
                    db.add(result)
                    continue

                # 模拟操作
                time.sleep(0.1)  # 模拟每个站点操作耗时

                # 随机成功/失败
                import random
                if random.random() < 0.1:  # 10% 失败率
                    result = BatchTaskResult(
                        task_id=task_id,
                        site_id=site_id,
                        site_name=site.display_name,
                        status="failed",
                        error="操作超时"
                    )
                else:
                    result = BatchTaskResult(
                        task_id=task_id,
                        site_id=site_id,
                        site_name=site.display_name,
                        status="success",
                        error=None
                    )

                db.add(result)
                db.commit()

            # 更新任务完成状态
            task.status = "completed"
            task.completed_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            db.rollback()
            task = db.query(BatchTask).filter(BatchTask.id == task_id).first()
            if task:
                task.status = "failed"
                task.error = str(e)
                task.completed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

    # 在后台线程执行
    thread = threading.Thread(target=execute)
    thread.start()


# ============================================================
#  站点链路配置端点
# ============================================================

@router.get("/{site_id}/link-config", summary="获取站点链路配置")
def get_site_link_config(site_id: str, db: Session = Depends(get_db)):
    """
    获取站点的主备链路配置
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 获取主链路详情
    active_link = None
    if site.active_wan_link_id:
        active_link = db.query(WanLinkModel).filter(WanLinkModel.id == site.active_wan_link_id).first()

    # 获取备用链路详情
    backup_links = []
    if site.backup_link_ids:
        backup_ids = json.loads(site.backup_link_ids)
        backup_links = db.query(WanLinkModel).filter(WanLinkModel.id.in_(backup_ids)).all()

    # 获取该站点所有可用链路（用于选择）
    available_links = db.query(WanLinkModel).filter(WanLinkModel.site_id == site_id).all()

    return {
        "siteId": site.id,
        "siteName": site.display_name,
        "activeLink": _format_link_brief(active_link) if active_link else None,
        "backupLinks": [_format_link_brief(link) for link in backup_links],
        "availableLinks": [_format_link_brief(link) for link in available_links],
    }


@router.put("/{site_id}/link-config", summary="更新站点链路配置")
def update_site_link_config(
    site_id: str,
    active_wan_link_id: Optional[str] = None,
    backup_link_ids: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    更新站点的主备链路配置

    - **active_wan_link_id**: 主链路ID
    - **backup_link_ids**: 备用链路ID列表（JSON数组字符串）
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="站点不存在"
        )

    # 更新主链路
    if active_wan_link_id is not None:
        # 验证链路存在且属于该站点
        link = db.query(WanLinkModel).filter(
            WanLinkModel.id == active_wan_link_id,
            WanLinkModel.site_id == site_id,
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="链路不存在或不属于该站点"
            )
        site.active_wan_link_id = active_wan_link_id

    # 更新备用链路
    if backup_link_ids is not None:
        # 验证 JSON 格式
        try:
            ids = json.loads(backup_link_ids)
            if not isinstance(ids, list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="backup_link_ids 必须是 JSON 数组格式"
            )
        site.backup_link_ids = backup_link_ids

    db.commit()

    return {"success": True, "message": "站点链路配置更新成功"}


def _format_link_brief(link: WanLinkModel) -> dict:
    """格式化链路简要信息"""
    return {
        "id": link.id,
        "name": link.name,
        "type": link.type,
        "deviceId": link.device_id,
        "deviceName": link.device_name,
        "healthStatus": link.health_status,
        "activeStatus": link.active_status,
        "latency": link.latency,
        "loss": link.loss,
    }
