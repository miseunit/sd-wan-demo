"""
智能选路 API — 路径推荐与策略查询
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict

from app.db import get_db
from app.models.site import Site as SiteModel
from app.models.link import WanLink as WanLinkModel
from app.models.policy import Policy as PolicyModel

router = APIRouter(prefix="/smart-routing", tags=["智能选路"])


# ============================================================
#  Schemas
# ============================================================

class PathLink(BaseModel):
    """路径中的单条链路"""
    id: str
    name: str
    type: str
    siteId: str = Field(..., alias="siteId")
    siteName: str = Field(..., alias="siteName")
    isp: str = ""
    healthStatus: str = Field(..., alias="healthStatus")
    latency: float
    loss: float
    jitter: float
    bandwidth: float
    usedBandwidth: float = Field(0, alias="usedBandwidth")
    utilization: float
    slaScore: float = Field(0, alias="slaScore")

    model_config = ConfigDict(populate_by_name=True)


class RecommendedPath(BaseModel):
    """推荐路径"""
    rank: int
    label: str
    color: str
    links: List[PathLink]
    totalLatency: float = Field(..., alias="totalLatency")
    maxLoss: float = Field(..., alias="maxLoss")
    minBandwidth: float = Field(..., alias="minBandwidth")
    avgSlaScore: float = Field(..., alias="avgSlaScore")
    reason: str

    model_config = ConfigDict(populate_by_name=True)


class PathRecommendation(BaseModel):
    """路径推荐结果"""
    sourceSiteId: str = Field(..., alias="sourceSiteId")
    sourceSiteName: str = Field(..., alias="sourceSiteName")
    destSiteId: str = Field(..., alias="destSiteId")
    destSiteName: str = Field(..., alias="destSiteName")
    appType: Optional[str] = Field(None, alias="appType")
    paths: List[RecommendedPath]
    currentPolicy: Optional[dict] = Field(None, alias="currentPolicy")

    model_config = ConfigDict(populate_by_name=True)


class AppTypeOption(BaseModel):
    """应用类型选项"""
    value: str
    label: str
    icon: str


# ============================================================
#  常量
# ============================================================

# 预置应用类型
APP_TYPES: List[AppTypeOption] = [
    AppTypeOption(value="voip", label="VoIP 语音", icon="📞"),
    AppTypeOption(value="video_conference", label="视频会议", icon="📹"),
    AppTypeOption(value="web_browsing", label="普通上网", icon="🌐"),
    AppTypeOption(value="erp", label="ERP/OA 系统", icon="💼"),
    AppTypeOption(value="file_transfer", label="文件传输", icon="📁"),
    AppTypeOption(value="custom", label="自定义", icon="⚙️"),
]

# 应用类型对延迟的要求（ms）
APP_LATENCY_REQUIREMENTS = {
    "voip": 50,
    "video_conference": 100,
    "web_browsing": 200,
    "erp": 100,
    "file_transfer": 500,
    "custom": 200,
}

# 应用类型对丢包率的要求（%）
APP_LOSS_REQUIREMENTS = {
    "voip": 0.5,
    "video_conference": 1.0,
    "web_browsing": 2.0,
    "erp": 0.5,
    "file_transfer": 5.0,
    "custom": 1.0,
}

# 路径排名标签
PATH_LABELS = [
    {"label": "推荐", "color": "#52c41a"},
    {"label": "备选", "color": "#1890ff"},
    {"label": "应急", "color": "#fa8c16"},
]


# ============================================================
#  接口
# ============================================================

@router.get("/app-types", response_model=List[AppTypeOption], summary="获取应用类型列表")
def get_app_types():
    """
    获取预置的应用类型列表
    """
    return APP_TYPES


@router.get("/recommend", response_model=PathRecommendation, summary="获取推荐路径")
def recommend_path(
    source_site_id: str = Query(..., alias="sourceSiteId", description="源站点ID"),
    dest_site_id: str = Query(..., alias="destSiteId", description="目的站点ID"),
    app_type: Optional[str] = Query(None, alias="appType", description="应用类型"),
    db: Session = Depends(get_db),
):
    """
    根据源站点和目的站点，推荐最优路径

    算法逻辑：
    1. 获取源站点的所有链路
    2. 获取目的站点的所有链路
    3. 查找同类型链路的直连路径
    4. 查找通过中间站点中转的路径
    5. 按 SLA 评分 + 应用需求综合打分排序
    6. 返回 Top 3 推荐路径
    """
    # 验证站点存在
    source_site = db.query(SiteModel).filter(SiteModel.id == source_site_id).first()
    if not source_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="源站点不存在")

    dest_site = db.query(SiteModel).filter(SiteModel.id == dest_site_id).first()
    if not dest_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="目的站点不存在")

    if source_site_id == dest_site_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="源站点和目的站点不能相同")

    # 获取两个站点的链路
    source_links = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == source_site_id,
        WanLinkModel.health_status != "down",
    ).all()

    dest_links = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == dest_site_id,
        WanLinkModel.health_status != "down",
    ).all()

    if not source_links:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="源站点没有可用链路")

    if not dest_links:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="目的站点没有可用链路")

    # 构建推荐路径
    paths = _find_paths(source_links, dest_links, source_site.display_name, dest_site.display_name, db)

    # 如果没有找到路径，用源站点链路单独构建
    if not paths:
        paths = _build_single_hop_paths(source_links, source_site.display_name, dest_site.display_name)

    # 打分排序
    scored_paths = _score_paths(paths, app_type)

    # 取 Top 3
    top_paths = scored_paths[:3]

    # 添加排名标签
    for i, path in enumerate(top_paths):
        path.rank = i + 1
        if i < len(PATH_LABELS):
            path.label = PATH_LABELS[i]["label"]
            path.color = PATH_LABELS[i]["color"]

    # 查询当前生效的策略
    current_policy = _get_current_policy(source_site_id, dest_site_id, db)

    return PathRecommendation(
        sourceSiteId=source_site_id,
        sourceSiteName=source_site.display_name,
        destSiteId=dest_site_id,
        destSiteName=dest_site.display_name,
        appType=app_type,
        paths=top_paths,
        currentPolicy=current_policy,
    )


@router.get("/source-links", summary="获取源站点链路实况")
def get_source_links(
    site_id: str = Query(..., alias="siteId", description="站点ID"),
    db: Session = Depends(get_db),
):
    """
    获取指定站点的所有链路实况数据
    用于页面底部的链路实况表格
    """
    site = db.query(SiteModel).filter(SiteModel.id == site_id).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="站点不存在")

    links = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == site_id,
    ).order_by(WanLinkModel.name).all()

    return [
        {
            "id": link.id,
            "name": link.name,
            "type": link.type,
            "isp": link.isp or "",
            "healthStatus": link.health_status,
            "activeStatus": link.active_status,
            "latency": link.latency,
            "loss": link.loss,
            "jitter": link.jitter,
            "bandwidth": link.bandwidth,
            "usedBandwidth": link.used_bandwidth,
            "utilization": link.utilization,
            "slaScore": round(link.sla_score, 1),
        }
        for link in links
    ]


# ============================================================
#  辅助函数
# ============================================================

def _link_to_path_link(link: WanLinkModel) -> PathLink:
    """将数据库链路模型转换为路径链路"""
    return PathLink(
        id=link.id,
        name=link.name,
        type=link.type,
        siteId=link.site_id,
        siteName=link.site_name,
        isp=link.isp or "",
        healthStatus=link.health_status,
        latency=link.latency,
        loss=link.loss,
        jitter=link.jitter,
        bandwidth=link.bandwidth,
        usedBandwidth=link.used_bandwidth,
        utilization=link.utilization,
        slaScore=round(link.sla_score, 1),
    )


def _find_paths(
    source_links: List[WanLinkModel],
    dest_links: List[WanLinkModel],
    source_name: str,
    dest_name: str,
    db: Session,
) -> List[RecommendedPath]:
    """
    查找源站点到目的站点的路径
    策略：
    1. 同类型直连（MPLS→MPLS, Internet→Internet, 5G→5G）
    2. 通过中间站点中转（查找 overlay 隧道链路）
    """
    paths = []

    # 策略1：同类型直连
    for sl in source_links:
        for dl in dest_links:
            if sl.type == dl.type and sl.health_status != "down" and dl.health_status != "down":
                path = RecommendedPath(
                    rank=0,
                    label="",
                    color="",
                    links=[_link_to_path_link(sl), _link_to_path_link(dl)],
                    totalLatency=round(sl.latency + dl.latency, 1),
                    maxLoss=round(max(sl.loss, dl.loss), 3),
                    minBandwidth=round(min(sl.bandwidth - sl.used_bandwidth, dl.bandwidth - dl.used_bandwidth), 1),
                    avgSlaScore=round((sl.sla_score + dl.sla_score) / 2, 1),
                    reason="",
                )
                paths.append(path)

    # 策略2：通过 overlay 隧道中转
    # 查找源站点是否有到其他站点的隧道链路
    source_tunnel_links = db.query(WanLinkModel).filter(
        WanLinkModel.site_id == source_links[0].site_id,
        WanLinkModel.link_category == "overlay",
        WanLinkModel.health_status != "down",
    ).all()

    for tunnel in source_tunnel_links:
        if tunnel.peer_site_id:
            # 查找中转站点到目的站点的链路
            transit_links = db.query(WanLinkModel).filter(
                WanLinkModel.site_id == tunnel.peer_site_id,
                WanLinkModel.health_status != "down",
            ).all()

            for tl in transit_links:
                for dl in dest_links:
                    if tl.type == dl.type and tl.id != dl.id:
                        path = RecommendedPath(
                            rank=0,
                            label="",
                            color="",
                            links=[_link_to_path_link(tunnel), _link_to_path_link(tl), _link_to_path_link(dl)],
                            totalLatency=round(tunnel.latency + tl.latency + dl.latency, 1),
                            maxLoss=round(max(tunnel.loss, tl.loss, dl.loss), 3),
                            minBandwidth=round(min(
                                tunnel.bandwidth - tunnel.used_bandwidth,
                                tl.bandwidth - tl.used_bandwidth,
                                dl.bandwidth - dl.used_bandwidth,
                            ), 1),
                            avgSlaScore=round((tunnel.sla_score + tl.sla_score + dl.sla_score) / 3, 1),
                            reason="",
                        )
                        paths.append(path)

    return paths


def _build_single_hop_paths(
    source_links: List[WanLinkModel],
    source_name: str,
    dest_name: str,
) -> List[RecommendedPath]:
    """
    当没有找到完整路径时，用源站点的链路单独构建路径
    作为降级方案
    """
    paths = []
    for link in source_links:
        if link.health_status != "down":
            path = RecommendedPath(
                rank=0,
                label="",
                color="",
                links=[_link_to_path_link(link)],
                totalLatency=round(link.latency, 1),
                maxLoss=round(link.loss, 3),
                minBandwidth=round(link.bandwidth - link.used_bandwidth, 1),
                avgSlaScore=round(link.sla_score, 1),
                reason="",
            )
            paths.append(path)
    return paths


def _score_paths(paths: List[RecommendedPath], app_type: Optional[str]) -> List[RecommendedPath]:
    """
    对路径打分并排序

    评分维度：
    - SLA 评分（权重 40%）
    - 延迟（权重 30%，越低越好）
    - 丢包率（权重 20%，越低越好）
    - 可用带宽（权重 10%，越高越好）
    """
    # 获取应用需求
    latency_req = APP_LATENCY_REQUIREMENTS.get(app_type, 200) if app_type else 200
    loss_req = APP_LOSS_REQUIREMENTS.get(app_type, 1.0) if app_type else 1.0

    for path in paths:
        # SLA 评分归一化（0-100 → 0-1）
        sla_norm = path.avgSlaScore / 100

        # 延迟评分（满足需求得满分，超出按比例扣分）
        if path.totalLatency <= latency_req:
            latency_score = 1.0
        else:
            latency_score = max(0, 1 - (path.totalLatency - latency_req) / latency_req)

        # 丢包率评分
        if path.maxLoss <= loss_req:
            loss_score = 1.0
        else:
            loss_score = max(0, 1 - (path.maxLoss - loss_req) / loss_req)

        # 带宽评分（100Mbps 以上满分）
        bandwidth_score = min(1, path.minBandwidth / 100)

        # 综合得分
        score = sla_norm * 0.4 + latency_score * 0.3 + loss_score * 0.2 + bandwidth_score * 0.1
        path.avgSlaScore = round(score * 100, 1)  # 用综合得分替换原始 SLA 得分

        # 生成推荐理由
        path.reason = _generate_reason(path, latency_req, loss_req, app_type)

    # 按得分降序排序
    paths.sort(key=lambda p: p.avgSlaScore, reverse=True)
    return paths


def _generate_reason(path: RecommendedPath, latency_req: float, loss_req: float, app_type: Optional[str]) -> str:
    """生成推荐理由"""
    reasons = []

    # 延迟评价
    if path.totalLatency <= latency_req:
        reasons.append(f"延迟 {path.totalLatency}ms 满足要求(<{latency_req}ms)")
    else:
        reasons.append(f"延迟 {path.totalLatency}ms 超出要求(>{latency_req}ms)")

    # 丢包率评价
    if path.maxLoss <= loss_req:
        reasons.append(f"丢包率 {path.maxLoss}% 达标")
    else:
        reasons.append(f"丢包率 {path.maxLoss}% 偏高")

    # 链路健康度
    healthy_count = sum(1 for l in path.links if l.healthStatus == "healthy")
    total_count = len(path.links)
    if healthy_count == total_count:
        reasons.append("所有链路健康")
    else:
        reasons.append(f"{total_count - healthy_count}/{total_count} 条链路劣化")

    # 带宽
    if path.minBandwidth > 50:
        reasons.append(f"可用带宽充足({path.minBandwidth}Mbps)")
    elif path.minBandwidth > 0:
        reasons.append(f"可用带宽一般({path.minBandwidth}Mbps)")

    return "；".join(reasons)


def _get_current_policy(source_site_id: str, dest_site_id: str, db: Session) -> Optional[dict]:
    """查询当前生效的选路策略"""
    # 查找关联了源站点或目的站点的路由/应用感知策略
    policies = db.query(PolicyModel).filter(
        PolicyModel.type.in_(["route", "app_aware", "qos"]),
        PolicyModel.status == "active",
    ).all()

    for policy in policies:
        applied = policy.applied_sites.split(",") if policy.applied_sites else []
        if source_site_id in applied or dest_site_id in applied:
            return {
                "id": policy.id,
                "name": policy.name,
                "type": policy.type,
                "priority": policy.priority,
                "actionConfig": json.loads(policy.action_config) if policy.action_config else None,
            }

    return None
