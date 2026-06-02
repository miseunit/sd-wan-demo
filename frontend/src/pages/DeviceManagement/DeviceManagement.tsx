/**
 * 设备管理 - 主页面
 * 核心功能：设备列表 / 在线状态 / 资源状态 / 接口 / 配置 / 隧道 / 升级 / 告警 / 健康评分
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Input, Select, Button, Tag, Drawer, Progress, Empty,
    message, Segmented, Spin, Pagination, Popconfirm,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    CheckCircleOutlined,
    DesktopOutlined, CloudServerOutlined, WifiOutlined,
    DashboardOutlined, SettingOutlined,
    SafetyCertificateOutlined,
    RocketOutlined, HistoryOutlined, WarningOutlined,
    ApiOutlined, CloudOutlined, SyncOutlined,
} from '@ant-design/icons';
import { fetchDevices, fetchDeviceStats, fetchDeviceDetail, executeDeviceAction, deleteDevice } from './api';
import type {
    Device, DeviceDetail, DeviceStats,
    DeviceFilterState, DeviceType,
} from './types';
import DeviceFormModal from './components/DeviceFormModal';
import './DeviceManagement.css';

/* ============================================================
 *  常量 & 工具函数
 * ============================================================ */

/** 设备类型配置 */
const DEVICE_TYPE_CONFIG: Record<DeviceType, { icon: React.ReactNode; color: string }> = {
    Edge: { icon: <DesktopOutlined />, color: '#1890ff' },
    Gateway: { icon: <CloudServerOutlined />, color: '#722ed1' },
    CPE: { icon: <WifiOutlined />, color: '#52c41a' },
};

/** 健康评分颜色 */
function healthColor(v: number): string {
    if (v >= 80) return '#52c41a';
    if (v >= 60) return '#faad14';
    return '#ff4d4f';
}

/** CPU/内存颜色 */
function usageColor(v: number): string {
    if (v < 50) return '#52c41a';
    if (v < 70) return '#faad14';
    return '#ff4d4f';
}

/** 温度颜色 */
function tempColor(v: number | null): string {
    if (v === null) return '#8892b0';
    if (v < 60) return '#52c41a';
    if (v < 75) return '#faad14';
    return '#ff4d4f';
}

/** 格式化数值，保留一位小数 */
function formatPercent(value: number): number {
    return Math.round(value * 10) / 10;
}

/** 格式化字节 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ============================================================
 *  主组件
 * ============================================================ */
export default function DeviceManagement() {
    /* ---------- 状态 ---------- */
    const [devices, setDevices] = useState<Device[]>([]);
    const [stats, setStats] = useState<DeviceStats | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<DeviceFilterState>({
        device_type: 'all',
        online_status: 'all',
        site_id: 'all',
        search: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'interfaces' | 'tunnels' | 'alerts' | 'upgrade'>('overview');
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    /* ---------- 加载设备统计 ---------- */
    const loadStats = useCallback(async () => {
        try {
            const data = await fetchDeviceStats();
            setStats(data);
        } catch {
            // 统计加载失败不影响列表
        }
    }, []);

    /* ---------- 加载设备列表（服务端分页） ---------- */
    const loadDevices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchDevices(filter, currentPage, pageSize);
            setDevices(res.items ?? []);
            setTotal(res.total ?? 0);
        } catch (err) {
            messageApi.error('加载设备列表失败');
        } finally {
            setLoading(false);
        }
    }, [filter, currentPage, pageSize, messageApi]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    /* ---------- 筛选变化时重置页码 ---------- */
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    /* ---------- 打开设备详情 ---------- */
    const openDetail = useCallback(async (device: Device) => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        setDrawerTab('overview');
        try {
            const detail = await fetchDeviceDetail(device.id);
            setSelectedDevice(detail);
        } catch (err) {
            messageApi.error('加载设备详情失败');
        } finally {
            setDrawerLoading(false);
        }
    }, [messageApi]);

    /* ---------- 设备操作 ---------- */
    const handleAction = useCallback(async (deviceId: string, action: string, params?: Record<string, unknown>) => {
        try {
            const res = await executeDeviceAction(deviceId, { action: action as any, params });
            if (res.success) {
                messageApi.success(res.message);
                // 刷新列表和详情
                loadDevices();
                if (selectedDevice?.id === deviceId) {
                    const detail = await fetchDeviceDetail(deviceId);
                    setSelectedDevice(detail);
                }
            } else {
                messageApi.error(res.message);
            }
        } catch (err) {
            messageApi.error('操作失败');
        }
    }, [messageApi, loadDevices, selectedDevice]);

    /* ---------- 渲染 ---------- */
    return (
        <div className="device-mgmt">
            {contextHolder}

            {/* 页面标题 */}
            <div className="device-mgmt__header">
                <div className="device-mgmt__header-left">
                    <h1 className="device-mgmt__title"><DesktopOutlined /> 设备管理</h1>
                    <span className="device-mgmt__subtitle">SD-WAN 设备监控与运维</span>
                </div>
                <div className="device-mgmt__header-right">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingDevice(null);
                            setFormModalVisible(true);
                        }}
                    >
                        新增设备
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={loadDevices}>刷新</Button>
                </div>
            </div>

            {/* 统计卡片 */}
            {stats && (
                <div className="overview-cards">
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#1890ff' }}>📡</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value">{stats.total}</span>
                            <span className="overview-card__label">总设备</span>
                        </div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#52c41a' }}>🟢</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value" style={{ color: '#52c41a' }}>{stats.online}</span>
                            <span className="overview-card__label">在线</span>
                        </div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#ff4d4f' }}>🔴</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value" style={{ color: '#ff4d4f' }}>{stats.offline}</span>
                            <span className="overview-card__label">离线</span>
                        </div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#52c41a' }}>✅</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value" style={{ color: '#52c41a' }}>{stats.healthy}</span>
                            <span className="overview-card__label">健康</span>
                        </div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#faad14' }}>⚠️</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value" style={{ color: '#faad14' }}>{stats.warning}</span>
                            <span className="overview-card__label">告警</span>
                        </div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-card__icon" style={{ color: '#ff4d4f' }}>🚨</div>
                        <div className="overview-card__info">
                            <span className="overview-card__value" style={{ color: '#ff4d4f' }}>{stats.critical}</span>
                            <span className="overview-card__label">严重</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 筛选栏 */}
            <div className="filter-bar">
                <div className="filter-bar__left">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="搜索设备名称 / 站点..."
                        allowClear
                        value={filter.search}
                        onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                        style={{ width: 280 }}
                    />
                    <Select
                        placeholder="设备类型"
                        allowClear
                        value={filter.device_type === 'all' ? undefined : filter.device_type}
                        onChange={(v) => setFilter((f) => ({ ...f, device_type: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '🖥️ Edge', value: 'Edge' },
                            { label: '🌐 Gateway', value: 'Gateway' },
                            { label: '📡 CPE', value: 'CPE' },
                        ]}
                    />
                    <Select
                        placeholder="在线状态"
                        allowClear
                        value={filter.online_status === 'all' ? undefined : filter.online_status}
                        onChange={(v) => setFilter((f) => ({ ...f, online_status: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '🟢 在线', value: 'online' },
                            { label: '🔴 离线', value: 'offline' },
                        ]}
                    />
                    <span className="filter-bar__count">共 <strong>{total}</strong> 台设备</span>
                </div>
            </div>

            {/* 设备列表 */}
            <div className="device-grid">
                {loading ? (
                    <div className="device-grid__loading"><Spin size="large" tip="加载中..." /></div>
                ) : devices.length === 0 ? (
                    <Empty description="暂无设备数据" />
                ) : (
                    devices.map((device) => (
                        <div
                            key={device.id}
                            className={`device-card device-card--${device.online_status}`}
                            onClick={() => openDetail(device)}
                        >
                            <div className="device-card__header">
                                <div className="device-card__icon" style={{ color: DEVICE_TYPE_CONFIG[device.device_type]?.color }}>
                                    {DEVICE_TYPE_CONFIG[device.device_type]?.icon || <DesktopOutlined />}
                                </div>
                                <div className="device-card__info">
                                    <div className="device-card__name">{device.name}</div>
                                    <div className="device-card__meta">
                                        <Tag color={DEVICE_TYPE_CONFIG[device.device_type]?.color}>{device.device_type}</Tag>
                                        <span className="device-card__site">{device.site_name || device.site_id}</span>
                                    </div>
                                </div>
                                <div className="device-card__status">
                                    <span className={`status-dot status-dot--${device.online_status}`} />
                                    <span>{device.online_status === 'online' ? '在线' : '离线'}</span>
                                </div>
                            </div>

                            <div className="device-card__metrics">
                                <div className="device-card__metric">
                                    <span className="device-card__metric-label">CPU</span>
                                    <Progress
                                        percent={formatPercent(device.cpu_usage)}
                                        size="small"
                                        strokeColor={usageColor(device.cpu_usage)}
                                        trailColor="var(--border-primary)"
                                        format={(p) => <span style={{ color: usageColor(device.cpu_usage) }}>{p}%</span>}
                                    />
                                </div>
                                <div className="device-card__metric">
                                    <span className="device-card__metric-label">内存</span>
                                    <Progress
                                        percent={formatPercent(device.memory_usage)}
                                        size="small"
                                        strokeColor={usageColor(device.memory_usage)}
                                        trailColor="var(--border-primary)"
                                        format={(p) => <span style={{ color: usageColor(device.memory_usage) }}>{p}%</span>}
                                    />
                                </div>
                            </div>

                            <div className="device-card__footer">
                                <div className="device-card__health">
                                    <SafetyCertificateOutlined style={{ color: healthColor(device.health_score) }} />
                                    <span style={{ color: healthColor(device.health_score), fontWeight: 700 }}>
                                        {formatPercent(device.health_score)}
                                    </span>
                                </div>
                                <div className="device-card__version">
                                    v{device.firmware_version}
                                </div>
                                {device.upgrade_status !== 'none' && (
                                    <Tag color="blue" style={{ fontSize: 10 }}>
                                        <SyncOutlined spin={device.upgrade_status === 'downloading' || device.upgrade_status === 'installing'} />
                                        {' '}{device.upgrade_status === 'downloading' ? '下载中' : device.upgrade_status === 'installing' ? '安装中' : device.upgrade_status}
                                    </Tag>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ===== 分页 ===== */}
            {total > 0 && (
                <div className="pagination-bar">
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={total}
                        onChange={(page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        }}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 台设备`}
                        pageSizeOptions={['12', '24', '48', '96']}
                    />
                </div>
            )}

            {/* 设备详情抽屉 */}
            <Drawer
                title={null}
                placement="right"
                width={640}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className="device-drawer"
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                {drawerLoading ? (
                    <div className="drawer-loading"><Spin size="large" tip="加载详情..." /></div>
                ) : selectedDevice ? (
                    <div className="detail-drawer">
                        {/* 头部 */}
                        <div className={`detail-drawer__header detail-drawer__header--${selectedDevice.online_status}`}>
                            <div className="detail-drawer__header-top">
                                <h2>{selectedDevice.name}</h2>
                                <span className="detail-drawer__code">{selectedDevice.device_type}</span>
                                <span className={`detail-drawer__status detail-drawer__status--${selectedDevice.online_status}`}>
                                    <span className={`status-dot status-dot--${selectedDevice.online_status}`} />
                                    {selectedDevice.online_status === 'online' ? '在线' : '离线'}
                                </span>
                            </div>
                            <div className="detail-drawer__meta">
                                <span>{selectedDevice.site_name || selectedDevice.site_id}</span>
                                <span>·</span>
                                <span>心跳: {selectedDevice.heartbeat_status === 'ok' ? '正常' : '超时'}</span>
                                <span>·</span>
                                <span>固件: v{selectedDevice.firmware_version}</span>
                            </div>
                        </div>

                        {/* 标签页 */}
                        <div className="detail-drawer__tabs">
                            <Segmented
                                value={drawerTab}
                                onChange={(v) => setDrawerTab(v as any)}
                                options={[
                                    { label: '概览', value: 'overview' },
                                    { label: '接口', value: 'interfaces' },
                                    { label: '隧道', value: 'tunnels' },
                                    { label: '告警', value: 'alerts' },
                                    { label: '升级', value: 'upgrade' },
                                ]}
                            />
                        </div>

                        <div className="detail-drawer__body">
                            {/* 概览标签页 */}
                            {drawerTab === 'overview' && (
                                <>
                                    {/* 健康评分 */}
                                    <section className="detail-section">
                                        <h4 className="detail-section__title"><SafetyCertificateOutlined /> 健康评分</h4>
                                        <div className="health-score-panel">
                                            <div className="health-score-ring">
                                                <svg viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" strokeWidth="6" />
                                                    <circle
                                                        cx="50" cy="50" r="42"
                                                        fill="none"
                                                        stroke={healthColor(selectedDevice.health_score)}
                                                        strokeWidth="6"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${selectedDevice.health_score * 2.64} 264`}
                                                        transform="rotate(-90 50 50)"
                                                    />
                                                </svg>
                                                <div className="health-score-value" style={{ color: healthColor(selectedDevice.health_score) }}>
                                                    {formatPercent(selectedDevice.health_score)}
                                                </div>
                                            </div>
                                            <div className="health-score-breakdown">
                                                <div className="health-score-item">
                                                    <span>CPU 使用率</span>
                                                    <span style={{ color: usageColor(selectedDevice.cpu_usage) }}>{formatPercent(selectedDevice.cpu_usage)}%</span>
                                                </div>
                                                <div className="health-score-item">
                                                    <span>内存使用率</span>
                                                    <span style={{ color: usageColor(selectedDevice.memory_usage) }}>{formatPercent(selectedDevice.memory_usage)}%</span>
                                                </div>
                                                {selectedDevice.temperature !== null && (
                                                    <div className="health-score-item">
                                                        <span>温度</span>
                                                        <span style={{ color: tempColor(selectedDevice.temperature) }}>{formatPercent(selectedDevice.temperature)}°C</span>
                                                    </div>
                                                )}
                                                <div className="health-score-item">
                                                    <span>在线状态</span>
                                                    <span style={{ color: selectedDevice.online_status === 'online' ? '#52c41a' : '#ff4d4f' }}>
                                                        {selectedDevice.online_status === 'online' ? '在线' : '离线'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 资源状态 */}
                                    <section className="detail-section">
                                        <h4 className="detail-section__title"><DashboardOutlined /> 资源状态</h4>
                                        <div className="resource-grid">
                                            <div className="resource-card">
                                                <div className="resource-card__label">CPU</div>
                                                <div className="resource-card__value" style={{ color: usageColor(selectedDevice.cpu_usage) }}>
                                                    {formatPercent(selectedDevice.cpu_usage)}%
                                                </div>
                                                <Progress
                                                    percent={formatPercent(selectedDevice.cpu_usage)}
                                                    showInfo={false}
                                                    strokeColor={usageColor(selectedDevice.cpu_usage)}
                                                    trailColor="var(--border-primary)"
                                                />
                                            </div>
                                            <div className="resource-card">
                                                <div className="resource-card__label">内存</div>
                                                <div className="resource-card__value" style={{ color: usageColor(selectedDevice.memory_usage) }}>
                                                    {formatPercent(selectedDevice.memory_usage)}%
                                                </div>
                                                <Progress
                                                    percent={formatPercent(selectedDevice.memory_usage)}
                                                    showInfo={false}
                                                    strokeColor={usageColor(selectedDevice.memory_usage)}
                                                    trailColor="var(--border-primary)"
                                                />
                                            </div>
                                            <div className="resource-card">
                                                <div className="resource-card__label">带宽占用</div>
                                                <div className="resource-card__value" style={{ color: '#1890ff' }}>
                                                    {formatPercent(selectedDevice.bandwidth_usage)} Mbps
                                                </div>
                                            </div>
                                            {selectedDevice.temperature !== null && (
                                                <div className="resource-card">
                                                    <div className="resource-card__label">温度</div>
                                                    <div className="resource-card__value" style={{ color: tempColor(selectedDevice.temperature) }}>
                                                        {formatPercent(selectedDevice.temperature)}°C
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 配置状态 */}
                                    <section className="detail-section">
                                        <h4 className="detail-section__title"><SettingOutlined /> 配置状态</h4>
                                        <div className="config-grid">
                                            <div className="config-item">
                                                <span className="config-item__label">配置版本</span>
                                                <span className="config-item__value">v{selectedDevice.config_version}</span>
                                            </div>
                                            <div className="config-item">
                                                <span className="config-item__label">当前策略</span>
                                                <span className="config-item__value">{selectedDevice.current_policy || '—'}</span>
                                            </div>
                                            <div className="config-item">
                                                <span className="config-item__label">同步状态</span>
                                                <Tag color={selectedDevice.sync_status === 'synced' ? 'green' : selectedDevice.sync_status === 'pending' ? 'orange' : 'red'}>
                                                    {selectedDevice.sync_status === 'synced' ? '已同步' : selectedDevice.sync_status === 'pending' ? '同步中' : '同步失败'}
                                                </Tag>
                                            </div>
                                            {selectedDevice.sync_error && (
                                                <div className="config-item config-item--error">
                                                    <span className="config-item__label">错误信息</span>
                                                    <span className="config-item__value" style={{ color: '#ff4d4f' }}>{selectedDevice.sync_error}</span>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* 接口标签页 */}
                            {drawerTab === 'interfaces' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><ApiOutlined /> 设备接口</h4>
                                    {selectedDevice.interfaces.length === 0 ? (
                                        <Empty description="暂无接口数据" />
                                    ) : (
                                        <div className="interface-list">
                                            {selectedDevice.interfaces.map((iface) => (
                                                <div key={iface.id} className={`interface-card interface-card--${iface.status}`}>
                                                    <div className="interface-card__header">
                                                        <Tag color={iface.interface_type === 'WAN' ? 'blue' : iface.interface_type === 'LAN' ? 'green' : iface.interface_type === 'MPLS' ? 'purple' : 'orange'}>
                                                            {iface.interface_type}
                                                        </Tag>
                                                        <span className="interface-card__name">{iface.name}</span>
                                                        <span className={`interface-card__status interface-card__status--${iface.status}`}>
                                                            {iface.status === 'up' ? 'UP' : 'DOWN'}
                                                        </span>
                                                    </div>
                                                    <div className="interface-card__info">
                                                        {iface.speed && <span>速率: {iface.speed}</span>}
                                                        {iface.ip_address && <span>IP: {iface.ip_address}</span>}
                                                        {iface.packet_loss > 0 && <span style={{ color: '#ff4d4f' }}>丢包: {formatPercent(iface.packet_loss)}%</span>}
                                                        {iface.link_name && <span style={{ color: '#1890ff' }}>链路: {iface.link_name}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* 隧道标签页 */}
                            {drawerTab === 'tunnels' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><CloudOutlined /> 隧道 / Overlay</h4>
                                    {selectedDevice.tunnels.length === 0 ? (
                                        <Empty description="暂无隧道数据" />
                                    ) : (
                                        <div className="tunnel-list">
                                            {selectedDevice.tunnels.map((tunnel) => (
                                                <div key={tunnel.id} className={`tunnel-card tunnel-card--${tunnel.status}`}>
                                                    <div className="tunnel-card__header">
                                                        <Tag color={tunnel.tunnel_type === 'IPsec' ? 'blue' : tunnel.tunnel_type === 'GRE' ? 'purple' : 'orange'}>
                                                            {tunnel.tunnel_type}
                                                        </Tag>
                                                        <span className="tunnel-card__name">{tunnel.tunnel_name}</span>
                                                        <span className={`tunnel-card__status tunnel-card__status--${tunnel.status}`}>
                                                            {tunnel.status === 'up' ? '已建立' : tunnel.status === 'connecting' ? '连接中' : '断开'}
                                                        </span>
                                                    </div>
                                                    <div className="tunnel-card__info">
                                                        <span>对端: {tunnel.peer_ip || '—'}</span>
                                                        <span>本地: {tunnel.local_ip || '—'}</span>
                                                        {tunnel.uptime && <span>运行: {tunnel.uptime}</span>}
                                                        {tunnel.link_name && <span style={{ color: '#1890ff' }}>链路: {tunnel.link_name}</span>}
                                                    </div>
                                                    <div className="tunnel-card__traffic">
                                                        <span>TX: {formatBytes(tunnel.tx_bytes)}</span>
                                                        <span>RX: {formatBytes(tunnel.rx_bytes)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* 告警标签页 */}
                            {drawerTab === 'alerts' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><WarningOutlined /> 告警信息</h4>
                                    {selectedDevice.alerts.length === 0 ? (
                                        <Empty description="暂无告警" />
                                    ) : (
                                        <div className="alert-list">
                                            {selectedDevice.alerts.map((alert) => (
                                                <div key={alert.id} className={`alert-card alert-card--${alert.severity} ${alert.resolved ? 'alert-card--resolved' : ''}`}>
                                                    <div className="alert-card__header">
                                                        <Tag color={alert.severity === 'critical' ? 'red' : alert.severity === 'major' ? 'orange' : 'blue'}>
                                                            {alert.severity === 'critical' ? '严重' : alert.severity === 'major' ? '重要' : '一般'}
                                                        </Tag>
                                                        <Tag color={alert.alert_type === 'device_down' ? 'red' : alert.alert_type === 'cpu_high' ? 'orange' : 'blue'}>
                                                            {alert.alert_type === 'device_down' ? '设备离线' : alert.alert_type === 'cpu_high' ? 'CPU过高' : alert.alert_type === 'tunnel_down' ? '隧道断开' : alert.alert_type}
                                                        </Tag>
                                                        <span className="alert-card__time">{new Date(alert.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="alert-card__title">{alert.title}</div>
                                                    {alert.description && <div className="alert-card__desc">{alert.description}</div>}
                                                    {alert.resolved && (
                                                        <div className="alert-card__resolved">
                                                            <CheckCircleOutlined /> 已解决 ({new Date(alert.resolved_at!).toLocaleString()})
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* 升级标签页 */}
                            {drawerTab === 'upgrade' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><RocketOutlined /> 设备升级</h4>
                                    <div className="upgrade-info">
                                        <div className="upgrade-info__current">
                                            <span className="upgrade-info__label">当前版本</span>
                                            <span className="upgrade-info__value">v{selectedDevice.firmware_version}</span>
                                        </div>
                                        {selectedDevice.can_upgrade && (
                                            <div className="upgrade-info__available">
                                                <Tag color="blue">可升级</Tag>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    onClick={() => handleAction(selectedDevice.id, 'start_upgrade', { target_version: selectedDevice.target_version || '20.4.0' })}
                                                >
                                                    开始升级
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDevice.upgrade_status !== 'none' && (
                                        <div className="upgrade-progress">
                                            <div className="upgrade-progress__header">
                                                <span>升级进度</span>
                                                <Tag color={selectedDevice.upgrade_status === 'downloading' ? 'blue' : selectedDevice.upgrade_status === 'installing' ? 'orange' : selectedDevice.upgrade_status === 'failed' ? 'red' : 'green'}>
                                                    {selectedDevice.upgrade_status === 'downloading' ? '下载中' : selectedDevice.upgrade_status === 'installing' ? '安装中' : selectedDevice.upgrade_status}
                                                </Tag>
                                            </div>
                                            <Progress percent={selectedDevice.upgrade_progress} status="active" />
                                        </div>
                                    )}

                                    {selectedDevice.upgrade_history.length > 0 && (
                                        <div className="upgrade-history">
                                            <h5><HistoryOutlined /> 升级历史</h5>
                                            {selectedDevice.upgrade_history.map((record) => (
                                                <div key={record.id} className="upgrade-record">
                                                    <div className="upgrade-record__header">
                                                        <span>v{record.from_version} → v{record.to_version}</span>
                                                        <Tag color={record.status === 'success' ? 'green' : record.status === 'failed' ? 'red' : 'blue'}>
                                                            {record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : record.status}
                                                        </Tag>
                                                    </div>
                                                    <div className="upgrade-record__time">
                                                        {record.started_at && new Date(record.started_at).toLocaleString()}
                                                        {record.completed_at && ` → ${new Date(record.completed_at).toLocaleString()}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* 底部操作 */}
                        <div className="detail-drawer__footer">
                            <Button
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setEditingDevice(selectedDevice);
                                    setFormModalVisible(true);
                                }}
                            >
                                编辑
                            </Button>
                            <Popconfirm
                                title="确定删除该设备？"
                                description="删除后不可恢复，确定继续吗？"
                                onConfirm={async () => {
                                    try {
                                        await deleteDevice(selectedDevice.id);
                                        messageApi.success('设备已删除');
                                        setDrawerOpen(false);
                                        loadDevices();
                                    } catch (err: any) {
                                        messageApi.error(err.message || '删除失败');
                                    }
                                }}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button danger icon={<DeleteOutlined />}>
                                    删除
                                </Button>
                            </Popconfirm>
                            <Button
                                icon={<SyncOutlined />}
                                onClick={() => handleAction(selectedDevice.id, 'sync_config')}
                            >
                                同步配置
                            </Button>
                            {selectedDevice.online_status === 'online' && (
                                <Button
                                    danger
                                    onClick={() => handleAction(selectedDevice.id, 'restart')}
                                >
                                    重启设备
                                </Button>
                            )}
                            {selectedDevice.upgrade_history.length > 0 && (
                                <Button
                                    onClick={() => handleAction(selectedDevice.id, 'rollback')}
                                >
                                    回滚版本
                                </Button>
                            )}
                        </div>
                    </div>
                ) : null}
            </Drawer>

            {/* 设备表单弹窗 */}
            <DeviceFormModal
                visible={formModalVisible}
                device={editingDevice}
                onClose={() => {
                    setFormModalVisible(false);
                    setEditingDevice(null);
                }}
                onSuccess={() => {
                    loadDevices();
                    loadStats();
                }}
            />
        </div>
    );
}
