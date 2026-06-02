"""
数据模型导出
"""
from app.models.user import User
from app.models.site import Site, SiteLink
from app.models.link import WanLink, LinkSwitchEvent, LinkAlert
from app.models.device import (
    Device,
    DeviceInterface,
    DeviceTunnel,
    DeviceAlert,
    DeviceUpgrade
)
from app.models.policy import Policy
from app.models.alert import Alert
from app.models.login_log import LoginLog
from app.models.notification_config import NotificationConfig
from app.models.webhook_config import WebhookConfig
from app.models.audit_log import AuditLog
from app.models.alert_rule import AlertRule
from app.models.system_setting import SystemSetting
from app.models.batch_task import BatchTask, BatchTaskResult
from app.models.dashboard import DashboardTopologyLink, ApplicationSla, IspBandwidth
from app.models.link_metrics_history import LinkMetricsHistory
from app.models.diagnostics import PingHistory, TracerouteHistory, LinkProbeHistory

__all__ = [
    # 用户
    "User",
    # 站点
    "Site",
    "SiteLink",
    # 链路
    "WanLink",
    "LinkSwitchEvent",
    "LinkAlert",
    # 设备
    "Device",
    "DeviceInterface",
    "DeviceTunnel",
    "DeviceAlert",
    "DeviceUpgrade",
    # 策略
    "Policy",
    # 告警
    "Alert",
    # 日志
    "LoginLog",
    "AuditLog",
    # 配置
    "NotificationConfig",
    "WebhookConfig",
    "SystemSetting",
    # 批量任务
    "BatchTask",
    "BatchTaskResult",
    # 仪表盘
    "DashboardTopologyLink",
    "ApplicationSla",
    "IspBandwidth",
    # 链路指标
    "LinkMetricsHistory",
    # 诊断
    "PingHistory",
    "TracerouteHistory",
    "LinkProbeHistory",
    # 告警规则
    "AlertRule",
]
