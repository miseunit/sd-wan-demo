/**
 * 设备管理 - 类型定义
 */

/** 设备类型 */
export type DeviceType = 'Edge' | 'Gateway' | 'CPE';

/** 在线状态 */
export type OnlineStatus = 'online' | 'offline';

/** 心跳状态 */
export type HeartbeatStatus = 'ok' | 'timeout' | 'unknown';

/** 同步状态 */
export type SyncStatus = 'synced' | 'pending' | 'failed';

/** 升级状态 */
export type UpgradeStatus = 'none' | 'downloading' | 'installing' | 'rollback' | 'failed';

/** 接口类型 */
export type InterfaceType = 'WAN' | 'LAN' | 'MPLS' | 'Internet';

/** 隧道类型 */
export type TunnelType = 'IPsec' | 'GRE' | 'VXLAN';

/** 隧道状态 */
export type TunnelStatus = 'up' | 'down' | 'connecting';

/** 告警类型 */
export type AlertType = 'device_down' | 'cpu_high' | 'memory_high' | 'tunnel_down' | 'config_failed';

/** 告警严重级别 */
export type AlertSeverity = 'critical' | 'major' | 'minor';

/** 绑定状态 */
export type BindStatus = 'bound' | 'unbound';

/** 升级历史状态 */
export type UpgradeHistoryStatus = 'pending' | 'downloading' | 'installing' | 'success' | 'failed' | 'rollback';

/** 设备接口 */
export interface DeviceInterface {
    id: number;
    name: string;
    interface_type: InterfaceType;
    status: 'up' | 'down';
    speed: string | null;
    mtu: number;
    ip_address: string | null;
    subnet_mask: string | null;
    gateway: string | null;
    packet_loss: number;
    link_id?: string | null;
    link_name?: string | null;
}

/** 设备隧道 */
export interface DeviceTunnel {
    id: number;
    tunnel_name: string;
    tunnel_type: TunnelType;
    peer_ip: string | null;
    local_ip: string | null;
    status: TunnelStatus;
    uptime: string | null;
    tx_bytes: number;
    rx_bytes: number;
    tx_pps: number;
    rx_pps: number;
    link_id?: string | null;
    link_name?: string | null;
}

/** 设备告警 */
export interface DeviceAlert {
    id: number;
    device_id: string;
    alert_type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string | null;
    resolved: boolean;
    created_at: string;
    resolved_at: string | null;
}

/** 设备升级记录 */
export interface DeviceUpgradeRecord {
    id: number;
    device_id: string;
    from_version: string;
    to_version: string;
    status: UpgradeHistoryStatus;
    progress: number;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
}

/** 设备信息 */
export interface Device {
    id: string;
    name: string;
    device_type: DeviceType;
    site_id: string;
    site_name: string | null;

    // 在线状态
    online_status: OnlineStatus;
    heartbeat_status: HeartbeatStatus;
    last_online: string | null;

    // 资源状态
    cpu_usage: number;
    memory_usage: number;
    temperature: number | null;
    bandwidth_usage: number;

    // 配置状态
    config_version: string;
    current_policy: string | null;
    sync_status: SyncStatus;
    sync_error: string | null;

    // 升级状态
    firmware_version: string;
    upgrade_status: UpgradeStatus;
    upgrade_progress: number;
    can_upgrade: boolean;
    target_version: string | null;

    // 健康评分
    health_score: number;

    // 设备角色和会话
    role: 'active' | 'standby';
    session_count: number;

    // 设备绑定信息
    serial_number: string | null;
    management_ip: string | null;
    mac_address: string | null;
    bind_status: BindStatus;
    bound_at: string | null;

    // 时间戳
    created_at: string;
    updated_at: string;
}

/** 设备详情（含关联数据） */
export interface DeviceDetail extends Device {
    interfaces: DeviceInterface[];
    tunnels: DeviceTunnel[];
    alerts: DeviceAlert[];
    upgrade_history: DeviceUpgradeRecord[];
}

/** 设备统计 */
export interface DeviceStats {
    total: number;
    online: number;
    offline: number;
    healthy: number;
    warning: number;
    critical: number;
    upgrading: number;
}

/** 设备列表响应（对齐后端 PaginatedResponse） */
export interface DeviceListResponse {
    items: Device[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/** 设备筛选条件 */
export interface DeviceFilterState {
    device_type: DeviceType | 'all';
    online_status: OnlineStatus | 'all';
    site_id: string | 'all';
    search: string;
}

/** 设备操作类型 */
export type DeviceActionType = 'restart' | 'sync_config' | 'start_upgrade' | 'rollback';

/** 设备操作请求 */
export interface DeviceActionRequest {
    action: DeviceActionType;
    params?: Record<string, unknown>;
}

/** 设备操作响应 */
export interface DeviceActionResponse {
    success: boolean;
    message: string;
    task_id: string | null;
}
