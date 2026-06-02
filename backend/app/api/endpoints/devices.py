"""
设备管理 API 路由
"""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_, func

from app.db import get_db
from app.models.device import (
    Device as DeviceModel,
    DeviceInterface as DeviceInterfaceModel,
    DeviceTunnel as DeviceTunnelModel,
    DeviceAlert as DeviceAlertModel,
    DeviceUpgrade as DeviceUpgradeModel
)
from app.schemas.device import (
    DeviceCreate, DeviceUpdate, Device, DeviceDetail,
    DeviceListResponse, DeviceStats, DeviceAction, DeviceActionResponse,
    DeviceInterface, DeviceTunnel, DeviceAlert, DeviceUpgrade,
    DeviceInterfaceBase, DeviceTunnelBase, DeviceAlertBase, PaginatedDevices,
)

router = APIRouter(prefix="/devices", tags=["设备管理"])


# ========== 辅助函数 ==========

def calculate_health_score(device: Device) -> int:
    """计算设备健康评分"""
    score = 100

    # CPU 扣分
    if device.cpu_usage > 90:
        score -= 30
    elif device.cpu_usage > 70:
        score -= 15
    elif device.cpu_usage > 50:
        score -= 5

    # 内存扣分
    if device.memory_usage > 90:
        score -= 20
    elif device.memory_usage > 70:
        score -= 10

    # 温度扣分
    if device.temperature:
        if device.temperature > 80:
            score -= 20
        elif device.temperature > 70:
            score -= 10

    # 离线状态大幅扣分
    if device.online_status != "online":
        score -= 50

    # 同步失败扣分
    if device.sync_status == "failed":
        score -= 15

    # 告警数量扣分
    active_alerts = len([a for a in device.alerts if not a.resolved])
    if active_alerts > 0:
        score -= min(20, active_alerts * 5)

    return max(0, min(100, score))


def get_device_stats(db: Session) -> DeviceStats:
    """获取设备统计"""
    total = db.query(func.count(DeviceModel.id)).scalar()
    online = db.query(func.count(DeviceModel.id)).filter(DeviceModel.online_status == "online").scalar()
    offline = total - online

    # 根据健康评分统计
    healthy = db.query(func.count(DeviceModel.id)).filter(DeviceModel.health_score >= 80).scalar()
    warning = db.query(func.count(DeviceModel.id)).filter(
        and_(DeviceModel.health_score >= 60, DeviceModel.health_score < 80)
    ).scalar()
    critical = db.query(func.count(DeviceModel.id)).filter(DeviceModel.health_score < 60).scalar()

    upgrading = db.query(func.count(DeviceModel.id)).filter(
        DeviceModel.upgrade_status.in_(["downloading", "installing"])
    ).scalar()

    return DeviceStats(
        total=total or 0,
        online=online or 0,
        offline=offline or 0,
        healthy=healthy or 0,
        warning=warning or 0,
        critical=critical or 0,
        upgrading=upgrading or 0
    )


# ========== API Endpoints ==========

@router.get("", response_model=PaginatedDevices)
def list_devices(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    pageSize: int = Query(10, ge=1, le=500, alias="pageSize", description="每页记录数"),
    device_type: Optional[str] = Query(None, description="设备类型筛选"),
    online_status: Optional[str] = Query(None, description="在线状态筛选"),
    site_id: Optional[str] = Query(None, description="站点ID筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db)
):
    """获取设备列表（分页）"""
    query = db.query(DeviceModel)

    # 筛选
    if device_type:
        query = query.filter(DeviceModel.device_type == device_type)
    if online_status:
        query = query.filter(DeviceModel.online_status == online_status)
    if site_id:
        query = query.filter(DeviceModel.site_id == site_id)
    if search:
        query = query.filter(
            or_(
                DeviceModel.name.ilike(f"%{search}%"),
                DeviceModel.site_name.ilike(f"%{search}%")
            )
        )

    # 获取总数
    total = query.count()

    # 计算 skip 值并获取分页数据
    skip = (page - 1) * pageSize
    items = query.order_by(DeviceModel.name).offset(skip).limit(pageSize).all()

    # 计算总页数
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 1

    return PaginatedDevices(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/stats", response_model=DeviceStats)
def get_stats(db: Session = Depends(get_db)):
    """获取设备统计"""
    return get_device_stats(db)


@router.get("/{device_id}", response_model=DeviceDetail)
def get_device(device_id: str, db: Session = Depends(get_db)):
    """获取设备详情"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    return device


@router.post("", response_model=Device, status_code=201)
def create_device(device_data: DeviceCreate, db: Session = Depends(get_db)):
    """创建设备"""
    # 检查设备名称是否已存在
    existing = db.query(DeviceModel).filter(DeviceModel.name == device_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="设备名称已存在")

    # 生成设备ID
    device_id = f"device-{device_data.name.lower().replace('_', '-')}-{datetime.now().strftime('%Y%m%d')}"

    # 获取站点名称
    site_name = None
    if device_data.site_id:
        from app.models.site import Site
        site = db.query(Site).filter(Site.id == device_data.site_id).first()
        if site:
            site_name = site.display_name

    # 判断绑定状态
    is_bound = bool(device_data.serial_number)

    # 创建设备
    db_device = DeviceModel(
        id=device_id,
        name=device_data.name,
        device_type=device_data.device_type,
        site_id=device_data.site_id,
        site_name=site_name,
        firmware_version=device_data.firmware_version,
        health_score=100,
        serial_number=device_data.serial_number,
        management_ip=device_data.management_ip,
        mac_address=device_data.mac_address,
        bind_status="bound" if is_bound else "unbound",
        bound_at=datetime.utcnow() if is_bound else None,
    )

    db.add(db_device)
    db.commit()
    db.refresh(db_device)

    return db_device


@router.put("/{device_id}", response_model=Device)
def update_device(
    device_id: str,
    device_data: DeviceUpdate,
    db: Session = Depends(get_db)
):
    """更新设备"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    # 更新字段
    update_data = device_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    # 重新计算健康评分
    device.health_score = calculate_health_score(device)
    device.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(device)

    return device


@router.delete("/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    """删除设备"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    db.delete(device)
    db.commit()

    return {"message": "设备已删除"}


@router.post("/{device_id}/action", response_model=DeviceActionResponse)
def device_action(
    device_id: str,
    action: DeviceAction,
    db: Session = Depends(get_db)
):
    """执行设备操作"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    action_type = action.action
    task_id = f"task-{device_id}-{action_type}-{int(datetime.now().timestamp())}"

    if action_type == "restart":
        # 模拟重启设备
        device.online_status = "offline"
        device.heartbeat_status = "unknown"
        device.sync_status = "pending"
        db.commit()

        return DeviceActionResponse(
            success=True,
            message="设备重启指令已下发",
            task_id=task_id
        )

    elif action_type == "sync_config":
        # 模拟配置同步
        device.sync_status = "pending"
        device.sync_error = None
        db.commit()

        return DeviceActionResponse(
            success=True,
            message="配置同步任务已创建",
            task_id=task_id
        )

    elif action_type == "start_upgrade":
        # 开始升级
        target_version = action.params.get("target_version") if action.params else "20.4.0"
        device.upgrade_status = "downloading"
        device.upgrade_progress = 0
        device.target_version = target_version
        device.can_upgrade = False
        db.commit()

        # 创建升级记录
        upgrade = DeviceUpgrade(
            device_id=device_id,
            from_version=device.firmware_version,
            to_version=target_version,
            status="downloading",
            progress=0,
            started_at=datetime.utcnow()
        )
        db.add(upgrade)
        db.commit()

        return DeviceActionResponse(
            success=True,
            message=f"固件升级已开始，目标版本: {target_version}",
            task_id=task_id
        )

    elif action_type == "rollback":
        # 回滚
        if not device.upgrade_history:
            raise HTTPException(status_code=400, detail="没有可回滚的版本")

        last_upgrade = device.upgrade_history[-1]
        device.upgrade_status = "rollback"
        device.target_version = last_upgrade.from_version
        db.commit()

        return DeviceActionResponse(
            success=True,
            message=f"回滚至版本 {last_upgrade.from_version} 已启动",
            task_id=task_id
        )

    else:
        raise HTTPException(status_code=400, detail="不支持的操作类型")


# ========== 接口管理 ==========

@router.get("/{device_id}/interfaces", response_model=List[DeviceInterface])
def get_device_interfaces(device_id: str, db: Session = Depends(get_db)):
    """获取设备接口列表"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    return device.interfaces


@router.post("/{device_id}/interfaces", response_model=DeviceInterface, status_code=201)
def create_device_interface(
    device_id: str,
    interface_data: DeviceInterfaceBase,
    db: Session = Depends(get_db)
):
    """创建设备接口"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    db_interface = DeviceInterface(device_id=device_id, **interface_data.model_dump())
    db.add(db_interface)
    db.commit()
    db.refresh(db_interface)

    return db_interface


# ========== 隧道管理 ==========

@router.get("/{device_id}/tunnels", response_model=List[DeviceTunnel])
def get_device_tunnels(device_id: str, db: Session = Depends(get_db)):
    """获取设备隧道列表"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    return device.tunnels


@router.post("/{device_id}/tunnels", response_model=DeviceTunnel, status_code=201)
def create_device_tunnel(
    device_id: str,
    tunnel_data: DeviceTunnelBase,
    db: Session = Depends(get_db)
):
    """创建设备隧道"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    db_tunnel = DeviceTunnel(device_id=device_id, **tunnel_data.model_dump())
    db.add(db_tunnel)
    db.commit()
    db.refresh(db_tunnel)

    return db_tunnel


# ========== 告警管理 ==========

@router.get("/{device_id}/alerts", response_model=List[DeviceAlert])
def get_device_alerts(
    device_id: str,
    unresolved_only: bool = Query(False, description="仅显示未解决告警"),
    db: Session = Depends(get_db)
):
    """获取设备告警列表"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    alerts = device.alerts
    if unresolved_only:
        alerts = [a for a in alerts if not a.resolved]

    return alerts


@router.post("/{device_id}/alerts", response_model=DeviceAlert, status_code=201)
def create_device_alert(
    device_id: str,
    alert_data: DeviceAlertBase,
    db: Session = Depends(get_db)
):
    """创建设备告警"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    db_alert = DeviceAlert(device_id=device_id, **alert_data.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)

    # 更新设备健康评分
    device.health_score = calculate_health_score(device)
    db.commit()

    return db_alert


@router.put("/{device_id}/alerts/{alert_id}/resolve")
def resolve_alert(device_id: str, alert_id: int, db: Session = Depends(get_db)):
    """解决告警"""
    alert = db.query(DeviceAlertModel).filter(
        and_(DeviceAlertModel.id == alert_id, DeviceAlertModel.device_id == device_id)
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")

    alert.resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()

    # 更新设备健康评分
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if device:
        device.health_score = calculate_health_score(device)
        db.commit()

    return {"message": "告警已标记为已解决"}


# ========== 升级管理 ==========

@router.get("/{device_id}/upgrades", response_model=List[DeviceUpgrade])
def get_device_upgrades(device_id: str, db: Session = Depends(get_db)):
    """获取设备升级记录"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    return device.upgrade_history


# ========== 网络诊断功能 ==========

from fastapi import BackgroundTasks
from app.services.network_diagnostics import NetworkDiagnosticsService, LinkMonitor
from app.models.diagnostics import PingHistory, TracerouteHistory, LinkProbeHistory
from app.schemas.diagnostics import (
    PingRequest, PingResult, PingHistoryList,
    TracerouteRequest, TracerouteResult, TracerouteHistoryList,
    LinkProbeRequest, LinkProbeResult, LinkProbeHistoryList,
    SLAScore, SLAMetrics, BatchPingRequest, BatchPingResult,
    TracerouteHop,
)


@router.post("/{device_id}/diagnostics/ping", response_model=PingResult)
async def ping_device(
    device_id: str,
    request: PingRequest = PingRequest(),
    db: Session = Depends(get_db)
):
    """
    对设备执行 Ping 测试
    - target: 可选，不传则使用设备管理的第一个接口IP
    - count: 发送包数（默认5，最大20）
    - interval: 发送间隔秒数（默认1）
    - timeout: 超时时间秒数（默认2）
    """
    # 获取设备信息
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    # 确定目标IP
    target = request.target
    if not target:
        # 使用设备的第一个接口IP
        if device.interfaces:
            target = device.interfaces[0].ip_address
        else:
            raise HTTPException(status_code=400, detail="设备无可用接口IP")

    try:
        # 执行 Ping
        result = await NetworkDiagnosticsService.ping_target(
            target=target,
            count=request.count,
            interval=request.interval,
            timeout=request.timeout,
            packet_size=request.packet_size
        )

        # 保存历史记录
        history = PingHistory(
            device_id=device_id,
            target=target,
            timestamp=datetime.utcnow(),
            is_alive=result["is_alive"],
            packets_sent=result["packets_sent"],
            packets_received=result["packets_received"],
            packet_loss=result["packet_loss"],
            min_rtt=result.get("min_rtt"),
            max_rtt=result.get("max_rtt"),
            avg_rtt=result.get("avg_rtt"),
            jitter=result.get("jitter"),
            count=request.count,
            interval=request.interval,
            timeout=request.timeout
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        return PingResult(
            id=history.id,
            device_id=device_id,
            target=target,
            timestamp=history.timestamp,
            **result
        )

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}/diagnostics/ping/history", response_model=PingHistoryList)
def get_ping_history(
    device_id: str,
    limit: int = Query(100, ge=1, le=500, description="返回记录数限制"),
    db: Session = Depends(get_db)
):
    """获取设备 Ping 历史记录"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    history = db.query(PingHistory).filter(
        PingHistory.device_id == device_id
    ).order_by(PingHistory.timestamp.desc()).limit(limit).all()

    return PingHistoryList(
        items=history,
        total=len(history),
        page=1,
        pageSize=limit,
        totalPages=1
    )


@router.post("/{device_id}/diagnostics/traceroute", response_model=TracerouteResult)
async def traceroute_device(
    device_id: str,
    request: TracerouteRequest = TracerouteRequest(),
    db: Session = Depends(get_db)
):
    """
    对设备执行 Traceroute 测试
    - destination: 可选，不传则使用设备管理的第一个接口IP
    - max_hops: 最大跳数（默认30）
    - timeout: 超时时间秒数（默认2）
    """
    # 获取设备信息
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    # 确定目标IP
    destination = request.destination
    if not destination:
        if device.interfaces:
            destination = device.interfaces[0].ip_address
        else:
            raise HTTPException(status_code=400, detail="设备无可用接口IP")

    try:
        # 执行 Traceroute
        result = await NetworkDiagnosticsService.traceroute_target(
            destination=destination,
            max_hops=request.max_hops,
            timeout=request.timeout,
            destination_port=request.destination_port
        )

        # 保存历史记录
        history = TracerouteHistory(
            device_id=device_id,
            destination=destination,
            timestamp=datetime.utcnow(),
            reached=result["reached"],
            total_hops=result["total_hops"],
            hops=result["hops"],
            max_hops=request.max_hops,
            timeout=request.timeout,
            has_timeout=result["has_timeout"],
            timeout_hop=result["timeout_hop"]
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        # 转换跳数信息
        hops = [TracerouteHop(**hop) for hop in result["hops"]]

        return TracerouteResult(
            id=history.id,
            device_id=device_id,
            destination=destination,
            timestamp=history.timestamp,
            reached=result["reached"],
            total_hops=result["total_hops"],
            hops=hops,
            max_hops=request.max_hops,
            timeout=request.timeout,
            has_timeout=result["has_timeout"],
            timeout_hop=result["timeout_hop"]
        )

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{device_id}/diagnostics/traceroute/history", response_model=TracerouteHistoryList)
def get_traceroute_history(
    device_id: str,
    limit: int = Query(50, ge=1, le=500, description="返回记录数限制"),
    db: Session = Depends(get_db)
):
    """获取设备 Traceroute 历史记录"""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    history = db.query(TracerouteHistory).filter(
        TracerouteHistory.device_id == device_id
    ).order_by(TracerouteHistory.timestamp.desc()).limit(limit).all()

    # 转换跳数信息
    items = []
    for h in history:
        hops = [TracerouteHop(**hop) for hop in (h.hops or [])]
        items.append(TracerouteResult(
            id=h.id,
            device_id=h.device_id,
            destination=h.destination,
            timestamp=h.timestamp,
            reached=h.reached,
            total_hops=h.total_hops,
            hops=hops,
            max_hops=h.max_hops,
            timeout=h.timeout,
            has_timeout=h.has_timeout,
            timeout_hop=h.timeout_hop
        ))

    return TracerouteHistoryList(
        items=items,
        total=len(items),
        page=1,
        pageSize=limit,
        totalPages=1
    )


@router.post("/diagnostics/batch-ping")
async def batch_ping(
    request: BatchPingRequest,
    db: Session = Depends(get_db)
):
    """
    批量 Ping 多个设备
    - device_ids: 设备ID列表
    - count: 发送包数（默认5）
    - timeout: 超时时间（默认2）
    """
    results = []

    for device_id in request.device_ids:
        device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
        if not device:
            results.append(BatchPingResult(
                device_id=device_id,
                device_name="Unknown",
                target="",
                success=False,
                error="设备不存在"
            ))
            continue

        # 获取目标IP
        target = None
        if device.interfaces:
            target = device.interfaces[0].ip_address

        if not target:
            results.append(BatchPingResult(
                device_id=device_id,
                device_name=device.name,
                target="",
                success=False,
                error="设备无可用接口IP"
            ))
            continue

        try:
            result = await NetworkDiagnosticsService.ping_target(
                target=target,
                count=request.count,
                timeout=request.timeout
            )

            results.append(BatchPingResult(
                device_id=device_id,
                device_name=device.name,
                target=target,
                success=True,
                is_alive=result["is_alive"],
                avg_rtt=result.get("avg_rtt"),
                packet_loss=result.get("packet_loss")
            ))

        except Exception as e:
            results.append(BatchPingResult(
                device_id=device_id,
                device_name=device.name,
                target=target,
                success=False,
                error=str(e)
            ))

    return {"results": results}


@router.get("/links/{link_id}/probe/start")
async def start_link_probe(
    link_id: str,
    interval: int = Query(5, ge=1, le=60, description="探测间隔(秒)"),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    启动链路持续探测（后台任务）
    - interval: 探测间隔秒数（默认5）
    """
    from app.models.link import WanLink

    link = db.query(WanLink).filter(WanLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="链路不存在")

    # 检查是否已在监控
    if link_id in LinkMonitor.get_active_monitors():
        raise HTTPException(status_code=400, detail="链路已在监控中")

    # 启动后台任务
    if background_tasks:
        background_tasks.add_task(
            LinkMonitor.continuous_probe,
            link_id=link_id,
            target=link.ip,
            interval=interval,
            db_session=db
        )

    return {"message": "链路探测已启动", "link_id": link_id}


@router.get("/links/{link_id}/probe/stop")
def stop_link_probe(link_id: str):
    """停止链路探测"""
    if link_id not in LinkMonitor.get_active_monitors():
        raise HTTPException(status_code=400, detail="链路未在监控中")

    LinkMonitor.stop_monitoring(link_id)
    return {"message": "链路探测已停止", "link_id": link_id}


@router.get("/links/probe/active")
def get_active_probes():
    """获取所有活跃的链路探测任务"""
    active_monitors = LinkMonitor.get_active_monitors()
    return {
        "active_probes": active_monitors,
        "count": len(active_monitors)
    }


@router.get("/links/{link_id}/probe/history", response_model=LinkProbeHistoryList)
def get_link_probe_history(
    link_id: str,
    limit: int = Query(100, ge=1, le=500, description="返回记录数限制"),
    db: Session = Depends(get_db)
):
    """获取链路探测历史记录"""
    from app.models.link import WanLink

    link = db.query(WanLink).filter(WanLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="链路不存在")

    history = db.query(LinkProbeHistory).filter(
        LinkProbeHistory.link_id == link_id
    ).order_by(LinkProbeHistory.timestamp.desc()).limit(limit).all()

    return LinkProbeHistoryList(
        items=history,
        total=len(history),
        page=1,
        pageSize=limit,
        totalPages=1
    )


@router.post("/sla/calculate", response_model=SLAScore)
def calculate_sla(metrics: SLAMetrics):
    """
    计算 SLA 评分
    - latency: 延迟(ms)
    - loss: 丢包率(%)
    - jitter: 抖动(ms)
    """
    result = NetworkDiagnosticsService.get_sla_details(
        latency=metrics.latency,
        loss=metrics.packet_loss,
        jitter=metrics.jitter
    )
    return result
