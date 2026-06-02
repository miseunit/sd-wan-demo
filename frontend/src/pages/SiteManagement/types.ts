/**
 * SD-WAN 站点管理 - 类型定义
 */

/** 站点状态 */
export type SiteStatus = 'online' | 'offline' | 'warning';

/** 区域 */
export type Region = 'CN' | 'SG' | 'US' | 'EU';

/** 链路类型 */
export type LinkType = 'MPLS' | 'Internet' | '5G' | 'WAN';

/** 链路状态 */
export type LinkStatus = 'active' | 'standby' | 'down';

/** 告警级别 */
export type AlertSeverity = 'critical' | 'major' | 'minor';

/** 链路信息 */
export interface SiteLink {
  id: string;
  name: string;
  type: LinkType;
  isp: string;
  bandwidth: string;
  usedBandwidth: string;
  usagePercent: number;
  latency: number;
  loss: number;
  status: LinkStatus;
  ip: string;
}

/** 历史数据点 */
export interface HistoryPoint {
  time: string;
  latency: number;
  loss: number;
  bandwidth: number;
  /** 抖动（ms） */
  jitter: number;
  /** 吞吐量（Mbps） */
  throughput: number;
}

/** 站点配置 */
export interface SiteConfig {
  routePolicy: string;
  qosPolicy: string;
  priority: 'high' | 'medium' | 'low';
  slaLatency: number;
  slaLoss: number;
}

/** 告警信息 */
export interface SiteAlert {
  id: string;
  siteId: string;
  severity: AlertSeverity;
  title: string;
  reason: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  silenced: boolean;
  silenceUntil?: string;
}

/** 站点数据（核心） */
export interface Site {
  id: string;
  name: string;
  displayName: string;
  region: Region;
  status: SiteStatus;
  latency: number;
  loss: number;
  bandwidthUsage: number;
  bandwidthTotal: string;
  bandwidthUsed: string;
  deviceModel: string;
  deviceVersion: string;
  uptime: string;
  links: SiteLink[];
  activeLinkId: string;
  config: SiteConfig;
  alerts: SiteAlert[];
  /** 物理地址 */
  address?: string;
  /** 负责人 */
  manager?: string;
  /** CPE序列号 */
  serialNumber?: string;
  /** 管理IP */
  managementIp?: string;
  /** 站点类型: hq/branch/cloud */
  siteType?: 'hq' | 'branch' | 'cloud';
  /** 纬度 */
  lat?: number;
  /** 经度 */
  lng?: number;
}

/** 筛选条件 */
export interface FilterState {
  region: Region | 'all';
  status: SiteStatus | 'all';
  search: string;
  linkType?: LinkType | 'all';
}

/** 批量操作类型 */
export type BatchActionType = 'restart' | 'switchLink' | 'upgradeConfig';

/** 批量操作请求 */
export interface BatchActionRequest {
  action: BatchActionType;
  siteIds: string[];
}

/** 批量操作任务响应 */
export interface BatchTaskResponse {
  taskId: string;
  action: string;
  totalCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

/** 批量操作任务结果项 */
export interface BatchTaskResultItem {
  siteId: string;
  siteName: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  createdAt: string;
}

/** 批量操作任务状态 */
export interface BatchTaskStatus {
  taskId: string;
  action: string;
  totalCount: number;
  completedCount: number;
  successCount: number;
  failedCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: BatchTaskResultItem[];
  createdAt: string;
  completedAt?: string;
}

/** 站点统计信息 */
export interface SiteStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
  alertCount: number;
}

/** 链路信息（API 响应格式） */
export interface SiteLinkFromAPI {
  id: string;
  name: string;
  linkType: LinkType;
  isp: string;
  bandwidth: string;
  usedBandwidth: string;
  usagePercent: number;
  latency: number;
  loss: number;
  jitter: number;
  status: LinkStatus;
  healthStatus: string;
  ip: string;
  slaScore: number;
}

/** 站点配置（API 响应格式） */
export interface SiteConfigFromAPI {
  routePolicy: string;
  qosPolicy: string;
  priority: 'high' | 'medium' | 'low';
  slaLatency: number;
  slaLoss: number;
}

/** 告警信息（API 响应格式） */
export interface SiteAlertFromAPI {
  id: number;
  siteId: string;
  severity: AlertSeverity;
  title: string;
  reason: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  silenced: boolean;
  silenceUntil?: string;
}

/** 站点数据（API 响应格式） */
export interface SiteFromAPI {
  id: string;
  name: string;
  displayName: string;
  region: Region;
  status: SiteStatus;
  latency: number;
  loss: number;
  bandwidthUsage: number;
  bandwidthTotal: string;
  bandwidthUsed: string;
  deviceModel: string;
  deviceVersion: string;
  uptime: string;
  links: SiteLinkFromAPI[];
  activeLinkId: string;
  activeWanLinkId?: string;
  backupLinkIds?: string;
  config: SiteConfigFromAPI;
  alerts: SiteAlertFromAPI[];
  address?: string;
  manager?: string;
  serialNumber?: string;
  managementIp?: string;
  siteType?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
  updatedAt: string;
}

/** 链路切换响应 */
export interface LinkSwitchResponse {
  success: boolean;
  message: string;
  previousLinkId?: string;
  newLinkId: string;
}

/** 设备类型（从 DeviceManagement 导入） */
export type DeviceType = 'Edge' | 'Gateway' | 'CPE';

/** 在线状态 */
export type OnlineStatus = 'online' | 'offline';

/** 设备角色 */
export type DeviceRole = 'active' | 'standby';

/** 设备信息（简化版） */
export interface Device {
  id: string;
  name: string;
  device_type: DeviceType;
  site_id: string;
  site_name: string | null;
  online_status: OnlineStatus;
  heartbeat_status: 'ok' | 'timeout' | 'unknown';
  last_online: string | null;
  cpu_usage: number;
  memory_usage: number;
  temperature: number | null;
  bandwidth_usage: number;
  config_version: string;
  current_policy: string | null;
  sync_status: 'synced' | 'pending' | 'failed';
  sync_error: string | null;
  firmware_version: string;
  upgrade_status: 'none' | 'downloading' | 'installing' | 'rollback' | 'failed';
  upgrade_progress: number;
  can_upgrade: boolean;
  target_version: string | null;
  health_score: number;
  role: DeviceRole;
  session_count: number;
  created_at: string;
  updated_at: string;
}

/** 站点设备统计 */
export interface SiteDeviceStats {
  total: number;
  online: number;
  offline: number;
  active_count: number;
  standby_count: number;
}

/** 站点设备响应 */
export interface SiteDevicesResponse {
  site_id: string;
  devices: Device[];
  stats: SiteDeviceStats;
}

/** 站点聚合接口信息 */
export interface SiteAggregatedInterface {
  id: number;
  deviceId: string;
  name: string;
  interfaceType: 'WAN' | 'LAN' | 'MPLS' | 'Internet';
  status: 'up' | 'down';
  speed: string | null;
  mtu: number;
  ipAddress: string | null;
  subnetMask: string | null;
  gateway: string | null;
  packetLoss: number;
  isPrimary: boolean;
}

/** 站点聚合隧道信息 */
export interface SiteAggregatedTunnel {
  id: number;
  deviceId: string;
  tunnelName: string;
  tunnelType: 'IPsec' | 'GRE' | 'VXLAN';
  peerIp: string | null;
  localIp: string | null;
  status: 'up' | 'down' | 'connecting';
  uptime: string | null;
  txBytes: number;
  rxBytes: number;
  txPps: number;
  rxPps: number;
  isPrimary: boolean;
}

/** 站点接口+隧道聚合响应 */
export interface SiteNetworkResponse {
  interfaces: SiteAggregatedInterface[];
  tunnels: SiteAggregatedTunnel[];
}

/** WAN 接口配置（创建站点时使用） */
export interface WanInterfaceConfig {
  name: string;
  interfaceType?: string;
  ipAddress?: string;
  gateway?: string;
  speed?: string;
}

/** 站点表单数据 */
export interface SiteFormData {
  name: string;
  displayName: string;
  region: string;
  siteType: string;
  address?: string;
  manager?: string;
  serialNumber?: string;
  managementIp?: string;
  lat?: number | null;
  lng?: number | null;
  deviceModel?: string;
  deviceVersion?: string;
  status?: string;
  priority?: string;
  slaLatency?: number;
  slaLoss?: number;
  wanInterfaces?: WanInterfaceConfig[];
}