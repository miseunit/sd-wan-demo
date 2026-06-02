/**
 * SD-WAN 站点管理 - 主页面
 * 核心功能：概览卡片 / 搜索筛选 / 站点表格 / 详情面板 / 告警联动 / 批量操作
 * 新增：真实 API 对接 / 批量操作进度追踪 / 数据导出 / 告警确认静默 / 键盘快捷键
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Input, Select, Button, Tag, Badge, Drawer, Progress, Spin,
    Tooltip, Dropdown, message, Segmented, Empty, Space, Modal, Pagination, Table, ConfigProvider,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, SwapOutlined, CloudUploadOutlined,
    PoweroffOutlined, WarningOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, ArrowUpOutlined,
    ArrowDownOutlined, LinkOutlined, SettingOutlined, LineChartOutlined,
    BellOutlined, ThunderboltOutlined, DownloadOutlined, EyeInvisibleOutlined,
    CheckOutlined, StopOutlined, DesktopOutlined, PlusOutlined, EditOutlined,
    ApiOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTheme, THEME_TYPES } from '../../contexts/ThemeContext';
import {
    getSites, getSiteStats, batchAction, getBatchTaskStatus,
    switchLink, acknowledgeAlert, silenceAlert, getSiteDevices,
    getSiteNetwork, deleteSite, setPrimaryLink,
} from '../../services/siteApi';
import { getLinkHistory } from '../../services/linkApi';
import type {
    Site, SiteStatus, Region, FilterState,
    SiteLink, HistoryPoint, BatchActionType, SiteFromAPI,
    SiteDevicesResponse, SiteDeviceStats, SiteNetworkResponse,
} from './types';
import BatchTaskModal from './BatchTaskModal';
import ExportModal from './ExportModal';
import SiteFormModal from './SiteFormModal';
import DeviceCard from '../DeviceManagement/components/DeviceCard';
import './SiteManagement.css';

/* ============================================================
 *  常量 & 工具函数
 * ============================================================ */

const REGION_LABELS: Record<Region, string> = {
    CN: '🇨🇳 中国', SG: '🇸🇬 新加坡', US: '🇺🇸 美国', EU: '🇪🇺 欧洲',
};

const SITE_TYPE_LABELS: Record<string, string> = {
    hq: '总部', branch: '分支', cloud: '云端',
};

const STATUS_CONFIG: Record<SiteStatus, { label: string; color: string; icon: React.ReactNode }> = {
    online: { label: '在线', color: '#52c41a', icon: <CheckCircleOutlined /> },
    offline: { label: '离线', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
    warning: { label: '告警', color: '#faad14', icon: <ExclamationCircleOutlined /> },
};

const LINK_TYPE_COLORS: Record<string, string> = {
    MPLS: 'blue',
    Internet: 'green',
    '5G': 'purple',
    WAN: 'orange',
    IPsec: 'cyan',
    GRE: 'lime',
    VXLAN: 'orange',
};

/** 历史曲线指标配置 */
const METRIC_COLORS: Record<string, string> = {
    latency: '#1890ff',
    loss: '#ff4d4f',
    bandwidth: '#52c41a',
    jitter: '#faad14',
    throughput: '#722ed1',
};

const METRIC_LABELS: Record<string, string> = {
    latency: '延迟',
    loss: '丢包率',
    bandwidth: '带宽',
    jitter: '抖动',
    throughput: '吞吐量',
};

/** Y 轴刻度格式化 */
const METRIC_FORMATTERS: Record<string, (v: number) => string> = {
    latency: (v) => `${v.toFixed(0)}ms`,
    loss: (v) => `${v.toFixed(2)}%`,
    bandwidth: (v) => `${v.toFixed(0)}M`,
    jitter: (v) => `${v.toFixed(0)}ms`,
    throughput: (v) => `${v.toFixed(0)}M`,
};

/** Tooltip 值格式化 */
function METRIC_TOOLTIP_FORMAT(metric: string, value: number): string {
    if (metric === 'latency') return `${value.toFixed(1)} ms`;
    if (metric === 'loss') return `${value.toFixed(3)} %`;
    if (metric === 'bandwidth') return `${value.toFixed(1)} Mbps`;
    if (metric === 'jitter') return `${value.toFixed(1)} ms`;
    if (metric === 'throughput') return `${value.toFixed(1)} Mbps`;
    return `${value}`;
}

// 键盘快捷键配置
const SHORTCUTS = {
    SEARCH: 'Ctrl+F',
    SELECT_ALL: 'Ctrl+A',
    DESELECT_ALL: 'Ctrl+D',
    OPEN_DETAIL: 'Enter',
    CLOSE_DRAWER: 'Escape',
    RELOAD: 'Ctrl+R',
    EXPORT: 'Ctrl+E',
};

function latencyColor(v: number): string {
    if (v === 0) return '#ff4d4f';
    if (v < 20) return '#52c41a';
    if (v < 50) return '#faad14';
    if (v < 100) return '#fa8c16';
    return '#ff4d4f';
}

function lossColor(v: number): string {
    if (v >= 100) return '#ff4d4f';
    if (v < 0.05) return '#52c41a';
    if (v < 0.2) return '#faad14';
    return '#ff4d4f';
}

function bandwidthColor(v: number): string {
    if (v < 50) return '#52c41a';
    if (v < 80) return '#faad14';
    return '#ff4d4f';
}

/** 格式化字节数 */
function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function SiteManagement() {
    /* ---------- 主题 ---------- */
    const { theme } = useTheme();
    const isDark = theme === THEME_TYPES.DARK;

    /* ---------- 状态 ---------- */
    const [filter, setFilter] = useState<FilterState>({ region: 'all', status: 'all', search: '', linkType: 'all' });
    const [sites, setSites] = useState<Site[]>([]);
    const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, warning: 0, alertCount: 0 });
    const [loading, setLoading] = useState(false);
    const [totalSites, setTotalSites] = useState(0);  // 分页总数
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [historyRange, setHistoryRange] = useState<'5min' | '1hour' | '24hour'>('5min');
    const [historyMetric, setHistoryMetric] = useState<'latency' | 'loss' | 'bandwidth' | 'jitter' | 'throughput'>('latency');
    const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [messageApi, contextHolder] = message.useMessage();
    const searchInputRef = useRef<any>(null);

    // 批量操作相关状态
    const [batchTaskOpen, setBatchTaskOpen] = useState(false);
    const [batchTaskId, setBatchTaskId] = useState<string | null>(null);
    const [batchAction, setBatchAction] = useState<BatchActionType | null>(null);

    // 导出相关状态
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // 站点表单相关状态
    const [siteFormOpen, setSiteFormOpen] = useState(false);
    const [siteFormMode, setSiteFormMode] = useState<'create' | 'edit'>('create');
    const [editingSite, setEditingSite] = useState<Site | null>(null);

    // 设备相关状态
    const [siteDevicesData, setSiteDevicesData] = useState<SiteDevicesResponse | null>(null);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'devices' | 'interfaces' | 'tunnels'>('overview');

    // 网络（接口+隧道）相关状态
    const [siteNetwork, setSiteNetwork] = useState<SiteNetworkResponse | null>(null);
    const [networkLoading, setNetworkLoading] = useState(false);

    /* ---------- 数据加载 ---------- */
    const fetchSites = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSites({
                region: filter.region === 'all' ? undefined : filter.region,
                status: filter.status === 'all' ? undefined : filter.status,
                search: filter.search || undefined,
                linkType: filter.linkType === 'all' ? undefined : filter.linkType,
                page: currentPage,
                pageSize: pageSize,
            });

            // 后端现在返回分页对象：{ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }
            const items = data && typeof data === 'object' && 'items' in data ? data.items : data;
            const total = data && typeof data === 'object' && 'total' in data ? data.total : data.length;

            // 转换 API 响应格式为组件使用的格式
            const formattedSites: Site[] = items.map((item: SiteFromAPI) => ({
                id: item.id,
                name: item.name,
                displayName: item.displayName,
                region: item.region,
                status: item.status,
                latency: item.latency,
                loss: item.loss,
                bandwidthUsage: item.bandwidthUsage,
                bandwidthTotal: item.bandwidthTotal,
                bandwidthUsed: item.bandwidthUsed,
                deviceModel: item.deviceModel,
                deviceVersion: item.deviceVersion,
                uptime: item.uptime,
                address: item.address,
                manager: item.manager,
                serialNumber: item.serialNumber,
                managementIp: item.managementIp,
                siteType: item.siteType,
                lat: item.lat,
                lng: item.lng,
                links: item.links.map((link) => ({
                    id: link.id,
                    name: link.name,
                    type: link.linkType,
                    isp: link.isp,
                    bandwidth: link.bandwidth,
                    usedBandwidth: link.usedBandwidth,
                    usagePercent: link.usagePercent,
                    latency: link.latency,
                    loss: link.loss,
                    status: link.status,
                    ip: link.ip,
                })),
                activeLinkId: item.activeLinkId,
                config: item.config,
                alerts: item.alerts.map((alert) => ({
                    ...alert,
                    id: String(alert.id),
                })),
            }));

            setSites(formattedSites);
            setTotalSites(total);
            return formattedSites;
        } catch (error) {
            console.error('加载站点数据失败:', error);
            messageApi.error('加载站点数据失败');
        } finally {
            setLoading(false);
        }
    }, [filter, currentPage, pageSize, messageApi]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getSiteStats();
            setStats(data);
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }, []);

    const fetchSiteHistory = useCallback(async (siteId: string, linkId?: string) => {
        try {
            // 使用活跃链路 ID 获取历史数据
            const targetLinkId = linkId || selectedSite?.activeLinkId;
            if (!targetLinkId) {
                setHistoryData([]);
                return;
            }
            const data = await getLinkHistory(targetLinkId, historyRange);
            setHistoryData(data);
        } catch (error) {
            console.error('加载历史数据失败:', error);
            setHistoryData([]);
        }
    }, [historyRange, selectedSite]);

    const fetchSiteDevices = useCallback(async (siteId: string) => {
        setDevicesLoading(true);
        try {
            const data = await getSiteDevices(siteId);
            setSiteDevicesData(data);
        } catch (error) {
            console.error('加载站点设备失败:', error);
            messageApi.error('加载站点设备失败');
        } finally {
            setDevicesLoading(false);
        }
    }, [messageApi]);

    /** 加载站点网络接口和隧道数据 */
    const fetchSiteNetwork = useCallback(async (siteId: string) => {
        setNetworkLoading(true);
        try {
            const data = await getSiteNetwork(siteId);
            setSiteNetwork(data);
        } catch (error) {
            console.error('加载网络接口数据失败:', error);
        } finally {
            setNetworkLoading(false);
        }
    }, []);

    // 初始加载和定时刷新
    useEffect(() => {
        fetchSites();
        fetchStats();

        // 设置定时刷新（每30秒）
        const interval = setInterval(() => {
            fetchSites();
            fetchStats();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchSites, fetchStats]);

    // 详情面板打开或时间范围变化时加载历史数据
    useEffect(() => {
        if (drawerOpen && selectedSite) {
            const targetLinkId = selectedSite.activeLinkId;
            if (targetLinkId) {
                fetchSiteHistory(selectedSite.id, targetLinkId);
            }
        }
    }, [drawerOpen, selectedSite, historyRange, fetchSiteHistory]);

    /* ---------- 筛选 + 排序 ---------- */
    // 注意：筛选现在在服务端处理，这里只做客户端排序（如果需要）
    const filteredSites = useMemo(() => {
        return sites;
    }, [sites]);

    /* ---------- 全局告警列表 ---------- */
    const allAlerts = useMemo(() => {
        return sites
            .filter((s) => s.alerts.length > 0)
            .flatMap((s) => s.alerts.map((a) => ({ ...a, siteName: s.displayName, siteId: s.id })));
    }, [sites]);

    /* ---------- 点击站点 → 打开详情 ---------- */
    const openDetail = useCallback(async (site: Site) => {
        setSelectedSite(site);
        setDrawerOpen(true);
        setDrawerTab('overview');
        // 加载历史数据（使用活跃链路 ID）
        await fetchSiteHistory(site.id, site.activeLinkId);
        // 加载站点设备数据
        await fetchSiteDevices(site.id);
        // 加载网络接口和隧道数据
        await fetchSiteNetwork(site.id);
    }, [fetchSiteHistory, fetchSiteDevices, fetchSiteNetwork]);

    /* ---------- 告警点击 → 定位站点 ---------- */
    const handleAlertClick = useCallback((siteId: string) => {
        const site = sites.find((s) => s.id === siteId);
        if (site) {
            openDetail(site);
        }
    }, [sites, openDetail]);

    /* ---------- 批量操作 ---------- */
    const handleBatchAction = useCallback(async (action: BatchActionType) => {
        const count = selectedRowKeys.length;
        if (count === 0) return;

        try {
            const response = await batchAction({
                action,
                siteIds: selectedRowKeys as string[],
            });

            // 打开进度弹窗
            setBatchTaskId(response.taskId);
            setBatchAction(action);
            setBatchTaskOpen(true);

            messageApi.success(`批量操作任务已创建，正在执行...`);
            setSelectedRowKeys([]);
        } catch (error) {
            console.error('批量操作失败:', error);
            messageApi.error('批量操作失败: ' + error.message);
        }
    }, [selectedRowKeys, messageApi]);

    /* ---------- 链路手动切换 ---------- */
    const handleSwitchLink = useCallback(async (siteId: string, linkId: string) => {
        try {
            await switchLink(siteId, linkId);
            messageApi.success(`链路切换指令已下发`);
            // 刷新数据并同步更新抽屉中的站点信息
            const refreshed = await fetchSites();
            if (refreshed) {
                const updatedSite = refreshed.find(s => s.id === siteId);
                if (updatedSite) setSelectedSite(updatedSite);
                // 刷新历史数据（使用新的活跃链路 ID）
                await fetchSiteHistory(siteId, updatedSite?.activeLinkId);
            }
        } catch (error) {
            console.error('链路切换失败:', error);
            messageApi.error('链路切换失败: ' + error.message);
        }
    }, [fetchSites, fetchSiteHistory, messageApi]);

    /* ---------- 告警确认 ---------- */
    const handleAcknowledgeAlert = useCallback(async (siteId: string, alertId: string) => {
        Modal.confirm({
            title: '确认告警',
            content: '确认此告警已处理？',
            onOk: async () => {
                try {
                    await acknowledgeAlert(siteId, alertId, { operator: '当前用户' });
                    messageApi.success('告警已确认');
                    // 刷新数据并同步更新抽屉
                    const refreshed = await fetchSites();
                    if (refreshed && selectedSite?.id === siteId) {
                        const updatedSite = refreshed.find(s => s.id === siteId);
                        if (updatedSite) setSelectedSite(updatedSite);
                    }
                } catch (error) {
                    console.error('告警确认失败:', error);
                    messageApi.error('告警确认失败: ' + error.message);
                }
            },
        });
    }, [fetchSites, messageApi, selectedSite]);

    /* ---------- 告警静默 ---------- */
    const handleSilenceAlert = useCallback(async (siteId: string, alertId: string) => {
        Modal.confirm({
            title: '静默告警',
            content: (
                <div>
                    <p>静默此告警？</p>
                    <Select defaultValue={30} style={{ width: 120 }}>
                        <Select.Option value={5}>5 分钟</Select.Option>
                        <Select.Option value={15}>15 分钟</Select.Option>
                        <Select.Option value={30}>30 分钟</Select.Option>
                        <Select.Option value={60}>1 小时</Select.Option>
                        <Select.Option value={240}>4 小时</Select.Option>
                        <Select.Option value={1440}>24 小时</Select.Option>
                    </Select>
                </div>
            ),
            onOk: async () => {
                try {
                    await silenceAlert(siteId, alertId, { durationMinutes: 30 });
                    messageApi.success('告警已静默');
                    // 刷新数据并同步更新抽屉
                    const refreshed = await fetchSites();
                    if (refreshed && selectedSite?.id === siteId) {
                        const updatedSite = refreshed.find(s => s.id === siteId);
                        if (updatedSite) setSelectedSite(updatedSite);
                    }
                } catch (error) {
                    console.error('告警静默失败:', error);
                    messageApi.error('告警静默失败: ' + error.message);
                }
            },
        });
    }, [fetchSites, messageApi, selectedSite]);

    /* ---------- 删除站点 ---------- */
    const handleDeleteSite = useCallback((site: Site) => {
        Modal.confirm({
            title: '删除站点',
            content: `确定要删除站点 "${site.displayName}"（${site.name}）吗？此操作不可恢复。`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteSite(site.id);
                    messageApi.success(`站点 ${site.displayName} 已删除`);
                    // 如果详情面板打开的是当前删除的站点，关闭它
                    if (selectedSite?.id === site.id) {
                        setDrawerOpen(false);
                        setSelectedSite(null);
                    }
                    fetchSites();
                    fetchStats();
                } catch (error) {
                    console.error('删除站点失败:', error);
                    messageApi.error('删除站点失败: ' + (error.message || '未知错误'));
                }
            },
        });
    }, [selectedSite, messageApi, fetchSites, fetchStats]);

    /** 设置主链路（接口或隧道） */
    const handleSetPrimaryLink = useCallback(async (linkType: 'interface' | 'tunnel', linkId: number) => {
        if (!selectedSite) return;
        try {
            await setPrimaryLink(selectedSite.id, linkType, linkId);
            messageApi.success('主链路设置成功');
            // 刷新网络数据
            await fetchSiteNetwork(selectedSite.id);
        } catch (error) {
            console.error('设置主链路失败:', error);
            messageApi.error('设置主链路失败');
        }
    }, [selectedSite, messageApi, fetchSiteNetwork]);

    /* ---------- 排序 ---------- */
    const [sortField, setSortField] = useState<keyof Site | ''>('');
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | ''>('');

    const sortedSites = useMemo(() => {
        if (!sortField || !sortOrder) return filteredSites;
        const arr = [...filteredSites];
        const dir = sortOrder === 'ascend' ? 1 : -1;
        arr.sort((a, b) => {
            const va = a[sortField];
            const vb = b[sortField];
            if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return 0;
        });
        return arr;
    }, [filteredSites, sortField, sortOrder]);

    /* ---------- 分页数据 ---------- */
    const paginatedSites = useMemo(() => {
        // 服务端分页，直接返回 sites
        return sites;
    }, [sites]);

    /* ---------- 筛选/排序变化时重置页码 ---------- */
    useEffect(() => {
        setCurrentPage(1);
    }, [filter.region, filter.status, filter.search, filter.linkType]);

    /** 切换列排序 */
    const handleSort = useCallback((field: keyof Site) => {
        setSortField((prev) => {
            if (prev !== field) {
                setSortOrder('ascend');
                return field;
            }
            setSortOrder((prevOrder) => prevOrder === '' ? 'ascend' : prevOrder === 'ascend' ? 'descend' : '');
            return prev;
        });
    }, []);

    /** 全选 / 取消全选 */

    /* ---------- 批量操作菜单 ---------- */
    const batchMenuItems = [
        { key: 'restart', icon: <PoweroffOutlined />, label: '批量重启设备' },
        { key: 'switchLink', icon: <SwapOutlined />, label: '批量切换链路' },
        { key: 'upgradeConfig', icon: <CloudUploadOutlined />, label: '批量升级配置' },
    ];

    /* ---------- 详情面板中的当前活跃链路 ---------- */
    const activeLink: SiteLink | undefined = selectedSite?.links.find((l) => l.id === selectedSite.activeLinkId);

    /* ============================================================
     *  渲染
     * ============================================================ */
    return (
        <div className="site-mgmt">
            {contextHolder}

            {/* ===== 页面标题 ===== */}
            <div className="site-mgmt__header">
                <div className="site-mgmt__header-left">
                    <h1 className="site-mgmt__title">
                        <ThunderboltOutlined /> 站点管理
                    </h1>
                    <span className="site-mgmt__subtitle">SD-WAN 站点监控与运维管理</span>
                </div>
                <div className="site-mgmt__header-right">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setSiteFormMode('create');
                            setEditingSite(null);
                            setSiteFormOpen(true);
                        }}
                    >
                        添加站点
                    </Button>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => setExportModalOpen(true)}
                    >
                        导出
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            fetchSites();
                            fetchStats();
                        }}
                        loading={loading}
                    >
                        刷新数据
                    </Button>
                </div>
            </div>

            {/* ===== 全局概览卡片 ===== */}
            <div className="overview-cards">
                <div className="overview-card overview-card--total">
                    <div className="overview-card__icon">📡</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value">{stats.total}</span>
                        <span className="overview-card__label">总站点数</span>
                    </div>
                </div>
                <div className="overview-card overview-card--online">
                    <div className="overview-card__icon" style={{ color: '#52c41a' }}>✅</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#52c41a' }}>{stats.online}</span>
                        <span className="overview-card__label">在线</span>
                    </div>
                </div>
                <div className="overview-card overview-card--offline">
                    <div className="overview-card__icon" style={{ color: '#ff4d4f' }}>❌</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#ff4d4f' }}>{stats.offline}</span>
                        <span className="overview-card__label">离线</span>
                    </div>
                </div>
                <div className="overview-card overview-card--warning">
                    <div className="overview-card__icon" style={{ color: '#faad14' }}>⚠️</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#faad14' }}>{stats.warning}</span>
                        <span className="overview-card__label">告警</span>
                    </div>
                </div>
                <div className="overview-card overview-card--alerts">
                    <div className="overview-card__icon" style={{ color: '#ff7875' }}>🔔</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#ff7875' }}>{stats.alertCount}</span>
                        <span className="overview-card__label">活跃告警</span>
                    </div>
                </div>
            </div>

            {/* ===== 告警横条（有告警时显示）===== */}
            {allAlerts.length > 0 && (
                <div className="alert-bar">
                    <div className="alert-bar__label">
                        <WarningOutlined /> 活跃告警
                    </div>
                    <div className="alert-bar__items">
                        {allAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`alert-bar__item alert-bar__item--${alert.severity}`}
                                onClick={() => handleAlertClick(alert.siteId)}
                            >
                                <span className="alert-bar__severity">
                                    {alert.severity === 'critical' ? '严重' : '重要'}
                                </span>
                                <span className="alert-bar__site">[{alert.siteName}]</span>
                                <span className="alert-bar__title">{alert.title}</span>
                                <span className="alert-bar__reason">— {alert.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== 搜索 + 筛选 + 批量操作栏 ===== */}
            <div className="filter-bar">
                <div className="filter-bar__left">
                    <Input
                        ref={searchInputRef}
                        prefix={<SearchOutlined />}
                        placeholder={`搜索站点名称... (${SHORTCUTS.SEARCH})`}
                        allowClear
                        value={filter.search}
                        onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                        style={{ width: 240 }}
                    />
                    <Select
                        placeholder="区域筛选"
                        allowClear
                        value={filter.region === 'all' ? undefined : filter.region}
                        onChange={(v) => setFilter((f) => ({ ...f, region: v || 'all' }))}
                        style={{ width: 150 }}
                        options={[
                            { label: '🇨🇳 中国', value: 'CN' },
                            { label: '🇸🇬 新加坡', value: 'SG' },
                            { label: '🇺🇸 美国', value: 'US' },
                            { label: '🇪🇺 欧洲', value: 'EU' },
                        ]}
                    />
                    <Select
                        placeholder="状态筛选"
                        allowClear
                        value={filter.status === 'all' ? undefined : filter.status}
                        onChange={(v) => setFilter((f) => ({ ...f, status: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '✅ 在线', value: 'online' },
                            { label: '❌ 离线', value: 'offline' },
                            { label: '⚠️ 告警', value: 'warning' },
                        ]}
                    />
                    <Select
                        placeholder="链路类型"
                        allowClear
                        value={filter.linkType === 'all' ? undefined : filter.linkType}
                        onChange={(v) => setFilter((f) => ({ ...f, linkType: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '🔵 MPLS', value: 'MPLS' },
                            { label: '🟢 Internet', value: 'Internet' },
                            { label: '🟣 5G', value: '5G' },
                        ]}
                    />
                    {/* 快捷筛选标签 */}
                    <Space size={4}>
                        <Tag.CheckableTag
                            checked={filter.status === 'warning' || filter.status === 'offline'}
                            onChange={(checked) => {
                                if (checked) setFilter((f) => ({ ...f, status: 'warning' }));
                                else setFilter((f) => ({ ...f, status: 'all' }));
                            }}
                        >
                            只看异常
                        </Tag.CheckableTag>
                    </Space>
                    <span className="filter-bar__count">
                        共 <strong>{filteredSites.length}</strong> 个站点
                    </span>
                </div>
                <div className="filter-bar__right">
                    {selectedRowKeys.length > 0 && (
                        <Dropdown
                            menu={{
                                items: batchMenuItems,
                                onClick: ({ key }) => handleBatchAction(key as BatchActionType),
                            }}
                        >
                            <Button type="primary" danger>
                                批量操作 ({selectedRowKeys.length})
                                <ArrowDownOutlined />
                            </Button>
                        </Dropdown>
                    )}
                </div>
            </div>

            {/* ===== 站点列表表格 ===== */}
            <ConfigProvider
                theme={{
                    token: {
                        colorBgContainer: 'var(--bg-card)',
                        colorBorderSecondary: 'var(--border-secondary)',
                        colorText: 'var(--text-primary)',
                        colorTextSecondary: 'var(--text-secondary)',
                        colorTextTertiary: 'var(--text-muted)',
                        headerBg: 'var(--bg-tertiary)',
                        controlInteractiveBg: 'var(--bg-tertiary)',
                    },
                }}
            >
                <Table
                    columns={[
                        {
                            title: '站点名称',
                            width: 160,
                            key: 'name',
                            sorter: (a, b) => a.name.localeCompare(b.name),
                            render: (_, site) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                        {site.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {site.displayName}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            title: '区域',
                            width: 120,
                            key: 'region',
                            render: (_, site) => (
                                <Tag
                                    style={{
                                        background: 'rgba(24, 144, 255, 0.15)',
                                        borderColor: 'rgba(24, 144, 255, 0.4)',
                                        color: '#40a9ff',
                                        fontWeight: 500
                                    }}
                                >
                                    {REGION_LABELS[site.region]}
                                </Tag>
                            ),
                        },
                        {
                            title: '状态',
                            width: 100,
                            key: 'status',
                            render: (_, site) => (
                                <span className={`status-tag status-tag--${site.status}`}>
                                    {STATUS_CONFIG[site.status].icon}
                                    {STATUS_CONFIG[site.status].label}
                                    {site.alerts.filter(a => !a.acknowledged && !a.silenced).length > 0 && (
                                        <Badge count={site.alerts.filter(a => !a.acknowledged && !a.silenced).length} size="small" className="status-tag__badge" />
                                    )}
                                </span>
                            ),
                        },
                        {
                            title: '延迟',
                            width: 110,
                            key: 'latency',
                            sorter: (a, b) => a.latency - b.latency,
                            render: (_, site) => (
                                <span style={{ color: latencyColor(site.latency), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {site.latency === 0 ? '—' : `${site.latency} ms`}
                                </span>
                            ),
                        },
                        {
                            title: '丢包',
                            width: 100,
                            key: 'loss',
                            sorter: (a, b) => a.loss - b.loss,
                            render: (_, site) => (
                                <span style={{ color: lossColor(site.loss), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {site.loss >= 100 ? '—' : `${site.loss}%`}
                                </span>
                            ),
                        },
                        {
                            title: '带宽使用',
                            width: 180,
                            key: 'bandwidthUsage',
                            sorter: (a, b) => a.bandwidthUsage - b.bandwidthUsage,
                            render: (_, site) => (
                                <Progress
                                    percent={site.bandwidthUsage}
                                    size="small"
                                    strokeColor={bandwidthColor(site.bandwidthUsage)}
                                    railColor="rgba(255,255,255,0.06)"
                                    format={() => (
                                        <span style={{ fontSize: 12, color: bandwidthColor(site.bandwidthUsage) }}>
                                            {site.bandwidthUsed} / {site.bandwidthTotal}
                                        </span>
                                    )}
                                />
                            ),
                        },
                        {
                            title: '当前链路',
                            width: 140,
                            key: 'activeLink',
                            render: (_, site) => {
                                const activeLink = site.links.find((l) => l.id === site.activeLinkId);
                                return activeLink ? (
                                    <Tag color={LINK_TYPE_COLORS[activeLink.type]} style={{ margin: 0 }}>
                                        {activeLink.type} · {activeLink.isp.split(' ')[0]}
                                    </Tag>
                                ) : (
                                    <span style={{ color: '#ff4d4f' }}>无活跃链路</span>
                                );
                            },
                        },
                        {
                            title: '告警',
                            width: 80,
                            key: 'alerts',
                            render: (_, site) => {
                                const unacknowledgedAlerts = site.alerts.filter(a => !a.acknowledged && !a.silenced);
                                return unacknowledgedAlerts.length === 0 ? (
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                ) : (
                                    <Tooltip
                                        title={
                                            <div className="alert-tooltip">
                                                {unacknowledgedAlerts.map((a) => (
                                                    <div key={a.id} className="alert-tooltip__item" onClick={() => handleAlertClick(site.id)}>
                                                        <WarningOutlined style={{ color: a.severity === 'critical' ? '#ff4d4f' : '#faad14' }} />
                                                        <span>{a.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <Badge count={unacknowledgedAlerts.length} style={{ backgroundColor: site.alerts.some((a) => a.severity === 'critical' && !a.acknowledged && !a.silenced) ? '#ff4d4f' : '#faad14' }}>
                                            <BellOutlined style={{ fontSize: 16, color: '#faad14', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); openDetail(site); }} />
                                        </Badge>
                                    </Tooltip>
                                );
                            },
                        },
                        {
                            title: '操作',
                            width: 180,
                            key: 'action',
                            align: 'center' as const,
                            render: (_, site) => (
                                <Space size={4}>
                                    <Button type="link" size="small" onClick={(e) => {
                                        e.stopPropagation();
                                        setSiteFormMode('edit');
                                        setEditingSite(site);
                                        setSiteFormOpen(true);
                                    }}>
                                        <EditOutlined /> 编辑
                                    </Button>
                                    <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openDetail(site); }}>
                                        详情
                                    </Button>
                                    <Button type="link" size="small" danger onClick={(e) => { e.stopPropagation(); handleDeleteSite(site); }}>
                                        删除
                                    </Button>
                                </Space>
                            ),
                        },
                    ]}
                    dataSource={sortedSites}
                    rowKey="id"
                    pagination={false}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys),
                        columnWidth: 50,
                    }}
                    onRow={(site) => ({
                        onClick: () => {
                            // 表单弹窗打开时不触发打开详情
                            if (!siteFormOpen) openDetail(site);
                        },
                        style: {
                            cursor: 'pointer',
                            background: site.status === 'offline'
                                ? 'rgba(255, 77, 79, 0.03)'
                                : site.status === 'warning'
                                    ? 'rgba(250, 173, 20, 0.02)'
                                    : undefined,
                        },
                    })}
                    rowClassName={(site) => `site-table-row site-table-row--${site.status}`}
                    scroll={{ x: 1200 }}
                />
                <Pagination
                    align="center"
                    current={currentPage}
                    pageSize={pageSize}
                    total={totalSites}
                    onChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 个站点`}
                    pageSizeOptions={['10', '20', '50', '100']}
                />
            </ConfigProvider>

            {/* ===== 站点详情抽屉 ===== */}
            <Drawer
                title={null}
                placement="right"
                size="default"
                styles={{ wrapper: { width: 720 }, header: { display: 'none' }, body: { padding: 0 } }}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className="site-drawer"
            >
                {selectedSite && (
                    <div className="detail-drawer">
                        {/* 头部 */}
                        <div className={`detail-drawer__header detail-drawer__header--${selectedSite.status}`}>
                            <div className="detail-drawer__header-top">
                                <h2>{selectedSite.displayName}</h2>
                                <span className="detail-drawer__code">{selectedSite.name}</span>
                                <span className={`detail-drawer__status detail-drawer__status--${selectedSite.status}`}>
                                    {STATUS_CONFIG[selectedSite.status].icon}
                                    {STATUS_CONFIG[selectedSite.status].label}
                                </span>
                            </div>
                            <div className="detail-drawer__meta">
                                <span>{REGION_LABELS[selectedSite.region]}</span>
                                <span>·</span>
                                <span>{SITE_TYPE_LABELS[selectedSite.siteType || 'branch'] || selectedSite.siteType}</span>
                                <span>·</span>
                                <span>{selectedSite.deviceModel}</span>
                                <span>·</span>
                                <span>v{selectedSite.deviceVersion}</span>
                                <span>·</span>
                                <span>运行 {selectedSite.uptime}</span>
                                {selectedSite.manager && (
                                    <>
                                        <span>·</span>
                                        <span>负责人: {selectedSite.manager}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 标签页切换 */}
                        <div className="detail-drawer__tabs">
                            <Segmented
                                value={drawerTab}
                                onChange={(v) => setDrawerTab(v as 'overview' | 'interfaces' | 'tunnels' | 'devices')}
                                options={[
                                    { label: '概览', value: 'overview' },
                                    { label: '接口', value: 'interfaces' },
                                    { label: '隧道', value: 'tunnels' },
                                    { label: '设备', value: 'devices' },
                                ]}
                            />
                        </div>

                        <div className="detail-drawer__body">
                            {/* 概览标签页 */}
                            {drawerTab === 'overview' && (
                                <>
                                    {/* 网络状态 */}
                                    <section className="detail-section">
                                <h4 className="detail-section__title"><LineChartOutlined /> 网络状态</h4>
                                <div className="metric-cards">
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: latencyColor(selectedSite.latency) }}>
                                            {selectedSite.latency === 0 ? '—' : `${selectedSite.latency}`}
                                        </div>
                                        <div className="metric-card__unit">ms</div>
                                        <div className="metric-card__label">延迟</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: lossColor(selectedSite.loss) }}>
                                            {selectedSite.loss >= 100 ? '—' : `${selectedSite.loss}`}
                                        </div>
                                        <div className="metric-card__unit">%</div>
                                        <div className="metric-card__label">丢包率</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: bandwidthColor(selectedSite.bandwidthUsage) }}>
                                            {selectedSite.bandwidthUsage}
                                        </div>
                                        <div className="metric-card__unit">%</div>
                                        <div className="metric-card__label">带宽使用</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: '#1890ff' }}>
                                            {selectedSite.bandwidthUsed}
                                        </div>
                                        <div className="metric-card__unit">/ {selectedSite.bandwidthTotal}</div>
                                        <div className="metric-card__label">带宽</div>
                                    </div>
                                </div>
                            </section>

                            {/* 实时质量监控 */}
                            <section className="detail-section">
                                <div className="detail-section__title-row">
                                    <h4 className="detail-section__title"><LineChartOutlined /> 实时质量监控</h4>
                                    <Space>
                                        <Segmented
                                            size="small"
                                            options={[
                                                { label: '延迟', value: 'latency' },
                                                { label: '丢包', value: 'loss' },
                                                { label: '带宽', value: 'bandwidth' },
                                                { label: '抖动', value: 'jitter' },
                                                { label: '吞吐', value: 'throughput' },
                                            ]}
                                            value={historyMetric}
                                            onChange={(v) => setHistoryMetric(v as typeof historyMetric)}
                                        />
                                        <Segmented
                                            size="small"
                                            options={[
                                                { label: '5分钟', value: '5min' },
                                                { label: '1小时', value: '1hour' },
                                                { label: '24小时', value: '24hour' },
                                            ]}
                                            value={historyRange}
                                            onChange={(v) => setHistoryRange(v as typeof historyRange)}
                                        />
                                    </Space>
                                </div>
                                <div className="chart-container">
                                    {historyData.length === 0 ? (
                                        <Empty
                                            description="暂无历史数据"
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            style={{ padding: '40px 0' }}
                                        />
                                    ) : (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <AreaChart
                                                data={historyData}
                                                margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id={`gradient-${historyMetric}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={METRIC_COLORS[historyMetric]} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={METRIC_COLORS[historyMetric]} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                                    vertical={false}
                                                />
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 11, fill: isDark ? '#555e7a' : '#8a8a9e' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    interval={historyRange === '5min' ? 0 : historyRange === '1hour' ? 9 : 3}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: isDark ? '#555e7a' : '#8a8a9e' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={METRIC_FORMATTERS[historyMetric]}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        background: isDark ? 'rgba(13, 19, 48, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                        border: `1px solid ${isDark ? 'rgba(100, 120, 255, 0.15)' : 'rgba(59, 130, 246, 0.2)'}`,
                                                        borderRadius: '6px',
                                                        color: isDark ? '#e0e6ff' : '#1a1a2e',
                                                        fontSize: '12px',
                                                        padding: '8px 12px',
                                                        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number) => [METRIC_TOOLTIP_FORMAT(historyMetric, value), METRIC_LABELS[historyMetric]]}
                                                    labelFormatter={(label: string) => `时间: ${label}`}
                                                />
                                                {/* SLA 阈值参考线 */}
                                                {historyMetric === 'latency' && selectedSite.config.slaLatency && (
                                                    <ReferenceLine
                                                        y={selectedSite.config.slaLatency}
                                                        stroke="#ff4d4f"
                                                        strokeDasharray="6 3"
                                                        label={{ value: `SLA ${selectedSite.config.slaLatency}ms`, position: 'insideTopRight', fill: '#ff4d4f', fontSize: 10 }}
                                                    />
                                                )}
                                                {historyMetric === 'loss' && selectedSite.config.slaLoss && (
                                                    <ReferenceLine
                                                        y={selectedSite.config.slaLoss}
                                                        stroke="#ff4d4f"
                                                        strokeDasharray="6 3"
                                                        label={{ value: `SLA ${selectedSite.config.slaLoss}%`, position: 'insideTopRight', fill: '#ff4d4f', fontSize: 10 }}
                                                    />
                                                )}
                                                <Area
                                                    type="monotone"
                                                    dataKey={historyMetric}
                                                    stroke={METRIC_COLORS[historyMetric]}
                                                    strokeWidth={2}
                                                    fill={`url(#gradient-${historyMetric})`}
                                                    animationDuration={600}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </section>

                            {/* 配置项（高级） */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><SettingOutlined /> 配置项</h4>
                                <div className="config-grid">
                                    <div className="config-item">
                                        <span className="config-item__label">路由策略</span>
                                        <span className="config-item__value">{selectedSite.config.routePolicy}</span>
                                    </div>
                                    <div className="config-item">
                                        <span className="config-item__label">QoS 策略</span>
                                        <span className="config-item__value">{selectedSite.config.qosPolicy}</span>
                                    </div>
                                    <div className="config-item">
                                        <span className="config-item__label">优先级</span>
                                        <span className="config-item__value">
                                            <Tag color={
                                                selectedSite.config.priority === 'high' ? 'red' :
                                                selectedSite.config.priority === 'medium' ? 'orange' : 'default'
                                            }>
                                                {selectedSite.config.priority === 'high' ? '高' :
                                                 selectedSite.config.priority === 'medium' ? '中' : '低'}
                                            </Tag>
                                        </span>
                                    </div>
                                    <div className="config-item">
                                        <span className="config-item__label">SLA 延迟</span>
                                        <span className="config-item__value">{selectedSite.config.slaLatency} ms</span>
                                    </div>
                                    <div className="config-item">
                                        <span className="config-item__label">SLA 丢包</span>
                                        <span className="config-item__value">{selectedSite.config.slaLoss}%</span>
                                    </div>
                                </div>
                            </section>

                            {/* 站点告警 */}
                            {selectedSite.alerts.filter(a => !a.acknowledged && !a.silenced).length > 0 && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title detail-section__title--danger">
                                        <WarningOutlined /> 站点告警
                                    </h4>
                                    <div className="detail-alerts">
                                        {selectedSite.alerts.filter(a => !a.acknowledged && !a.silenced).map((alert) => (
                                            <div key={alert.id} className={`detail-alert detail-alert--${alert.severity}`}>
                                                <div className="detail-alert__header">
                                                    <Tag color={alert.severity === 'critical' ? 'red' : 'orange'} style={{ margin: 0 }}>
                                                        {alert.severity === 'critical' ? '严重' : '重要'}
                                                    </Tag>
                                                    <span className="detail-alert__time">{alert.timestamp}</span>
                                                </div>
                                                <div className="detail-alert__title">{alert.title}</div>
                                                <div className="detail-alert__reason">{alert.reason}</div>
                                                <div className="detail-alert__actions">
                                                    <Button
                                                        size="small"
                                                        icon={<CheckOutlined />}
                                                        onClick={() => handleAcknowledgeAlert(selectedSite.id, alert.id)}
                                                    >
                                                        确认
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        icon={<EyeInvisibleOutlined />}
                                                        onClick={() => handleSilenceAlert(selectedSite.id, alert.id)}
                                                    >
                                                        静默
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 快捷操作 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">快捷操作</h4>
                                <div className="quick-actions">
                                    <Button icon={<PoweroffOutlined />} danger>重启设备</Button>
                                    <Button icon={<SwapOutlined />}>切换链路</Button>
                                    <Button icon={<CloudUploadOutlined />}>升级配置</Button>
                                    <Button icon={<ReloadOutlined />} onClick={() => { fetchSites(); fetchStats(); }}>同步状态</Button>
                                </div>
                            </section>
                                </>
                            )}

                            {/* 设备标签页 */}
                            {drawerTab === 'devices' && (
                                <>
                                    {/* 设备统计卡片 */}
                                    <section className="detail-section">
                                        <h4 className="detail-section__title"><DesktopOutlined /> 设备统计</h4>
                                        {siteDevicesData && (
                                            <div className="device-stats-cards">
                                                <div className="stat-card">
                                                    <span className="stat-card__label">总设备</span>
                                                    <span className="stat-card__value">{siteDevicesData.stats.total}</span>
                                                </div>
                                                <div className="stat-card stat-card--online">
                                                    <span className="stat-card__label">在线</span>
                                                    <span className="stat-card__value">{siteDevicesData.stats.online}</span>
                                                </div>
                                                <div className="stat-card stat-card--offline">
                                                    <span className="stat-card__label">离线</span>
                                                    <span className="stat-card__value">{siteDevicesData.stats.offline}</span>
                                                </div>
                                                <div className="stat-card stat-card--active">
                                                    <span className="stat-card__label">主设备</span>
                                                    <span className="stat-card__value">{siteDevicesData.stats.active_count}</span>
                                                </div>
                                                <div className="stat-card stat-card--standby">
                                                    <span className="stat-card__label">备设备</span>
                                                    <span className="stat-card__value">{siteDevicesData.stats.standby_count}</span>
                                                </div>
                                            </div>
                                        )}
                                        {devicesLoading && (
                                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                                <Spin tip="加载中..." />
                                            </div>
                                        )}
                                    </section>

                                    {/* 设备列表 */}
                                    <section className="detail-section">
                                        <h4 className="detail-section__title"><DesktopOutlined /> 站点设备</h4>
                                        <div className="site-devices-grid">
                                            {siteDevicesData?.devices && siteDevicesData.devices.length > 0 ? (
                                                    siteDevicesData.devices.map((device) => (
                                                        <DeviceCard
                                                            key={device.id}
                                                            device={device}
                                                            showRole={true}
                                                            showSessions={true}
                                                        />
                                                    ))
                                            ) : (
                                                !devicesLoading && (
                                                    <Empty description="该站点暂无设备" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                                )
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* 接口标签页 */}
                            {drawerTab === 'interfaces' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><ApiOutlined /> 接口状态</h4>
                                    <Spin spinning={networkLoading}>
                                        {siteNetwork?.interfaces && siteNetwork.interfaces.length > 0 ? (
                                            <div className="interface-list">
                                                {siteNetwork.interfaces.map((iface) => (
                                                    <div
                                                        key={iface.id}
                                                        className={`interface-card interface-card--${iface.status} ${iface.isPrimary ? 'interface-card--primary' : ''}`}
                                                    >
                                                        <div className="interface-card__header">
                                                            <Tag color={
                                                                iface.interfaceType === 'WAN' ? 'blue' :
                                                                iface.interfaceType === 'LAN' ? 'green' :
                                                                iface.interfaceType === 'MPLS' ? 'purple' : 'default'
                                                            } style={{ margin: 0 }}>{iface.interfaceType}</Tag>
                                                            <span className="interface-card__name">{iface.name}</span>
                                                            {iface.isPrimary && (
                                                                <Tag color="green" style={{ margin: 0 }}>主链路</Tag>
                                                            )}
                                                            {!iface.isPrimary && iface.status === 'up' && (
                                                                <Button
                                                                    size="small"
                                                                    type="link"
                                                                    className="set-primary-btn"
                                                                    icon={<LinkOutlined />}
                                                                    onClick={() => handleSetPrimaryLink('interface', iface.id)}
                                                                >
                                                                    设为主链路
                                                                </Button>
                                                            )}
                                                            <span className={`interface-card__status interface-card__status--${iface.status}`}>
                                                                {iface.status === 'up' ? 'UP' : 'DOWN'}
                                                            </span>
                                                        </div>
                                                        <div className="interface-card__details">
                                                            <span>IP: <code>{iface.ipAddress || '—'}</code></span>
                                                            <span>网关: <code>{iface.gateway || '—'}</code></span>
                                                            <span>速率: <code>{iface.speed || '—'}</code></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            !networkLoading && <Empty description="暂无接口数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        )}
                                    </Spin>
                                </section>
                            )}

                            {/* 隧道标签页 */}
                            {drawerTab === 'tunnels' && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><NodeIndexOutlined /> 隧道连接</h4>
                                    <Spin spinning={networkLoading}>
                                        {siteNetwork?.tunnels && siteNetwork.tunnels.length > 0 ? (
                                            <div className="tunnel-list">
                                                {siteNetwork.tunnels.map((tunnel) => (
                                                    <div
                                                        key={tunnel.id}
                                                        className={`tunnel-card tunnel-card--${tunnel.status} ${tunnel.isPrimary ? 'tunnel-card--primary' : ''}`}
                                                    >
                                                        <div className="tunnel-card__header">
                                                            <Tag color={
                                                                tunnel.tunnelType === 'IPsec' ? 'blue' :
                                                                tunnel.tunnelType === 'GRE' ? 'green' : 'purple'
                                                            } style={{ margin: 0 }}>{tunnel.tunnelType}</Tag>
                                                            <span className="tunnel-card__name">{tunnel.tunnelName}</span>
                                                            {tunnel.isPrimary && (
                                                                <Tag color="green" style={{ margin: 0 }}>主链路</Tag>
                                                            )}
                                                            {!tunnel.isPrimary && tunnel.status === 'up' && (
                                                                <Button
                                                                    size="small"
                                                                    type="link"
                                                                    className="set-primary-btn"
                                                                    icon={<LinkOutlined />}
                                                                    onClick={() => handleSetPrimaryLink('tunnel', tunnel.id)}
                                                                >
                                                                    设为主链路
                                                                </Button>
                                                            )}
                                                            <span className={`tunnel-card__status tunnel-card__status--${tunnel.status}`}>
                                                                {tunnel.status === 'up' ? 'UP' :
                                                                 tunnel.status === 'connecting' ? '连接中' : 'DOWN'}
                                                            </span>
                                                        </div>
                                                        <div className="tunnel-card__details">
                                                            <span>本地: <code>{tunnel.localIp || '—'}</code></span>
                                                            <span>对端: <code>{tunnel.peerIp || '—'}</code></span>
                                                            <span>运行: <code>{tunnel.uptime || '—'}</code></span>
                                                            <span>TX: <code>{formatBytes(tunnel.txBytes)}</code> / RX: <code>{formatBytes(tunnel.rxBytes)}</code></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            !networkLoading && <Empty description="暂无隧道数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        )}
                                    </Spin>
                                </section>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* ===== 批量操作进度弹窗 ===== */}
            <BatchTaskModal
                open={batchTaskOpen}
                taskId={batchTaskId || ''}
                action={batchAction || 'restart'}
                onClose={() => setBatchTaskOpen(false)}
            />

            {/* ===== 数据导出弹窗 ===== */}
            <ExportModal
                open={exportModalOpen}
                currentFilter={filter}
                onClose={() => setExportModalOpen(false)}
            />

            {/* ===== 添加/编辑站点弹窗 ===== */}
            <SiteFormModal
                open={siteFormOpen}
                mode={siteFormMode}
                initialValues={editingSite}
                onClose={() => setSiteFormOpen(false)}
                onSuccess={() => {
                    setSiteFormOpen(false);
                    fetchSites();
                    fetchStats();
                }}
            />
        </div>
    );
}
