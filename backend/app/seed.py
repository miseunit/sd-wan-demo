"""
种子数据模块 - 统一管理所有初始数据
启动时自动将数据写入数据库，无需手动运行 init 脚本
"""
import json
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.site import Site, SiteLink, SiteAlert, SiteHistory
from app.models.policy import Policy
from app.models.device import Device, DeviceInterface, DeviceTunnel, DeviceAlert, DeviceUpgrade
from app.models.alert import Alert, AlertHistory
from app.models.dashboard import DashboardTopologyLink, ApplicationSla, IspBandwidth
from app.models.link import WanLink, LinkSwitchEvent, LinkAlert
from app.core.security import get_password_hash


def seed_all(db: Session):
    """
    执行全部种子数据初始化
    按依赖顺序：用户 -> 站点 -> 策略 -> 设备 -> 告警 -> Dashboard
    """
    _seed_users(db)
    _seed_sites(db)
    _seed_policies(db)
    _seed_devices(db)
    _seed_alerts(db)
    _seed_dashboard(db)
    _link_site_and_wan_links(db)
    _seed_link_metrics_history(db)  # 生成链路历史监控数据


# ============================================================
#  用户种子数据
# ============================================================

def _seed_users(db: Session):
    """初始化管理员用户"""
    if db.query(User).count() > 0:
        return

    admin = User(
        username="admin",
        email="admin@sdwan.local",
        hashed_password=get_password_hash("secret"),
        full_name="系统管理员",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
    db.commit()
    print("[seed] 创建管理员用户: admin / secret")


# ============================================================
#  站点种子数据
# ============================================================

_SITES = [
    {"id": "site-bj-hq", "name": "BJ-DC", "display_name": "北京总部", "region": "CN",
     "status": "online", "latency": 2, "loss": 0, "bandwidth_usage": 45,
     "bandwidth_used": "450 Mbps", "bandwidth_total": "1 Gbps",
     "device_model": "vEdge-1000", "device_version": "vEdge-17.6.3",
     "uptime": "120d 5h 20m", "route_policy": "HQ-集中出口策略", "qos_policy": "企业级 QoS",
     "priority": "high", "sla_latency": 10, "sla_loss": 0.1,
     "lat": 39.9042, "lng": 116.4074, "site_type": "hq", "sla": 99.2, "active_tunnels": 11,
     "address": "北京市朝阳区望京SOHO T1", "manager": "张伟",
     "serial_number": "CPE-BJ-001", "management_ip": "10.0.1.1"},
    {"id": "site-sh", "name": "SH-POP", "display_name": "上海分支", "region": "CN",
     "status": "online", "latency": 12, "loss": 0.01, "bandwidth_usage": 38,
     "bandwidth_used": "76 Mbps", "bandwidth_total": "200 Mbps",
     "device_model": "vEdge-2000", "device_version": "vEdge-17.6.3",
     "uptime": "60d 14h 10m", "route_policy": "分支间直连策略", "qos_policy": "视频会议 QoS",
     "priority": "high", "sla_latency": 20, "sla_loss": 0.05,
     "lat": 31.2304, "lng": 121.4737, "site_type": "branch", "sla": 98.5, "active_tunnels": 3,
     "address": "上海市浦东新区陆家嘴金融中心", "manager": "李明",
     "serial_number": "CPE-SH-001", "management_ip": "10.0.2.1"},
    {"id": "site-gz", "name": "GZ-POP", "display_name": "广州分支", "region": "CN",
     "status": "online", "latency": 15, "loss": 0, "bandwidth_usage": 25,
     "bandwidth_used": "25 Mbps", "bandwidth_total": "100 Mbps",
     "device_model": "vEdge-100", "device_version": "vEdge-17.6.3",
     "uptime": "30d 22h 15m", "route_policy": "分支间直连策略", "qos_policy": "ERP 系统 QoS",
     "priority": "medium", "sla_latency": 20, "sla_loss": 0.05,
     "lat": 23.1291, "lng": 113.2644, "site_type": "branch", "sla": 97.8, "active_tunnels": 3,
     "address": "广州市天河区珠江新城华夏路", "manager": "王芳",
     "serial_number": "CPE-GZ-001", "management_ip": "10.0.3.1"},
    {"id": "site-sz", "name": "SZ-POP", "display_name": "深圳分支", "region": "CN",
     "status": "online", "latency": 18, "loss": 0.02, "bandwidth_usage": 55,
     "bandwidth_used": "66 Mbps", "bandwidth_total": "120 Mbps",
     "device_model": "vEdge-2000", "device_version": "vEdge-17.6.3",
     "uptime": "55d 10h 45m", "route_policy": "分支间直连策略", "qos_policy": "ERP 系统 QoS",
     "priority": "medium", "sla_latency": 25, "sla_loss": 0.05,
     "lat": 22.5431, "lng": 114.0579, "site_type": "branch", "sla": 99.1, "active_tunnels": 2,
     "address": "深圳市南山区科技园南区", "manager": "刘洋",
     "serial_number": "CPE-SZ-001", "management_ip": "10.0.4.1"},
    {"id": "site-cd", "name": "CD-POP", "display_name": "成都分支", "region": "CN",
     "status": "warning", "latency": 50, "loss": 0.3, "bandwidth_usage": 78,
     "bandwidth_used": "62 Mbps", "bandwidth_total": "80 Mbps",
     "device_model": "vEdge-2000", "device_version": "vEdge-17.6.2",
     "uptime": "15d 6h 20m", "route_policy": "分支间直连策略", "qos_policy": "默认 QoS",
     "priority": "low", "sla_latency": 30, "sla_loss": 0.1,
     "lat": 30.5728, "lng": 104.0668, "site_type": "branch", "sla": 88.5, "active_tunnels": 2,
     "address": "成都市高新区天府大道北段", "manager": "赵强",
     "serial_number": "CPE-CD-001", "management_ip": "10.0.5.1"},
    {"id": "site-wh", "name": "WH-POP", "display_name": "武汉分支", "region": "CN",
     "status": "online", "latency": 22, "loss": 0, "bandwidth_usage": 30,
     "bandwidth_used": "24 Mbps", "bandwidth_total": "80 Mbps",
     "device_model": "vEdge-100", "device_version": "vEdge-17.6.3",
     "uptime": "40d 16h 55m", "route_policy": "分支间直连策略", "qos_policy": "默认 QoS",
     "priority": "medium", "sla_latency": 30, "sla_loss": 0.05,
     "lat": 30.5928, "lng": 114.3055, "site_type": "branch", "sla": 96.2, "active_tunnels": 2,
     "address": "武汉市洪山区光谷广场", "manager": "孙丽",
     "serial_number": "CPE-WH-001", "management_ip": "10.0.6.1"},
    {"id": "site-nj", "name": "NJ-POP", "display_name": "南京分支", "region": "CN",
     "status": "online", "latency": 8, "loss": 0, "bandwidth_usage": 20,
     "bandwidth_used": "20 Mbps", "bandwidth_total": "100 Mbps",
     "device_model": "vEdge-100", "device_version": "vEdge-17.6.3",
     "uptime": "75d 3h 40m", "route_policy": "分支间直连策略", "qos_policy": "默认 QoS",
     "priority": "medium", "sla_latency": 15, "sla_loss": 0.05,
     "lat": 32.0603, "lng": 118.7969, "site_type": "branch", "sla": 99.5, "active_tunnels": 2,
     "address": "南京市鼓楼区新街口商务楼", "manager": "周磊",
     "serial_number": "CPE-NJ-001", "management_ip": "10.0.7.1"},
    {"id": "site-hz", "name": "HZ-POP", "display_name": "杭州分支", "region": "CN",
     "status": "online", "latency": 10, "loss": 0, "bandwidth_usage": 18,
     "bandwidth_used": "18 Mbps", "bandwidth_total": "100 Mbps",
     "device_model": "vEdge-100", "device_version": "vEdge-17.6.3",
     "uptime": "90d 7h 12m", "route_policy": "分支间直连策略", "qos_policy": "视频会议 QoS",
     "priority": "medium", "sla_latency": 15, "sla_loss": 0.05,
     "lat": 30.2741, "lng": 120.1551, "site_type": "branch", "sla": 98.9, "active_tunnels": 2,
     "address": "杭州市西湖区文三路互联网产业园", "manager": "吴秀英",
     "serial_number": "CPE-HZ-001", "management_ip": "10.0.8.1"},
    {"id": "site-xa", "name": "XA-POP", "display_name": "西安分支", "region": "CN",
     "status": "online", "latency": 30, "loss": 0.05, "bandwidth_usage": 28,
     "bandwidth_used": "28 Mbps", "bandwidth_total": "100 Mbps",
     "device_model": "vEdge-100", "device_version": "vEdge-17.6.3",
     "uptime": "50d 11h 20m", "route_policy": "分支间直连策略", "qos_policy": "默认 QoS",
     "priority": "medium", "sla_latency": 35, "sla_loss": 0.05,
     "lat": 34.3416, "lng": 108.9398, "site_type": "branch", "sla": 91.3, "active_tunnels": 2,
     "address": "西安市雁塔区高新区科技路", "manager": "陈刚",
     "serial_number": "CPE-XA-001", "management_ip": "10.0.9.1"},
    {"id": "site-aws-tokyo", "name": "AWS-Tokyo", "display_name": "AWS 东京", "region": "SG",
     "status": "online", "latency": 68, "loss": 0.02, "bandwidth_usage": 42,
     "bandwidth_used": "210 Mbps", "bandwidth_total": "500 Mbps",
     "device_model": "vEdge-Cloud-SG", "device_version": "vEdge-17.6.3",
     "uptime": "90d 3h 12m", "route_policy": "亚太区域直连策略", "qos_policy": "国际链路 QoS",
     "priority": "high", "sla_latency": 80, "sla_loss": 0.1,
     "lat": 35.6762, "lng": 139.6503, "site_type": "cloud", "cloud_provider": "AWS",
     "sla": 99.9, "active_tunnels": 1,
     "address": "AWS Tokyo Region (ap-northeast-1)", "manager": "田中太郎",
     "serial_number": "CPE-AWS-TKY-001", "management_ip": "10.0.10.1"},
    {"id": "site-azure-sg", "name": "Azure-SG", "display_name": "Azure 新加坡", "region": "SG",
     "status": "online", "latency": 85, "loss": 0.03, "bandwidth_usage": 35,
     "bandwidth_used": "105 Mbps", "bandwidth_total": "300 Mbps",
     "device_model": "vEdge-Cloud-SG", "device_version": "vEdge-17.6.3",
     "uptime": "80d 6h 30m", "route_policy": "亚太区域直连策略", "qos_policy": "国际链路 QoS",
     "priority": "high", "sla_latency": 100, "sla_loss": 0.1,
     "lat": 1.3521, "lng": 103.8198, "site_type": "cloud", "cloud_provider": "Azure",
     "sla": 99.8, "active_tunnels": 1,
     "address": "Azure Singapore Region (southeastasia)", "manager": "Lee Wei Ming",
     "serial_number": "CPE-AZR-SG-001", "management_ip": "10.0.11.1"},
    {"id": "site-gcp-hk", "name": "GCP-HK", "display_name": "GCP 香港", "region": "SG",
     "status": "online", "latency": 42, "loss": 0.01, "bandwidth_usage": 30,
     "bandwidth_used": "60 Mbps", "bandwidth_total": "200 Mbps",
     "device_model": "vEdge-Cloud-SG", "device_version": "vEdge-17.6.3",
     "uptime": "70d 9h 15m", "route_policy": "亚太区域直连策略", "qos_policy": "国际链路 QoS",
     "priority": "high", "sla_latency": 60, "sla_loss": 0.1,
     "lat": 22.3193, "lng": 114.1694, "site_type": "cloud", "cloud_provider": "GCP",
     "sla": 99.7, "active_tunnels": 1,
     "address": "GCP Hong Kong Region (asia-east2)", "manager": "Chan Tai Man",
     "serial_number": "CPE-GCP-HK-001", "management_ip": "10.0.12.1"},
]

_ISPS = {
    "CN": ["中国电信", "中国联通", "中国移动"],
    "SG": ["Singtel", "StarHub", "MobileOne"],
    "US": ["AT&T", "Comcast", "Verizon"],
    "EU": ["Deutsche Telekom", "Vodafone", "BT"],
}


def _seed_sites(db: Session):
    """初始化站点、链路、站点告警"""
    if db.query(Site).count() > 0:
        return

    for data in _SITES:
        site = Site(**data)
        db.add(site)

    db.flush()

    # 为每个站点创建链路
    link_types = ["MPLS", "Internet", "5G"]
    for site in db.query(Site).all():
        num_links = 2 if site.status == "offline" else random.randint(1, 3)

        for i in range(num_links):
            link_type = link_types[i % len(link_types)]
            isp = random.choice(_ISPS.get(site.region, _ISPS["CN"]))

            if site.status == "offline":
                link_status = "down"
            elif i == 0:
                link_status = "active"
            else:
                link_status = "standby"

            bandwidth = random.choice(["100", "200", "300", "500", "1000"])
            used_bandwidth = str(random.randint(0, int(bandwidth) * 8 // 10))

            link = SiteLink(
                site_id=site.id,
                link_type=link_type,
                isp=f"{isp} {link_type}",
                ip=f"172.16.{random.randint(1, 254)}.{random.randint(1, 254)}/30",
                bandwidth=f"{bandwidth} Mbps",
                used_bandwidth=f"{used_bandwidth} Mbps",
                usage_percent=random.uniform(0, 90),
                latency=random.uniform(5, 50) if link_status == "active" else 0,
                loss=random.uniform(0, 0.1) if link_status == "active" else (100 if site.status == "offline" else 0),
                status=link_status,
            )
            db.add(link)
            db.flush()

            if link_status == "active":
                site.active_link_id = link.id

    # 为 warning/offline 站点创建告警
    for site in db.query(Site).filter(Site.status.in_(["warning", "offline"])).all():
        title = f"{site.display_name} 链路质量劣化" if site.status == "warning" else f"{site.display_name} 站点离线"
        reason = f"延迟 {site.latency}ms，丢包率 {site.loss}%" if site.status == "warning" else "所有 WAN 链路中断"
        db.add(SiteAlert(
            site_id=site.id, severity="critical", title=title, reason=reason,
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        ))

    # 为每个站点生成历史数据
    _seed_site_history(db)

    db.commit()
    print(f"[seed] 创建 {len(_SITES)} 个站点及链路")


def _seed_site_history(db: Session):
    """
    为每个站点生成历史监控数据（延迟/丢包/带宽/抖动/吞吐量）
    三种时间粒度：5min（12条）、1hour（60条）、24hour（96条）
    """
    if db.query(SiteHistory).count() > 0:
        return

    now = datetime.utcnow()
    history_configs = [
        {"range": "5min",   "points": 12,  "interval": timedelta(minutes=5)},
        {"range": "1hour",  "points": 60,  "interval": timedelta(minutes=1)},
        {"range": "24hour", "points": 96,  "interval": timedelta(minutes=15)},
    ]

    total_records = 0
    for site in db.query(Site).all():
        # 从站点带宽字段解析数值（如 "450 Mbps" → 450）
        try:
            base_bw = float(site.bandwidth_used.split()[0]) if site.bandwidth_used else 50
        except (ValueError, IndexError):
            base_bw = 50

        for cfg in history_configs:
            prev_latency = site.latency
            prev_jitter = max(1, site.latency * 0.1)
            prev_throughput = base_bw

            for i in range(cfg["points"]):
                # 时间标签：HH:MM 格式
                t = now - (cfg["points"] - 1 - i) * cfg["interval"]
                time_label = t.strftime("%H:%M")

                # 连续波动：前一点 × 0.7 + 新随机 × 0.3
                prev_latency = prev_latency * 0.7 + (site.latency + (random.random() - 0.5) * site.latency * 0.6) * 0.3
                prev_jitter = prev_jitter * 0.6 + max(1, site.latency * 0.08 + random.random() * site.latency * 0.12) * 0.4
                prev_throughput = prev_throughput * 0.7 + (base_bw + (random.random() - 0.5) * base_bw * 0.3) * 0.3

                db.add(SiteHistory(
                    site_id=site.id,
                    time_range=cfg["range"],
                    time=time_label,
                    latency=max(0, round(prev_latency, 2)),
                    loss=max(0, round(site.loss + (random.random() - 0.5) * site.loss * 0.8, 3)),
                    bandwidth=max(0, round(base_bw + (random.random() - 0.5) * base_bw * 0.4, 1)),
                    jitter=max(0, round(prev_jitter, 2)),
                    throughput=max(0, round(prev_throughput, 1)),
                ))
                total_records += 1

    db.commit()
    print(f"[seed] 创建 {total_records} 条站点历史数据")


# ============================================================
#  策略种子数据
# ============================================================

_POLICIES = [
    {"name": "HQ-集中出口路由策略", "type": "route", "status": "active", "priority": 10,
     "description": "所有分支机构流量通过总部出口，统一管控，满足安全合规要求",
     "match_conditions": {"source": "branch_sites", "destination": "internet", "application": ["any"]},
     "action_config": {"action": "steer", "preferred_path": "MPLS", "fallback_path": "Internet",
                       "description": "优先使用MPLS链路，故障时切换到Internet"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-gz", "site-sz"]},
    {"name": "视频会议QoS保障", "type": "qos", "status": "active", "priority": 20,
     "description": "保障Zoom/Teams/Webex等视频会议流量带宽，确保会议质量",
     "match_conditions": {"applications": ["Zoom", "Microsoft Teams", "Webex", "腾讯会议", "钉钉"],
                          "traffic_type": "real_time"},
     "action_config": {"bandwidth_reserve": "20Mbps", "priority": "high", "dscp_marking": "EF",
                       "description": "标记为高优先级，保障20%带宽"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-nj", "site-hz"]},
    {"name": "应用感知-办公流量分流", "type": "app_aware", "status": "active", "priority": 30,
     "description": "识别Office 365/Salesbox/邮箱等SaaS应用，优选低延迟链路",
     "match_conditions": {"applications": ["Office 365", "Salesforce", "Gmail", "Outlook", "企业微信"],
                          "category": "saas_productivity"},
     "action_config": {"action": "app_steer", "target_link": "MPLS", "latency_threshold": "50ms",
                       "description": "应用识别后优先路由到MPLS"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-hz"]},
    {"name": "跨区域链路负载均衡", "type": "route", "status": "active", "priority": 40,
     "description": "中国-新加坡-美国三地间链路负载均衡，提升传输效率",
     "match_conditions": {"source": ["CN", "SG"], "destination": ["SG", "US"],
                          "traffic_type": "inter_region"},
     "action_config": {"action": "load_balance", "algorithm": "weighted_round_robin",
                       "weights": {"MPLS": 70, "Internet": 30},
                       "description": "按7:3比例分配流量到MPLS和Internet"},
     "applied_sites": ["site-bj-hq", "site-hz", "site-xa"]},
    {"name": "带宽限速-P2P下载", "type": "qos", "status": "active", "priority": 100,
     "description": "限制P2P/下载类应用带宽，避免占用过多链路资源",
     "match_conditions": {"applications": ["BitTorrent", "Thunder", "Download Managers"],
                          "category": "p2p_download"},
     "action_config": {"action": "rate_limit", "max_bandwidth": "10Mbps", "priority": "low",
                       "dscp_marking": "CS1", "description": "限制最大带宽10Mbps，标记为低优先级"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-gz", "site-sz"]},
    {"name": "安全策略-阻断非法访问", "type": "security", "status": "active", "priority": 1,
     "description": "阻断已知的恶意域名和IP地址，保护网络安全",
     "match_conditions": {"type": "blacklist", "destinations": ["malicious_domains", "known_bad_ips"],
                          "protocol": ["tcp", "udp"]},
     "action_config": {"action": "block", "log_level": "critical", "alert": True,
                       "description": "直接阻断流量并记录日志，发送告警"},
     "applied_sites": []},
    {"name": "成本优先路由策略", "type": "route", "status": "inactive", "priority": 80,
     "description": "非关键业务优先使用低成本Internet链路，降低运营成本",
     "match_conditions": {"applications": ["File Transfer", "Backup", "Sync"], "priority": "low",
                          "time_range": {"start": "22:00", "end": "06:00"}},
     "action_config": {"action": "steer", "preferred_path": "Internet",
                       "description": "夜间非业务高峰期使用Internet链路"},
     "applied_sites": ["site-gz", "site-sz", "site-wh"]},
    {"name": "关键业务SLA保障", "type": "qos", "status": "active", "priority": 15,
     "description": "ERP/MES/SCADA等关键生产系统SLA保障",
     "match_conditions": {"applications": ["SAP", "Oracle", "MES", "SCADA", "生产系统"],
                          "category": "mission_critical"},
     "action_config": {"action": "sla_guarantee", "latency_sla": "20ms", "loss_sla": "0.1%",
                       "jitter_sla": "5ms", "bandwidth_reserve": "50Mbps",
                       "description": "严格SLA保障，双链路热备"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-cd"]},
    {"name": "灰度发布-应用分流", "type": "app_aware", "status": "draft", "priority": 50,
     "description": "新版本应用灰度发布，10%流量走新版本服务器",
     "match_conditions": {"application": "NewApp_v2", "user_group": "beta_testers", "percentage": 10},
     "action_config": {"action": "split_traffic", "primary": "v1_servers", "secondary": "v2_servers",
                       "ratio": {"primary": 90, "secondary": 10},
                       "description": "90%流量v1，10%流量v2"},
     "applied_sites": ["site-bj-hq"]},
    {"name": "故障切换-链路冗余", "type": "route", "status": "active", "priority": 5,
     "description": "主链路故障时自动切换到备用链路，确保业务连续性",
     "match_conditions": {"condition": "link_failure",
                          "threshold": {"latency": ">100ms", "loss": ">5%", "availability": "<99%"}},
     "action_config": {"action": "failover", "detection_time": "3s", "switchover_time": "1s",
                       "description": "3秒检测+1秒切换"},
     "applied_sites": ["site-bj-hq", "site-sh", "site-gz", "site-sz", "site-hz"]},
]


def _seed_policies(db: Session):
    """初始化策略数据"""
    if db.query(Policy).count() > 0:
        return

    for p in _POLICIES:
        policy = Policy(
            name=p["name"],
            type=p["type"],
            status=p["status"],
            priority=p["priority"],
            description=p["description"],
            match_conditions=json.dumps(p["match_conditions"], ensure_ascii=False),
            action_config=json.dumps(p["action_config"], ensure_ascii=False),
            applied_sites=",".join(p["applied_sites"]),
        )
        db.add(policy)

    db.commit()
    print(f"[seed] 创建 {len(_POLICIES)} 条策略")


# ============================================================
#  设备种子数据
# ============================================================

_DEVICE_TYPES = ["Edge", "Gateway", "CPE"]
_FIRMWARE_VERSIONS = ["20.3.1", "20.4.0", "20.5.2", "21.1.0"]
_CONFIG_VERSIONS = ["1.0.0", "1.1.0", "1.2.0", "2.0.0"]
_ALERT_TITLES = {
    "device_down": "设备离线告警",
    "cpu_high": "CPU 使用率过高",
    "memory_high": "内存使用率过高",
    "tunnel_down": "隧道断开告警",
    "config_failed": "配置同步失败",
}
_ALERT_DESCRIPTIONS = {
    "device_down": "设备心跳超时，可能已离线",
    "cpu_high": "CPU 使用率超过阈值，可能影响性能",
    "memory_high": "内存使用率超过阈值，可能影响性能",
    "tunnel_down": "IPsec 隧道连接中断",
    "config_failed": "配置下发失败，请检查网络连接",
}

# 接口类型映射（用于生成链路类型）
_INTERFACE_TYPE_MAP = {
    "WAN": ["MPLS", "Internet"],
    "MPLS": ["MPLS"],
    "Internet": ["Internet"],
    "5G": ["5G"],
    "LTE": ["LTE"],
}

# 隧道类型映射
_TUNNEL_TYPE_MAP = {
    "IPsec": "IPsec",
    "GRE": "GRE",
    "VXLAN": "VXLAN",
}


def _seed_devices(db: Session):
    """初始化设备数据，并为接口和隧道创建对应的链路"""
    if db.query(Device).count() > 0:
        return

    sites = db.query(Site).all()
    if not sites:
        return

    device_count = 0
    link_count = 0

    for site in sites:
        num_devices = random.randint(1, 3)

        for i in range(1, num_devices + 1):
            device_name = f"{site.name}-DEV{i:02d}"
            is_online = random.random() < 0.7

            device = Device(
                id=f"device-{device_name.lower()}",
                name=device_name,
                device_type=random.choice(_DEVICE_TYPES),
                site_id=site.id,
                site_name=site.display_name,
                online_status="online" if is_online else "offline",
                heartbeat_status="ok" if is_online else "timeout",
                last_online=datetime.utcnow() - timedelta(hours=random.randint(1, 72)) if is_online else None,
                cpu_usage=random.uniform(10, 95),
                memory_usage=random.uniform(20, 90),
                temperature=random.uniform(35, 75) if random.random() > 0.3 else None,
                bandwidth_usage=random.uniform(10, 500),
                config_version=random.choice(_CONFIG_VERSIONS),
                current_policy=f"策略-{random.randint(1, 5)}",
                sync_status=random.choice(["synced", "pending", "failed"]) if is_online else "failed",
                firmware_version=random.choice(_FIRMWARE_VERSIONS),
                upgrade_status=random.choice(["none", "none", "downloading", "none"]),
                can_upgrade=random.choice([True, False, False, False]),
                health_score=0,
                role="active" if i == 1 else "standby",
                session_count=random.randint(1000, 5000) if is_online else 0,
            )

            if device.upgrade_status == "downloading":
                cur_idx = _FIRMWARE_VERSIONS.index(device.firmware_version)
                if cur_idx < len(_FIRMWARE_VERSIONS) - 1:
                    device.target_version = _FIRMWARE_VERSIONS[cur_idx + 1]
                    device.upgrade_progress = random.uniform(10, 80)

            device.health_score = int(max(0, min(100, 100 - device.cpu_usage * 0.3 - device.memory_usage * 0.2)))
            if not is_online:
                device.health_score = max(0, device.health_score - 40)

            db.add(device)
            db.flush()

            # 为设备创建接口，并为每个接口生成对应的 WAN 链路
            interface_types = ["WAN", "MPLS", "Internet", "5G"]
            interface_names = ["ge0/1", "ge0/2", "ge0/3", "lte0", "vlan100", "vlan200"]

            for j in range(random.randint(2, 4)):
                itype = interface_types[j % len(interface_types)]
                iface_name = interface_names[j % len(interface_names)]

                # 创建接口（名称格式：{设备名}_{接口名}）
                interface = DeviceInterface(
                    device_id=device.id,
                    name=f"{device.name}_{iface_name}",
                    interface_type=itype,
                    status="up" if (is_online and random.random() > 0.2) else "down",
                    speed=random.choice(["100Mbps", "1Gbps", "10Gbps"]),
                    mtu=1500,
                    ip_address=f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}" if random.random() > 0.3 else None,
                    subnet_mask="255.255.255.0",
                    gateway=f"192.168.{random.randint(1, 254)}.1" if random.random() > 0.5 else None,
                    packet_loss=random.uniform(0, 5) if random.random() > 0.7 else 0,
                )
                db.add(interface)
                db.flush()

                # 为接口生成 WAN 链路（接口名中的 / 替换为 -，避免 URL 路径问题）
                wan_link_id = f"wan-{device.id}-{iface_name.replace('/', '-')}"
                wan_link_type = _INTERFACE_TYPE_MAP.get(itype, ["Internet"])[0]
                isp = random.choice(_ISPS.get(site.region, _ISPS["CN"]))
                # 命名规范：{设备名}_{接口名}
                wan_link_name = f"{device.name}_{iface_name}"

                # 根据接口状态确定链路状态
                if interface.status == "up":
                    link_status = "active" if j == 0 else "standby"
                    health_status = "healthy"
                else:
                    link_status = "down"
                    health_status = "down"

                # 根据链路类型设置带宽和延迟
                if wan_link_type == "MPLS":
                    bandwidth = random.choice([100, 200, 500])
                    latency = random.uniform(2, 15)
                    loss = random.uniform(0, 0.05)
                    monthly_cost = random.randint(10000, 30000)
                elif wan_link_type == "Internet":
                    bandwidth = random.choice([50, 100, 200, 300])
                    latency = random.uniform(5, 30)
                    loss = random.uniform(0, 0.2)
                    monthly_cost = random.randint(3000, 8000)
                elif wan_link_type == "5G":
                    bandwidth = random.choice([50, 100])
                    latency = random.uniform(10, 25)
                    loss = random.uniform(0, 0.1)
                    monthly_cost = random.randint(2000, 5000)
                else:  # LTE
                    bandwidth = random.choice([20, 50])
                    latency = random.uniform(15, 40)
                    loss = random.uniform(0, 0.3)
                    monthly_cost = random.randint(1500, 3000)

                used_bandwidth = random.uniform(0, bandwidth * 0.8)
                jitter = latency * random.uniform(0.1, 0.3)

                wan_link = WanLink(
                    id=wan_link_id,
                    name=wan_link_name,
                    type=wan_link_type,
                    link_category="wan",
                    site_id=site.id,
                    site_name=site.display_name,
                    device_id=device.id,
                    device_name=device.name,
                    source_type="interface",
                    source_id=interface.id,
                    interface_name=iface_name,
                    interface_type="physical" if "ge" in iface_name else "logical",
                    isp=f"{isp} {wan_link_type}",
                    health_status=health_status,
                    active_status=link_status,
                    ip=interface.ip_address,
                    latency=round(latency, 2),
                    loss=round(loss, 3),
                    jitter=round(jitter, 2),
                    bandwidth=bandwidth,
                    used_bandwidth=round(used_bandwidth, 2),
                    utilization=round((used_bandwidth / bandwidth) * 100, 1) if bandwidth > 0 else 0,
                    sla_score=_calc_sla_score(latency, loss, jitter),
                    switch_policy="mpls-priority" if wan_link_type == "MPLS" else "internet-fallback",
                    monthly_cost=monthly_cost,
                )
                db.add(wan_link)

                # 更新接口的 link_id
                interface.link_id = wan_link_id
                link_count += 1

            # 为设备创建隧道，并为每个隧道生成对应的 Overlay 链路
            if is_online and random.random() > 0.3:
                tunnel_types = ["IPsec", "GRE", "VXLAN"]

                # 选择对端站点（排除当前站点）
                peer_sites = [s for s in sites if s.id != site.id]
                if not peer_sites:
                    peer_sites = [site]

                for k in range(random.randint(1, 3)):
                    tt = tunnel_types[k % len(tunnel_types)]
                    peer_site = random.choice(peer_sites)

                    # 生成隧道名称：{本端设备}→{对端设备}_{隧道类型}
                    peer_device_name = f"{peer_site.name}-DEV01"
                    tunnel_name = f"{device.name}→{peer_device_name}_{tt}"

                    # 创建隧道
                    tunnel = DeviceTunnel(
                        device_id=device.id,
                        tunnel_name=tunnel_name,
                        tunnel_type=tt,
                        peer_ip=f"10.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}",
                        local_ip=f"10.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}",
                        status="up" if random.random() > 0.2 else "down",
                        uptime=f"{random.randint(1, 720)}h {random.randint(0, 59)}m",
                        tx_bytes=random.randint(1000000, 10000000000),
                        rx_bytes=random.randint(1000000, 10000000000),
                        tx_pps=random.uniform(100, 10000),
                        rx_pps=random.uniform(100, 10000),
                    )
                    db.add(tunnel)
                    db.flush()

                    # 为隧道生成 Overlay 链路
                    overlay_link_id = f"overlay-{device.id}-{tunnel_name}"
                    overlay_link_name = tunnel_name

                    # 根据隧道状态确定链路状态
                    if tunnel.status == "up":
                        link_status = "active" if k == 0 else "standby"
                        health_status = "healthy"
                    else:
                        link_status = "down"
                        health_status = "down"

                    # Overlay 链路的性能指标
                    overlay_latency = random.uniform(5, 50)
                    overlay_loss = random.uniform(0, 0.5)
                    overlay_jitter = overlay_latency * random.uniform(0.1, 0.3)
                    overlay_bandwidth = random.choice([50, 100, 200])
                    overlay_used_bandwidth = random.uniform(0, overlay_bandwidth * 0.6)

                    overlay_link = WanLink(
                        id=overlay_link_id,
                        name=overlay_link_name,
                        type=tt,
                        link_category="overlay",
                        site_id=site.id,
                        site_name=site.display_name,
                        device_id=device.id,
                        device_name=device.name,
                        source_type="tunnel",
                        source_id=tunnel.id,
                        tunnel_name=tunnel_name,
                        peer_device_id=f"device-{peer_site.name.lower()}-dev01",
                        peer_site_id=peer_site.id,
                        peer_site_name=peer_site.display_name,
                        local_ip=tunnel.local_ip,
                        peer_ip=tunnel.peer_ip,
                        health_status=health_status,
                        active_status=link_status,
                        latency=round(overlay_latency, 2),
                        loss=round(overlay_loss, 3),
                        jitter=round(overlay_jitter, 2),
                        bandwidth=overlay_bandwidth,
                        used_bandwidth=round(overlay_used_bandwidth, 2),
                        utilization=round((overlay_used_bandwidth / overlay_bandwidth) * 100, 1) if overlay_bandwidth > 0 else 0,
                        sla_score=_calc_sla_score(overlay_latency, overlay_loss, overlay_jitter),
                        switch_policy="load-balance",
                        monthly_cost=0,
                    )
                    db.add(overlay_link)

                    # 更新隧道的 link_id
                    tunnel.link_id = overlay_link_id
                    link_count += 1

            # 设备告警
            if random.random() > 0.5:
                for _ in range(random.randint(1, 3)):
                    at = random.choice(["device_down", "cpu_high", "memory_high", "tunnel_down", "config_failed"])
                    alert = DeviceAlert(
                        device_id=device.id,
                        alert_type=at,
                        severity=random.choice(["critical", "major", "minor"]),
                        title=_ALERT_TITLES.get(at, "未知告警"),
                        description=_ALERT_DESCRIPTIONS.get(at, "告警详情"),
                        resolved=random.random() > 0.6,
                    )
                    if alert.resolved:
                        alert.resolved_at = datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                    db.add(alert)

            # 升级记录
            if random.random() > 0.7:
                cur_idx = _FIRMWARE_VERSIONS.index(device.firmware_version)
                if cur_idx > 0:
                    db.add(DeviceUpgrade(
                        device_id=device.id,
                        from_version=random.choice(_FIRMWARE_VERSIONS[:cur_idx]),
                        to_version=device.firmware_version,
                        status=random.choice(["success", "success", "success", "failed"]),
                        progress=100,
                        started_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        completed_at=datetime.utcnow() - timedelta(days=random.randint(0, 29)),
                    ))

            device_count += 1

    db.commit()
    print(f"[seed] 创建 {device_count} 台设备，{link_count} 条链路（WAN + Overlay）")



_ALERTS = [
    # --- critical ---
    {
        "level": "critical", "status": "resolved",
        "title": "成都分支链路中断",
        "message": "成都分支到北京总部主链路（MPLS）丢包率达到 15%，已触发自动切换至备用链路",
        "source_type": "link", "source_id": "link-cd-mpls-1", "source_name": "CD→BJ-MPLS",
        "region": "CN", "metric_type": "loss", "metric_value": 15.0, "threshold": 5.0,
        "root_cause": "运营商光缆故障",
        "created_offset": {"hours": 6},
        "ack_offset": {"hours": 5, "minutes": 40},
        "resolved_offset": {"hours": 3},
        "acknowledged_by": "admin",
    },
    {
        "level": "critical", "status": "acknowledged",
        "title": "武汉分支带宽超限",
        "message": "武汉分支当前带宽利用率达到 92%，已超过 90% 阈值，影响业务正常运行",
        "source_type": "site", "source_id": "site-wh", "source_name": "武汉分支",
        "region": "CN", "metric_type": "bandwidth", "metric_value": 92.0, "threshold": 90.0,
        "root_cause": "大量文件下载占用带宽",
        "created_offset": {"hours": 2},
        "ack_offset": {"hours": 1, "minutes": 30},
        "acknowledged_by": "admin",
    },
    {
        "level": "critical", "status": "new",
        "title": "深圳分支设备CPU过载",
        "message": "深圳分支 vEdge-2000 CPU 利用率达到 95%，已超过 85% 阈值",
        "source_type": "device", "source_id": "dev-sz-01", "source_name": "SZ-vEdge-01",
        "region": "CN", "metric_type": "cpu", "metric_value": 95.0, "threshold": 85.0,
        "created_offset": {"minutes": 30},
    },
    # --- warning ---
    {
        "level": "warning", "status": "resolved",
        "title": "上海分支延迟升高",
        "message": "上海分支到北京总部延迟升至 45ms，已超过 30ms 阈值",
        "source_type": "link", "source_id": "link-sh-mpls-1", "source_name": "SH→BJ-MPLS",
        "region": "CN", "metric_type": "latency", "metric_value": 45.0, "threshold": 30.0,
        "root_cause": "网络拥塞",
        "created_offset": {"days": 1},
        "ack_offset": {"hours": 20},
        "resolved_offset": {"hours": 18},
        "acknowledged_by": "admin",
    },
    {
        "level": "warning", "status": "acknowledged",
        "title": "广州分支丢包率上升",
        "message": "广州分支到北京总部丢包率达到 2.5%，已超过 1% 阈值",
        "source_type": "link", "source_id": "link-gz-internet-1", "source_name": "GZ→BJ-Internet",
        "region": "CN", "metric_type": "loss", "metric_value": 2.5, "threshold": 1.0,
        "created_offset": {"hours": 8},
        "ack_offset": {"hours": 7},
        "acknowledged_by": "admin",
    },
    {
        "level": "warning", "status": "new",
        "title": "北京总部内存使用率偏高",
        "message": "北京总部 vEdge-1000 内存使用率达到 78%，接近 80% 阈值",
        "source_type": "device", "source_id": "dev-bj-01", "source_name": "BJ-vEdge-01",
        "region": "CN", "metric_type": "memory", "metric_value": 78.0, "threshold": 80.0,
        "created_offset": {"hours": 1},
    },
    {
        "level": "warning", "status": "resolved",
        "title": "杭州分支带宽利用率偏高",
        "message": "杭州分支带宽利用率达到 75%，已超过 70% 阈值",
        "source_type": "site", "source_id": "site-hz", "source_name": "杭州分支",
        "region": "CN", "metric_type": "bandwidth", "metric_value": 75.0, "threshold": 70.0,
        "created_offset": {"days": 2},
        "ack_offset": {"days": 1, "hours": 20},
        "resolved_offset": {"days": 1, "hours": 12},
        "acknowledged_by": "admin",
    },
    # --- info ---
    {
        "level": "info", "status": "resolved",
        "title": "南京分支链路恢复正常",
        "message": "南京分支到北京总部链路延迟已恢复至正常水平（8ms）",
        "source_type": "link", "source_id": "link-nj-internet-1", "source_name": "NJ→BJ-Internet",
        "region": "CN", "metric_type": "latency", "metric_value": 8.0, "threshold": 20.0,
        "created_offset": {"days": 3},
        "resolved_offset": {"days": 2, "hours": 22},
    },
    {
        "level": "info", "status": "new",
        "title": "AWS东京节点延迟稳定",
        "message": "AWS东京节点到北京总部延迟稳定在 65ms，符合 SLA 要求",
        "source_type": "link", "source_id": "link-aws-tokyo-1", "source_name": "BJ→AWS-Tokyo",
        "region": "APAC", "metric_type": "latency", "metric_value": 65.0, "threshold": 100.0,
        "created_offset": {"hours": 4},
    },
    {
        "level": "info", "status": "acknowledged",
        "title": "设备固件升级完成",
        "message": "广州分支 vEdge-100 固件已从 v17.6.2 升级至 v17.6.3",
        "source_type": "device", "source_id": "dev-gz-01", "source_name": "GZ-vEdge-01",
        "region": "CN", "metric_type": None, "metric_value": None, "threshold": None,
        "created_offset": {"days": 5},
        "ack_offset": {"days": 4, "hours": 20},
        "acknowledged_by": "admin",
    },
]


def _seed_alerts(db: Session):
    """初始化告警数据"""
    if db.query(Alert).count() > 0:
        return

    now = datetime.utcnow()

    for a in _ALERTS:
        created_at = now - timedelta(**a["created_offset"])

        alert = Alert(
            level=a["level"],
            status=a["status"],
            title=a["title"],
            message=a["message"],
            source_type=a["source_type"],
            source_id=a["source_id"],
            source_name=a["source_name"],
            region=a["region"],
            metric_type=a["metric_type"],
            metric_value=a["metric_value"],
            threshold=a["threshold"],
            root_cause=a.get("root_cause"),
            related_alerts=a.get("related_alerts", "[]"),
            acknowledged_by=a.get("acknowledged_by"),
            acknowledged_at=(now - timedelta(**a["ack_offset"])) if "ack_offset" in a else None,
            resolved_at=(now - timedelta(**a["resolved_offset"])) if "resolved_offset" in a else None,
            created_at=created_at,
        )
        db.add(alert)
        db.flush()

        # 创建对应的历史记录
        db.add(AlertHistory(alert_id=alert.id, action="created", remark="告警发生", created_at=created_at))

        if a["status"] in ("acknowledged", "in_progress") and "ack_offset" in a:
            db.add(AlertHistory(
                alert_id=alert.id, action="acknowledged",
                operator=a.get("acknowledged_by", "admin"), remark="告警已确认",
                created_at=now - timedelta(**a["ack_offset"]),
            ))

        if a["status"] == "resolved" and "resolved_offset" in a:
            db.add(AlertHistory(
                alert_id=alert.id, action="resolved", remark="告警已恢复",
                created_at=now - timedelta(**a["resolved_offset"]),
            ))

    db.commit()
    print(f"[seed] 创建 {len(_ALERTS)} 条告警")


# ============================================================
#  Dashboard 种子数据
# ============================================================

_TOPOLOGY_LINKS = [
    # 北京总部 → 各分支
    {"source": "site-bj-hq", "target": "site-sh", "latency": 28, "loss": 0.01,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-gz", "latency": 35, "loss": 0.02,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-sz", "latency": 32, "loss": 0.01,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-cd", "latency": 52, "loss": 0.15,
     "bandwidth": "100 Mbps", "health": "critical", "status": "active"},
    {"source": "site-bj-hq", "target": "site-wh", "latency": 38, "loss": 0.08,
     "bandwidth": "50 Mbps", "health": "warning", "status": "active"},
    {"source": "site-bj-hq", "target": "site-nj", "latency": 22, "loss": 0.0,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-hz", "latency": 25, "loss": 0.01,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-xa", "latency": 45, "loss": 0.12,
     "bandwidth": "50 Mbps", "health": "warning", "status": "standby"},
    # 分支间 Mesh
    {"source": "site-sh", "target": "site-gz", "latency": 30, "loss": 0.02,
     "bandwidth": "50 Mbps", "health": "good", "status": "active"},
    {"source": "site-sh", "target": "site-hz", "latency": 8, "loss": 0.0,
     "bandwidth": "50 Mbps", "health": "good", "status": "active"},
    {"source": "site-wh", "target": "site-cd", "latency": 55, "loss": 0.2,
     "bandwidth": "30 Mbps", "health": "critical", "status": "active"},
    # 北京总部 → 云区域
    {"source": "site-bj-hq", "target": "site-aws-tokyo", "latency": 65, "loss": 0.01,
     "bandwidth": "200 Mbps", "health": "good", "status": "active"},
    {"source": "site-bj-hq", "target": "site-azure-sg", "latency": 85, "loss": 0.03,
     "bandwidth": "150 Mbps", "health": "warning", "status": "active"},
    {"source": "site-bj-hq", "target": "site-gcp-hk", "latency": 42, "loss": 0.01,
     "bandwidth": "100 Mbps", "health": "good", "status": "active"},
]

_APPLICATION_SLAS = [
    {"name": "Microsoft O365", "short_name": "O365", "availability": 99.97,
     "performance": 99.2, "color": "#0078d4"},
    {"name": "Zoom", "short_name": "Zoom", "availability": 99.85,
     "performance": 97.8, "color": "#2d8cff"},
    {"name": "SAP ERP", "short_name": "SAP", "availability": 97.50,
     "performance": 95.2, "color": "#f0ab00"},
    {"name": "Salesforce", "short_name": "CRM", "availability": 99.99,
     "performance": 99.5, "color": "#00a1e0"},
    {"name": "钉钉", "short_name": "钉钉", "availability": 99.60,
     "performance": 98.1, "color": "#0089ff"},
]

_ISP_BANDWIDTHS = [
    {"isp": "中国电信", "short_name": "电信", "used_mbps": 850,
     "total_mbps": 1000, "color": "#00b4d8"},
    {"isp": "中国联通", "short_name": "联通", "used_mbps": 420,
     "total_mbps": 500, "color": "#e040fb"},
    {"isp": "中国移动", "short_name": "移动", "used_mbps": 310,
     "total_mbps": 400, "color": "#76ff03"},
    {"isp": "5G 聚合", "short_name": "5G", "used_mbps": 85,
     "total_mbps": 100, "color": "#ff9100"},
]


def _seed_dashboard(db: Session):
    """初始化 Dashboard 专用数据：拓扑链路、应用 SLA、ISP 带宽"""
    # 拓扑链路
    if db.query(DashboardTopologyLink).count() == 0:
        for link in _TOPOLOGY_LINKS:
            db.add(DashboardTopologyLink(
                source_site_id=link["source"],
                target_site_id=link["target"],
                avg_latency=link["latency"],
                packet_loss=link["loss"],
                bandwidth=link["bandwidth"],
                health=link["health"],
                status=link["status"],
            ))
        db.commit()
        print(f"[seed] 创建 {len(_TOPOLOGY_LINKS)} 条拓扑链路")

    # 应用 SLA
    if db.query(ApplicationSla).count() == 0:
        for app in _APPLICATION_SLAS:
            db.add(ApplicationSla(
                name=app["name"],
                short_name=app["short_name"],
                availability=app["availability"],
                performance=app["performance"],
                color=app["color"],
            ))
        db.commit()
        print(f"[seed] 创建 {len(_APPLICATION_SLAS)} 条应用 SLA")

    # ISP 带宽
    if db.query(IspBandwidth).count() == 0:
        for isp in _ISP_BANDWIDTHS:
            db.add(IspBandwidth(
                isp=isp["isp"],
                short_name=isp["short_name"],
                used_mbps=isp["used_mbps"],
                total_mbps=isp["total_mbps"],
                color=isp["color"],
            ))
        db.commit()
        print(f"[seed] 创建 {len(_ISP_BANDWIDTHS)} 条 ISP 带宽")


# ============================================================
#  WAN 链路种子数据
# ============================================================

def _calc_sla_score(latency, loss, jitter):
    """计算 SLA 评分"""
    latency_score = max(0, 40 - (latency / 200) * 40)
    loss_score = max(0, 35 - (loss / 1) * 35)
    jitter_score = max(0, 25 - (jitter / 50) * 25)
    return round(latency_score + loss_score + jitter_score, 1)


def _calc_health_status(latency, loss, jitter, active_status):
    """根据性能指标计算健康状态"""
    if active_status == "down":
        return "down"
    if latency > 100 or loss > 1 or jitter > 30:
        return "degraded"
    if latency > 40 or loss > 0.2 or jitter > 10:
        return "degraded"
    return "healthy"


def _link_site_and_wan_links(db: Session):
    """
    在 site_links 和 wan_links 之间建立 wan_link_id 映射。
    匹配策略：按 (site_id, link_type) 配对。
    """
    wan_links = db.query(WanLink).all()
    site_links = db.query(SiteLink).all()

    # 按 site_id + type 分组 wan_links
    wan_by_site_type = {}
    for wl in wan_links:
        wan_by_site_type.setdefault(wl.site_id, {}).setdefault(wl.type, []).append(wl)

    # 记录已匹配的 wan_link_id，避免一条 wan_link 被多个 site_link 匹配
    matched_wan_ids = set()
    count = 0

    for sl in site_links:
        candidates = wan_by_site_type.get(sl.site_id, {}).get(sl.link_type, [])
        for wl in candidates:
            if wl.id not in matched_wan_ids:
                sl.wan_link_id = wl.id
                matched_wan_ids.add(wl.id)
                count += 1
                break

    db.commit()
    print(f"[seed] 建立 {count} 条 site_links <-> wan_links 映射")


# ============================================================
#  链路历史监控数据种子数据
# ============================================================

def _seed_link_metrics_history(db: Session):
    """
    为每条链路生成历史监控数据（延迟/丢包/带宽/抖动/吞吐量）
    三种时间粒度：5min（12条）、1hour（60条）、24hour（24条）

    关键特性：
    - 每条链路的数据基于其基础指标，体现差异化
    - 同一条链路多次生成数据保持一致（使用链路ID作为随机种子）
    - 不同时间范围返回不同数量的数据点
    """
    from app.models.link_metrics_history import LinkMetricsHistory

    # 如果已有数据，则跳过
    if db.query(LinkMetricsHistory).count() > 0:
        print("[seed] 链路历史监控数据已存在，跳过生成")
        return

    now = datetime.utcnow()
    history_configs = [
        {"range": "5min",   "points": 12,  "interval": timedelta(minutes=5)},
        {"range": "1hour",  "points": 60,  "interval": timedelta(minutes=1)},
        {"range": "24hour", "points": 24,  "interval": timedelta(hours=1)},
    ]

    total_records = 0
    wan_links = db.query(WanLink).all()

    for link in wan_links:
        # 使用链路ID作为随机种子，确保同一条链路生成相同的数据
        # 从链路ID中提取数字部分作为种子
        link_seed = hash(link.id) % (2 ** 31)
        random.seed(link_seed)

        # 基础指标（从链路当前值出发）
        base_latency = max(1, link.latency)
        base_loss = max(0.001, link.loss)
        base_jitter = max(0.5, link.jitter)
        base_bandwidth = max(1, link.used_bandwidth)

        # 根据链路健康状态调整数据特征
        if link.health_status == "down":
            # 故障链路：高延迟、高丢包
            base_latency = max(100, base_latency * 5)
            base_loss = min(100, base_loss * 10)
            base_bandwidth = 0
        elif link.health_status == "degraded":
            # 劣化链路：中等延迟、中等丢包
            base_latency = base_latency * 2
            base_loss = min(5, base_loss * 3)

        for cfg in history_configs:
            prev_latency = base_latency
            prev_jitter = max(1, base_jitter)
            prev_throughput = base_bandwidth

            # 生成一些趋势参数（基于链路ID保持一致）
            trend_phase = (link_seed % 1000) / 1000.0 * 3.14159 * 2  # 趋势相位
            anomaly_position = link_seed % cfg["points"]  # 异常点位置
            anomaly_active = (link_seed % 10) < 3  # 30%概率出现异常

            for i in range(cfg["points"]):
                t = now - (cfg["points"] - 1 - i) * cfg["interval"]
                progress = i / (cfg["points"] - 1) if cfg["points"] > 1 else 0  # 时间进度 0~1

                # 周期性波动（模拟真实网络的周期性变化）
                import math
                cycle = math.sin(progress * math.pi * 4 + trend_phase) * 0.15

                # 趋势变化
                trend = (1 - progress) * 0.1 + cycle

                # 偶发异常（模拟网络质量问题）
                anomaly = 0
                if anomaly_active and i == anomaly_position:
                    anomaly = [0.3, -0.2, 0.5, -0.3][link_seed % 4]  # 突增或突降

                # 生成各项指标数据（连续波动：前一点 × 0.7 + 新随机 × 0.3）
                prev_latency = prev_latency * 0.7 + (base_latency + (random.random() - 0.5) * base_latency * 0.6) * 0.3
                latency = max(0, prev_latency * (1 + trend + anomaly))

                prev_jitter = prev_jitter * 0.6 + max(1, base_jitter * 0.08 + random.random() * base_jitter * 0.12) * 0.4
                jitter = max(0, prev_jitter * (1 + trend + anomaly))

                loss_variation = base_loss * 0.5 * (trend + anomaly)
                loss = max(0, base_loss + loss_variation + abs(random.random() - 0.5) * base_loss * 0.6)

                bw_cycle = math.sin(progress * math.pi * 6 + trend_phase + 1) * 0.1
                bandwidth_variation = base_bandwidth * (bw_cycle + anomaly * 0.5)
                bandwidth = max(0, base_bandwidth + bandwidth_variation + (random.random() - 0.5) * base_bandwidth * 0.2)

                # 吞吐量通常比使用带宽略低
                throughput = max(0, bandwidth * (0.8 + (random.random() - 0.5) * 0.15 + anomaly * 0.3))

                # 创建历史记录
                record = LinkMetricsHistory(
                    id=f"lmh-{link.id}-{cfg['range']}-{i}",
                    link_id=link.id,
                    time_range=cfg["range"],
                    timestamp=t,
                    latency=round(latency, 2),
                    loss=round(loss, 3),
                    jitter=round(jitter, 2),
                    bandwidth=round(bandwidth, 2),
                    throughput=round(throughput, 2),
                )
                db.add(record)
                total_records += 1

    db.commit()
    print(f"[seed] 创建 {total_records} 条链路历史监控数据")
