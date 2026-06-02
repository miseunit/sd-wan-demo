/**
 * SD-WAN 链路管理 - 主页面
 * 核心功能：总览卡片 / 搜索筛选 / 链路列表 / 详情面板（质量监控 + SLA + 策略 + 成本 + 告警）
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Input, Select, Button, Tag, Drawer, Progress,
    Segmented, Empty, Space, message, Pagination, Table, ConfigProvider,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, SwapOutlined,
    CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
    ArrowUpOutlined, ArrowDownOutlined, LinkOutlined,
    LineChartOutlined, WarningOutlined, SafetyCertificateOutlined,
    DollarOutlined, AimOutlined, ThunderboltOutlined,
    HistoryOutlined, ClockCircleOutlined, RocketOutlined,
} from '@ant-design/icons';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTheme, THEME_TYPES } from '../../contexts/ThemeContext';
import type {
    WanLink, LinkHealthStatus, LinkType, LinkFilterState,
    HistoryPoint, SwitchPolicy, AlertCategory,
} from './types';
import { getLinks, getLinkStats, getLinkSiteNames, getLinkHistory } from '../../services/linkApi';
import './LinkManagement.css';

/* ============================================================
 *  常量 & 工具函数
 * ============================================================ */

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
    throughput: '吞吐',
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

/* ============================================================
 *  常量 & 工具函数
 * ============================================================ */

/** 健康状态配置 */
const HEALTH_CONFIG: Record<LinkHealthStatus, { label: string; color: string; icon: React.ReactNode }> = {
    healthy: { label: '健康', color: '#52c41a', icon: <CheckCircleOutlined /> },
    degraded: { label: '劣化', color: '#faad14', icon: <ExclamationCircleOutlined /> },
    down: { label: '故障', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
};

/** 链路类型颜色 */
const LINK_TYPE_COLORS: Record<LinkType, string> = {
    MPLS: '#1890ff',
    Internet: '#52c41a',
    '5G': '#722ed1',
    WAN: '#fa8c16',
};

/** 链路类型标签 */
const LINK_TYPE_LABELS: Record<LinkType, string> = {
    MPLS: 'MPLS',
    Internet: 'Internet',
    '5G': '5G',
    WAN: 'WAN',
};

/** 切换策略配置 */
const SWITCH_POLICY_CONFIG: Record<SwitchPolicy, { label: string; desc: string }> = {
    'mpls-priority': { label: 'MPLS 优先', desc: 'MPLS 主链路优先，中断时自动切换至 Internet/5G' },
    'internet-fallback': { label: 'Internet 备用', desc: 'Internet 为主，MPLS 作为高质备份' },
    'load-balance': { label: '负载均衡', desc: '多条链路负载均衡分流，自动避开劣化链路' },
    'cost-optimize': { label: '成本优化', desc: '优先使用低成本线路，质量达标即可' },
};

/** 告警类别标签 */
const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
    'link-down': '链路断开',
    'sla-breach': 'SLA 不达标',
    'auto-switch': '自动切换',
    'quality-degrade': '质量劣化',
};

/** 告警类别颜色 */
const ALERT_CATEGORY_COLORS: Record<AlertCategory, string> = {
    'link-down': '#ff4d4f',
    'sla-breach': '#faad14',
    'auto-switch': '#1890ff',
    'quality-degrade': '#fa8c16',
};

/** 延迟颜色 */
function latencyColor(v: number): string {
    if (v === 0) return '#ff4d4f';
    if (v < 20) return '#52c41a';
    if (v < 50) return '#faad14';
    if (v < 100) return '#fa8c16';
    return '#ff4d4f';
}

/** 丢包颜色 */
function lossColor(v: number): string {
    if (v >= 100) return '#ff4d4f';
    if (v < 0.05) return '#52c41a';
    if (v < 0.2) return '#faad14';
    return '#ff4d4f';
}

/** 抖动颜色 */
function jitterColor(v: number): string {
    if (v < 5) return '#52c41a';
    if (v < 10) return '#faad14';
    return '#ff4d4f';
}

/** 利用率颜色 */
function utilizationColor(v: number): string {
    if (v < 50) return '#52c41a';
    if (v < 80) return '#faad14';
    return '#ff4d4f';
}

/** SLA 评分颜色 */
function slaColor(v: number): string {
    if (v >= 80) return '#52c41a';
    if (v >= 60) return '#faad14';
    return '#ff4d4f';
}

/** 格式化成本 */
function formatCost(v: number): string {
    if (v >= 10000) return `¥${(v / 10000).toFixed(1)}万`;
    return `¥${v.toLocaleString()}`;
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function LinkManagement() {
    /* ---------- 主题 ---------- */
    const { theme } = useTheme();
    const isDark = theme === THEME_TYPES.DARK;

    /* ---------- 状态 ---------- */
    const [filter, setFilter] = useState<LinkFilterState>({ type: 'all', healthStatus: 'all', siteName: 'all', search: '' });
    const [selectedLink, setSelectedLink] = useState<WanLink | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [historyRange, setHistoryRange] = useState<'5min' | '1hour' | '24hour'>('5min');
    const [historyMetric, setHistoryMetric] = useState<'latency' | 'loss' | 'jitter' | 'bandwidth' | 'throughput'>('latency');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [, contextHolder] = message.useMessage();

    // API 数据状态
    const [links, setLinks] = useState<WanLink[]>([]);
    const [siteNames, setSiteNames] = useState<string[]>([]);
    const [stats, setStats] = useState({ total: 0, healthy: 0, degraded: 0, down: 0, active: 0, totalCost: 0, activeAlerts: 0 });
    const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalLinks, setTotalLinks] = useState(0);  // 分页总数

    /* ---------- 数据加载 ---------- */
    const fetchLinks = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {};
            // 筛选条件
            if (filter.type !== 'all') params.type = filter.type;
            if (filter.healthStatus !== 'all') params.healthStatus = filter.healthStatus;
            if (filter.siteName !== 'all') params.siteName = filter.siteName;
            if (filter.search.trim()) params.search = filter.search.trim();
            // 分页参数（直接传递页码和每页大小）
            params.page = currentPage;
            params.pageSize = pageSize;

            const data = await getLinks(params);
            // 后端现在返回分页对象：{ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }
            if (data && typeof data === 'object' && 'items' in data) {
                setLinks(data.items);
                setTotalLinks(data.total);
            } else {
                // 兼容旧接口（如果后端还没更新）
                setLinks(data);
                setTotalLinks(data.length);
            }
        } catch {
            message.error('加载链路数据失败');
        } finally {
            setLoading(false);
        }
    }, [filter.type, filter.healthStatus, filter.siteName, filter.search, currentPage, pageSize]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getLinkStats();
            setStats((prev) => ({
                ...prev,
                total: data.total,
                healthy: data.healthy,
                degraded: data.degraded,
                down: data.down,
                active: data.activeCount,
                totalCost: data.totalCost,
            }));
        } catch {
            // 静默失败
        }
    }, []);

    const fetchSiteNames = useCallback(async () => {
        try {
            const data = await getLinkSiteNames();
            setSiteNames(data);
        } catch {
            // 静默失败
        }
    }, []);

    const fetchHistory = useCallback(async (linkId: string, range: string) => {
        try {
            const data = await getLinkHistory(linkId, range);
            setHistoryData(data);
        } catch {
            setHistoryData([]);
        }
    }, []);

    // 初始加载
    useEffect(() => {
        fetchLinks();
        fetchStats();
        fetchSiteNames();
    }, [fetchLinks, fetchStats, fetchSiteNames]);

    // 详情面板打开时加载历史数据
    useEffect(() => {
        if (drawerOpen && selectedLink && selectedLink.healthStatus !== 'down') {
            fetchHistory(selectedLink.id, historyRange);
        }
    }, [drawerOpen, selectedLink, historyRange, fetchHistory]);

    /* ---------- 筛选变化时重置页码 ---------- */
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    /* ---------- 打开详情 ---------- */
    const openDetail = useCallback((link: WanLink) => {
        setSelectedLink(link);
        setDrawerOpen(true);
    }, []);

    /* ---------- 渲染 ---------- */
    return (
        <div className="link-mgmt">
            {contextHolder}

            {/* ===== 页面标题 ===== */}
            <div className="link-mgmt__header">
                <div className="link-mgmt__header-left">
                    <h1 className="link-mgmt__title">
                        <LinkOutlined /> 链路管理
                    </h1>
                    <span className="link-mgmt__subtitle">WAN 链路监控与策略管理</span>
                </div>
                <div className="link-mgmt__header-right">
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchLinks(); fetchStats(); }}>刷新数据</Button>
                </div>
            </div>

            {/* ===== 总览卡片 ===== */}
            <div className="overview-cards">
                <div className="overview-card">
                    <div className="overview-card__icon" style={{ color: '#52c41a' }}>🟢</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#52c41a' }}>{stats.healthy}</span>
                        <span className="overview-card__label">Healthy 健康</span>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="overview-card__icon" style={{ color: '#faad14' }}>🟡</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#faad14' }}>{stats.degraded}</span>
                        <span className="overview-card__label">Degraded 劣化</span>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="overview-card__icon" style={{ color: '#ff4d4f' }}>🔴</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#ff4d4f' }}>{stats.down}</span>
                        <span className="overview-card__label">Down 故障</span>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="overview-card__icon" style={{ color: '#1890ff' }}>🔗</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value">{stats.active}</span>
                        <span className="overview-card__label">活跃链路</span>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="overview-card__icon" style={{ color: '#ffd700' }}>💰</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value">{formatCost(stats.totalCost)}</span>
                        <span className="overview-card__label">月总成本</span>
                    </div>
                </div>
            </div>

            {/* ===== 搜索 + 筛选栏 ===== */}
            <div className="filter-bar">
                <div className="filter-bar__left">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="搜索链路名称 / ISP / 站点..."
                        allowClear
                        value={filter.search}
                        onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                        style={{ width: 280 }}
                    />
                    <Select
                        placeholder="链路类型"
                        allowClear
                        value={filter.type === 'all' ? undefined : filter.type}
                        onChange={(v) => setFilter((f) => ({ ...f, type: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '🔵 MPLS', value: 'MPLS' },
                            { label: '🟢 Internet', value: 'Internet' },
                            { label: '🟣 5G', value: '5G' },
                            { label: '🟠 WAN', value: 'WAN' },
                        ]}
                    />
                    <Select
                        placeholder="健康状态"
                        allowClear
                        value={filter.healthStatus === 'all' ? undefined : filter.healthStatus}
                        onChange={(v) => setFilter((f) => ({ ...f, healthStatus: v || 'all' }))}
                        style={{ width: 130 }}
                        options={[
                            { label: '🟢 健康', value: 'healthy' },
                            { label: '🟡 劣化', value: 'degraded' },
                            { label: '🔴 故障', value: 'down' },
                        ]}
                    />
                    <Select
                        placeholder="所属站点"
                        allowClear
                        value={filter.siteName === 'all' ? undefined : filter.siteName}
                        onChange={(v) => setFilter((f) => ({ ...f, siteName: v || 'all' }))}
                        style={{ width: 180 }}
                        options={siteNames.map((name) => ({ label: name, value: name }))}
                    />
                    <Space size={4}>
                        <Tag.CheckableTag
                            checked={filter.healthStatus === 'degraded' || filter.healthStatus === 'down'}
                            onChange={(checked) => {
                                if (checked) setFilter((f) => ({ ...f, healthStatus: 'degraded' }));
                                else setFilter((f) => ({ ...f, healthStatus: 'all' }));
                            }}
                        >
                            只看异常
                        </Tag.CheckableTag>
                    </Space>
                    <span className="filter-bar__count">
                        共 <strong>{totalLinks}</strong> 条链路
                    </span>
                </div>
            </div>

            {/* ===== 链路列表表格 ===== */}
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
                            title: '链路名称',
                            width: 160,
                            key: 'name',
                            render: (_, link) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                        {link.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {link.isp}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            title: '类型',
                            width: 100,
                            key: 'type',
                            render: (_, link) => (
                                <Tag color={LINK_TYPE_COLORS[link.type]} style={{ margin: 0 }}>
                                    {LINK_TYPE_LABELS[link.type]}
                                </Tag>
                            ),
                        },
                        {
                            title: '所属站点',
                            width: 150,
                            key: 'siteName',
                            render: (_, link) => (
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <AimOutlined style={{ marginRight: 4, fontSize: 11 }} />
                                    {link.siteName}
                                </span>
                            ),
                        },
                        {
                            title: '所属设备',
                            width: 150,
                            key: 'deviceName',
                            render: (_, link) => (
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {link.deviceName || '—'}
                                </span>
                            ),
                        },
                        {
                            title: '状态',
                            width: 100,
                            key: 'healthStatus',
                            render: (_, link) => (
                                <span className={`link-health-tag link-health-tag--${link.healthStatus}`}>
                                    {HEALTH_CONFIG[link.healthStatus].icon}
                                    {HEALTH_CONFIG[link.healthStatus].label}
                                    {link.activeStatus === 'active' && link.healthStatus !== 'down' && (
                                        <span className="link-health-tag__active-dot" />
                                    )}
                                </span>
                            ),
                        },
                        {
                            title: '延迟',
                            width: 90,
                            key: 'latency',
                            sorter: (a, b) => a.latency - b.latency,
                            render: (_, link) => (
                                <span style={{ color: latencyColor(link.latency), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {link.latency === 0 ? '—' : `${link.latency} ms`}
                                </span>
                            ),
                        },
                        {
                            title: '丢包',
                            width: 80,
                            key: 'loss',
                            sorter: (a, b) => a.loss - b.loss,
                            render: (_, link) => (
                                <span style={{ color: lossColor(link.loss), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {link.loss >= 100 ? '—' : `${link.loss}%`}
                                </span>
                            ),
                        },
                        {
                            title: '抖动',
                            width: 80,
                            key: 'jitter',
                            sorter: (a, b) => a.jitter - b.jitter,
                            render: (_, link) => (
                                <span style={{ color: jitterColor(link.jitter), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {link.jitter === 0 && link.healthStatus === 'down' ? '—' : `${link.jitter} ms`}
                                </span>
                            ),
                        },
                        {
                            title: '带宽/利用率',
                            width: 160,
                            key: 'utilization',
                            sorter: (a, b) => a.utilization - b.utilization,
                            render: (_, link) => (
                                <Progress
                                    percent={link.utilization}
                                    size="small"
                                    strokeColor={utilizationColor(link.utilization)}
                                    trailColor="rgba(255,255,255,0.06)"
                                    format={() => (
                                        <span style={{ fontSize: 12, color: utilizationColor(link.utilization) }}>
                                            {link.usedBandwidth} / {link.bandwidth} Mbps
                                        </span>
                                    )}
                                />
                            ),
                        },
                        {
                            title: 'SLA',
                            width: 80,
                            key: 'slaScore',
                            sorter: (a, b) => a.slaScore - b.slaScore,
                            render: (_, link) => (
                                <span style={{ color: slaColor(link.slaScore), fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>
                                    {link.slaScore}
                                </span>
                            ),
                        },
                        {
                            title: '月成本',
                            width: 90,
                            key: 'monthlyCost',
                            render: (_, link) => (
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                    {formatCost(link.monthlyCost)}
                                </span>
                            ),
                        },
                        {
                            title: '操作',
                            width: 60,
                            key: 'action',
                            align: 'center' as const,
                            render: (_, link) => (
                                <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openDetail(link); }}>
                                    详情
                                </Button>
                            ),
                        },
                    ]}
                    dataSource={links}
                    rowKey="id"
                    pagination={false}
                    onRow={(link) => ({
                        onClick: () => openDetail(link),
                        style: {
                            cursor: 'pointer',
                            background: link.healthStatus === 'down'
                                ? 'rgba(255, 77, 79, 0.03)'
                                : link.healthStatus === 'degraded'
                                    ? 'rgba(250, 173, 20, 0.02)'
                                    : undefined,
                        },
                    })}
                    rowClassName={(link) => `link-table-row link-table-row--${link.healthStatus}`}
                />
                <Pagination
                    align="center"
                    current={currentPage}
                    pageSize={pageSize}
                    total={totalLinks}
                    onChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条链路`}
                    pageSizeOptions={['10', '20', '50', '100']}
                />
            </ConfigProvider>

            {/* ===== 链路详情抽屉 ===== */}
            <Drawer
                title={null}
                placement="right"
                width={600}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className="link-drawer"
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                {selectedLink && (
                    <div className="detail-drawer">
                        {/* 头部 */}
                        <div className={`detail-drawer__header detail-drawer__header--${selectedLink.healthStatus}`}>
                            <div className="detail-drawer__header-top">
                                <h2>{selectedLink.name}</h2>
                                <span className="detail-drawer__code">{selectedLink.id}</span>
                                <span className={`detail-drawer__status detail-drawer__status--${selectedLink.healthStatus}`}>
                                    {HEALTH_CONFIG[selectedLink.healthStatus].icon}
                                    {HEALTH_CONFIG[selectedLink.healthStatus].label}
                                </span>
                            </div>
                            <div className="detail-drawer__meta">
                                <Tag color={LINK_TYPE_COLORS[selectedLink.type]} style={{ margin: 0 }}>{selectedLink.type}</Tag>
                                <span>{selectedLink.isp}</span>
                                <span>·</span>
                                <span><AimOutlined style={{ marginRight: 2 }} />{selectedLink.siteName}</span>
                                <span>·</span>
                                <span className="font-mono">{selectedLink.ip}</span>
                            </div>
                        </div>

                        <div className="detail-drawer__body">
                            {/* ===== 1. 性能指标 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><LineChartOutlined /> 性能指标</h4>
                                <div className="metric-cards metric-cards--5">
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: latencyColor(selectedLink.latency) }}>
                                            {selectedLink.latency === 0 ? '—' : selectedLink.latency}
                                        </div>
                                        <div className="metric-card__unit">ms</div>
                                        <div className="metric-card__label">延迟</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: lossColor(selectedLink.loss) }}>
                                            {selectedLink.loss >= 100 ? '—' : selectedLink.loss}
                                        </div>
                                        <div className="metric-card__unit">%</div>
                                        <div className="metric-card__label">丢包率</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: jitterColor(selectedLink.jitter) }}>
                                            {selectedLink.jitter === 0 && selectedLink.healthStatus === 'down' ? '—' : selectedLink.jitter}
                                        </div>
                                        <div className="metric-card__unit">ms</div>
                                        <div className="metric-card__label">抖动</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: utilizationColor(selectedLink.utilization) }}>
                                            {selectedLink.utilization}
                                        </div>
                                        <div className="metric-card__unit">%</div>
                                        <div className="metric-card__label">利用率</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-card__value" style={{ color: '#1890ff' }}>
                                            {selectedLink.usedBandwidth}
                                        </div>
                                        <div className="metric-card__unit">/ {selectedLink.bandwidth} Mbps</div>
                                        <div className="metric-card__label">带宽</div>
                                    </div>
                                </div>
                            </section>

                            {/* ===== 2. 实时质量监控曲线 ===== */}
                            {selectedLink.healthStatus !== 'down' && (
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
                            )}

                            {/* ===== 3. SLA 质量评分 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><SafetyCertificateOutlined /> SLA 质量评分</h4>
                                <div className="sla-score-panel">
                                    <div className="sla-score-panel__ring">
                                        <svg viewBox="0 0 100 100" className="sla-score-panel__svg">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                            <circle
                                                cx="50" cy="50" r="42"
                                                fill="none"
                                                stroke={slaColor(selectedLink.slaScore)}
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeDasharray={`${selectedLink.slaScore * 2.64} 264`}
                                                transform="rotate(-90 50 50)"
                                                style={{ transition: 'stroke-dasharray 0.8s ease' }}
                                            />
                                        </svg>
                                        <div className="sla-score-panel__value" style={{ color: slaColor(selectedLink.slaScore) }}>
                                            {selectedLink.slaScore}
                                        </div>
                                    </div>
                                    <div className="sla-score-panel__breakdown">
                                        <div className="sla-score-panel__item">
                                            <span className="sla-score-panel__item-label">延迟评分</span>
                                            <div className="sla-score-panel__item-bar">
                                                <div className="sla-score-panel__item-fill" style={{ width: `${Math.min(100, (Math.max(0, 40 - (selectedLink.latency / 200) * 40)) / 40 * 100)}%`, background: latencyColor(selectedLink.latency) }} />
                                            </div>
                                            <span className="sla-score-panel__item-value">{Math.max(0, Math.round(40 - (selectedLink.latency / 200) * 40))}/40</span>
                                        </div>
                                        <div className="sla-score-panel__item">
                                            <span className="sla-score-panel__item-label">丢包评分</span>
                                            <div className="sla-score-panel__item-bar">
                                                <div className="sla-score-panel__item-fill" style={{ width: `${Math.min(100, (Math.max(0, 35 - (selectedLink.loss / 1) * 35)) / 35 * 100)}%`, background: lossColor(selectedLink.loss) }} />
                                            </div>
                                            <span className="sla-score-panel__item-value">{Math.max(0, Math.round(35 - (selectedLink.loss / 1) * 35))}/35</span>
                                        </div>
                                        <div className="sla-score-panel__item">
                                            <span className="sla-score-panel__item-label">抖动评分</span>
                                            <div className="sla-score-panel__item-bar">
                                                <div className="sla-score-panel__item-fill" style={{ width: `${Math.min(100, (Math.max(0, 25 - (selectedLink.jitter / 50) * 25)) / 25 * 100)}%`, background: jitterColor(selectedLink.jitter) }} />
                                            </div>
                                            <span className="sla-score-panel__item-value">{Math.max(0, Math.round(25 - (selectedLink.jitter / 50) * 25))}/25</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ===== 4. 链路切换策略 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><ThunderboltOutlined /> 链路切换策略</h4>
                                <div className="policy-panel">
                                    <div className="policy-panel__current">
                                        <span className="policy-panel__label">当前策略</span>
                                        <Tag color="blue" style={{ margin: 0, fontSize: 13, padding: '2px 12px' }}>
                                            <RocketOutlined /> {SWITCH_POLICY_CONFIG[selectedLink.switchPolicy].label}
                                        </Tag>
                                    </div>
                                    <p className="policy-panel__desc">{SWITCH_POLICY_CONFIG[selectedLink.switchPolicy].desc}</p>
                                    {selectedLink.switchHistory.length > 0 && (
                                        <div className="policy-panel__history">
                                            <div className="policy-panel__history-title">
                                                <HistoryOutlined /> 切换记录
                                            </div>
                                            {selectedLink.switchHistory.map((ev) => (
                                                <div key={ev.id} className="policy-panel__event">
                                                    <div className="policy-panel__event-header">
                                                        <Tag color="cyan" style={{ margin: 0 }}>自动切换</Tag>
                                                        <span className="policy-panel__event-time">{ev.time}</span>
                                                    </div>
                                                    <div className="policy-panel__event-body">
                                                        <SwapOutlined style={{ marginRight: 4, fontSize: 11, color: '#1890ff' }} />
                                                        <span className="text-white/70">{ev.fromLink}</span>
                                                        <ArrowDownOutlined style={{ margin: '0 6px', fontSize: 10, color: '#1890ff' }} />
                                                        <span className="text-white/70">{ev.toLink}</span>
                                                    </div>
                                                    <div className="policy-panel__event-reason">{ev.reason}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ===== 5. 成本信息 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><DollarOutlined /> 成本信息</h4>
                                <div className="cost-panel">
                                    <div className="cost-panel__main">
                                        <div className="cost-panel__label">月度费用</div>
                                        <div className="cost-panel__value">{formatCost(selectedLink.monthlyCost)}</div>
                                    </div>
                                    <div className="cost-panel__row">
                                        <div className="cost-panel__item">
                                            <span className="cost-panel__item-label">链路类型</span>
                                            <Tag color={LINK_TYPE_COLORS[selectedLink.type]} style={{ margin: 0 }}>{selectedLink.type}</Tag>
                                        </div>
                                        <div className="cost-panel__item">
                                            <span className="cost-panel__item-label">单位成本</span>
                                            <span className="cost-panel__item-value">
                                                {selectedLink.bandwidth > 0
                                                    ? formatCost(Math.round(selectedLink.monthlyCost / selectedLink.bandwidth))
                                                    : '—'}
                                                /Mbps/月
                                            </span>
                                        </div>
                                    </div>
                                    <div className="cost-panel__row">
                                        <div className="cost-panel__item">
                                            <span className="cost-panel__item-label">实际用量</span>
                                            <span className="cost-panel__item-value">{selectedLink.usedBandwidth} Mbps</span>
                                        </div>
                                        <div className="cost-panel__item">
                                            <span className="cost-panel__item-label">利用率</span>
                                            <span className="cost-panel__item-value" style={{ color: utilizationColor(selectedLink.utilization) }}>
                                                {selectedLink.utilization}%
                                            </span>
                                        </div>
                                    </div>
                                    {selectedLink.switchPolicy === 'cost-optimize' && (
                                        <div className="cost-panel__tip">
                                            <DollarOutlined style={{ marginRight: 4 }} />
                                            成本优化策略已启用 — 系统优先选择低成本链路
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ===== 6. 告警与历史事件 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">
                                    <WarningOutlined /> 告警与历史事件
                                </h4>
                                {selectedLink.alerts.length === 0 ? (
                                    <Empty description="暂无告警" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                ) : (
                                    <div className="detail-alerts">
                                        {selectedLink.alerts.map((alert) => (
                                            <div key={alert.id} className={`detail-alert detail-alert--${alert.severity}`}>
                                                <div className="detail-alert__header">
                                                    <div className="detail-alert__tags">
                                                        <Tag color={alert.severity === 'critical' ? 'red' : alert.severity === 'major' ? 'orange' : 'blue'} style={{ margin: 0 }}>
                                                            {alert.severity === 'critical' ? '严重' : alert.severity === 'major' ? '重要' : '一般'}
                                                        </Tag>
                                                        <Tag color={ALERT_CATEGORY_COLORS[alert.category]} style={{ margin: 0 }}>
                                                            {ALERT_CATEGORY_LABELS[alert.category]}
                                                        </Tag>
                                                    </div>
                                                    <span className="detail-alert__time">
                                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                        {alert.timestamp}
                                                    </span>
                                                </div>
                                                <div className="detail-alert__title">{alert.title}</div>
                                                <div className="detail-alert__reason">{alert.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ===== 快捷操作 ===== */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">快捷操作</h4>
                                <div className="quick-actions">
                                    <Button icon={<ReloadOutlined />} onClick={() => message.info('功能开发中')}>
                                        诊断链路
                                    </Button>
                                    <Button icon={<LineChartOutlined />} onClick={() => message.info('功能开发中')}>
                                        导出报告
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
