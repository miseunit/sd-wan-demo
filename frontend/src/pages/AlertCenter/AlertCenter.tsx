/**
 * SD-WAN 告警中心 - 主页面
 * 8大核心模块：告警列表 / 等级体系 / 告警过滤 / 告警定位 / 关联分析 / 时间线 / 实时推送 / 状态管理
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Input, Select, Button, Tag, Drawer, Tooltip, Space,
    Popconfirm, message, Empty, Timeline, Segmented, Pagination,
    Table, ConfigProvider,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ExclamationCircleOutlined, WarningOutlined, BellOutlined, ClockCircleOutlined,
    SyncOutlined, DeleteOutlined, EyeOutlined, EnvironmentOutlined,
    BugOutlined, NodeIndexOutlined, AimOutlined,
} from '@ant-design/icons';
import {
    getAlerts, getAlertStats, getAlertById, updateAlertStatus,
    deleteAlert, connectAlertWebSocket, disconnectAlertWebSocket,
} from './api';
import type {
    Alert, AlertLevel, AlertStatus,
    AlertFilter, AlertStats, AlertWithTimeline,
    PaginatedResponse,
} from './types';
import {
    ALERT_LEVEL_LABELS, ALERT_STATUS_LABELS, SOURCE_TYPE_LABELS,
} from './types';
import './AlertCenter.css';

/* ============================================================
 *  常量 & 配置
 * ============================================================ */

const LEVEL_CONFIG: Record<AlertLevel, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
    critical: { label: '严重', color: '#ff4d4f', icon: <CloseCircleOutlined />, bgColor: 'rgba(255, 77, 79, 0.1)' },
    warning: { label: '警告', color: '#faad14', icon: <WarningOutlined />, bgColor: 'rgba(250, 173, 20, 0.1)' },
    info: { label: '提示', color: '#1890ff', icon: <ExclamationCircleOutlined />, bgColor: 'rgba(24, 144, 255, 0.1)' },
};

/** 来源类型颜色 */
const SOURCE_TYPE_COLORS: Record<string, string> = {
    site: 'blue',
    link: 'green',
    device: 'purple',
};

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string; icon: React.ReactNode }> = {
    new: { label: '新增', color: '#ff4d4f', icon: <BellOutlined /> },
    acknowledged: { label: '已确认', color: '#faad14', icon: <CheckCircleOutlined /> },
    in_progress: { label: '处理中', color: '#1890ff', icon: <SyncOutlined spin /> },
    resolved: { label: '已恢复', color: '#52c41a', icon: <CheckCircleOutlined /> },
};

const TIME_RANGE_OPTIONS = [
    { label: '5分钟', value: '5min' },
    { label: '1小时', value: '1hour' },
    { label: '24小时', value: '24hour' },
    { label: '全部', value: 'all' },
];

/** 格式化时间 */
function formatTime(isoStr: string): string {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

/** 计算相对时间 */
function timeAgo(isoStr: string): string {
    const now = new Date();
    const then = new Date(isoStr);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function AlertCenter() {
    /* ---------- 状态 ---------- */
    const [alerts, setAlerts] = useState<PaginatedResponse<Alert>>({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const [stats, setStats] = useState<AlertStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<AlertFilter>({
        level: 'all',
        status: 'all',
        source_type: 'all',
        time_range: 'all',
        search: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [selectedAlert, setSelectedAlert] = useState<AlertWithTimeline | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const wsRef = useRef<boolean>(false);

    /* ---------- 加载数据 ---------- */
    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page: currentPage,
                pageSize: pageSize,
            };
            if (filter.level !== 'all') params.level = filter.level;
            if (filter.status !== 'all') params.status = filter.status;
            if (filter.source_type !== 'all') params.source_type = filter.source_type;
            if (filter.time_range !== 'all') params.time_range = filter.time_range;
            if (filter.search.trim()) params.search = filter.search.trim();

            const data = await getAlerts(params);
            setAlerts(data);
        } catch (err) {
            messageApi.error('获取告警列表失败');
        } finally {
            setLoading(false);
        }
    }, [filter, currentPage, pageSize, messageApi]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getAlertStats();
            setStats(data);
        } catch (err) {
            console.error('获取告警统计失败:', err);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        fetchStats();
    }, [fetchAlerts, fetchStats]);

    /* ---------- 筛选变化时重置页码 ---------- */
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    /* ---------- WebSocket 实时推送 ---------- */
    useEffect(() => {
        if (wsRef.current) return;
        wsRef.current = true;

        connectAlertWebSocket((newAlert) => {
            // 新告警到来
            setAlerts(prev => ({
                ...prev,
                items: [newAlert, ...prev.items],
                total: prev.total + 1,
            }));
            setStats(prev => prev ? {
                ...prev,
                total: prev.total + 1,
                [newAlert.level]: prev[newAlert.level] + 1,
                new: prev.new + 1,
            } : prev);

            // 弹出通知
            messageApi.warning({
                content: `[${LEVEL_CONFIG[newAlert.level].label}] ${newAlert.title}`,
                duration: 5,
            });
        });

        return () => {
            disconnectAlertWebSocket();
            wsRef.current = false;
        };
    }, [messageApi]);

    /* ---------- 筛选变更 ---------- */
    const handleFilterChange = useCallback((key: keyof AlertFilter, value: string) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    }, []);

    /* ---------- 查看详情 ---------- */
    const handleViewDetail = useCallback(async (alert: Alert) => {
        try {
            const detail = await getAlertById(alert.id);
            setSelectedAlert(detail);
            setDrawerOpen(true);
        } catch (err) {
            messageApi.error('获取告警详情失败');
        }
    }, [messageApi]);

    /* ---------- 状态操作 ---------- */
    const handleStatusChange = useCallback(async (alertId: number, newStatus: AlertStatus, remark?: string) => {
        try {
            await updateAlertStatus(alertId, newStatus, undefined, undefined, remark);
            messageApi.success(`告警状态已更新为: ${ALERT_STATUS_LABELS[newStatus]}`);
            fetchAlerts();
            fetchStats();

            // 如果详情面板打开，刷新详情
            if (selectedAlert && selectedAlert.id === alertId) {
                const updated = await getAlertById(alertId);
                setSelectedAlert(updated);
            }
        } catch (err) {
            messageApi.error('状态更新失败');
        }
    }, [messageApi, fetchAlerts, fetchStats, selectedAlert]);

    /* ---------- 删除告警 ---------- */
    const handleDelete = useCallback(async (alertId: number) => {
        try {
            await deleteAlert(alertId);
            messageApi.success('告警已删除');
            fetchAlerts();
            fetchStats();
            if (selectedAlert && selectedAlert.id === alertId) {
                setDrawerOpen(false);
                setSelectedAlert(null);
            }
        } catch (err) {
            messageApi.error('删除失败');
        }
    }, [messageApi, fetchAlerts, fetchStats, selectedAlert]);

    /* ---------- 告警定位（预留联动拓扑/地图） ---------- */
    const handleLocate = useCallback((alert: Alert) => {
        messageApi.info(`定位: ${alert.source_name || alert.source_id} (${alert.source_type})`);
        // TODO: 联动拓扑图或地图
    }, [messageApi]);

    /* ---------- 时间线动作映射 ---------- */
    const getTimelineIcon = (action: string) => {
        switch (action) {
            case 'created': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
            case 'acknowledged': return <CheckCircleOutlined style={{ color: '#faad14' }} />;
            case 'resolved': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            default: return <SyncOutlined style={{ color: '#1890ff' }} />;
        }
    };

    /* ---------- 表格列定义 ---------- */
    const columns = [
        {
            title: '等级',
            width: 90,
            key: 'level',
            render: (_: unknown, alert: Alert) => (
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                        backgroundColor: LEVEL_CONFIG[alert.level].bgColor,
                        color: LEVEL_CONFIG[alert.level].color,
                    }}
                >
                    {LEVEL_CONFIG[alert.level].icon}
                    {LEVEL_CONFIG[alert.level].label}
                </span>
            ),
        },
        {
            title: '状态',
            width: 100,
            key: 'status',
            render: (_: unknown, alert: Alert) => (
                <Tag
                    icon={STATUS_CONFIG[alert.status].icon}
                    color={STATUS_CONFIG[alert.status].color}
                    style={{ margin: 0 }}
                >
                    {STATUS_CONFIG[alert.status].label}
                </Tag>
            ),
        },
        {
            title: '告警标题',
            key: 'title',
            render: (_: unknown, alert: Alert) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {alert.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }} className="line-clamp-1">
                        {alert.message}
                    </span>
                </div>
            ),
        },
        {
            title: '来源',
            width: 140,
            key: 'source',
            render: (_: unknown, alert: Alert) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color={SOURCE_TYPE_COLORS[alert.source_type]} style={{ margin: 0 }}>
                        {SOURCE_TYPE_LABELS[alert.source_type]}
                    </Tag>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {alert.source_name || alert.source_id}
                    </span>
                </div>
            ),
        },
        {
            title: '区域',
            width: 80,
            key: 'region',
            render: (_: unknown, alert: Alert) => (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <AimOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {alert.region || '—'}
                </span>
            ),
        },
        {
            title: '指标',
            width: 120,
            key: 'metric',
            render: (_: unknown, alert: Alert) => {
                if (!alert.metric_type || !alert.metric_value) {
                    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                }
                const unit = alert.metric_type === 'latency' ? 'ms' : '%';
                const color = alert.level === 'critical' ? '#ff4d4f' : '#faad14';
                return (
                    <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                        {alert.metric_value}{unit}
                        {alert.threshold ? ` / ${alert.threshold}` : ''}
                    </span>
                );
            },
        },
        {
            title: '发生时间',
            width: 130,
            key: 'created_at',
            render: (_: unknown, alert: Alert) => (
                <Tooltip title={formatTime(alert.created_at)}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {timeAgo(alert.created_at)}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: '操作',
            width: 120,
            key: 'action',
            align: 'center' as const,
            render: (_: unknown, alert: Alert) => (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="查看详情">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            style={{ color: '#1890ff' }}
                            onClick={() => handleViewDetail(alert)}
                        />
                    </Tooltip>
                    <Tooltip title="定位">
                        <Button
                            type="text"
                            size="small"
                            icon={<EnvironmentOutlined />}
                            style={{ color: '#722ed1' }}
                            onClick={() => handleLocate(alert)}
                        />
                    </Tooltip>
                    {alert.status === 'new' && (
                        <Tooltip title="确认告警">
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                style={{ color: '#faad14' }}
                                onClick={() => handleStatusChange(alert.id, 'acknowledged', '已确认')}
                            />
                        </Tooltip>
                    )}
                    {alert.status !== 'resolved' && (
                        <Popconfirm
                            title="确认恢复该告警？"
                            onConfirm={() => handleStatusChange(alert.id, 'resolved', '已恢复')}
                        >
                            <Tooltip title="标记恢复">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    style={{ color: '#52c41a' }}
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    /* ============================================================
     *  渲染
     * ============================================================ */
    return (
        <div className="alert-center">
            {contextHolder}

            {/* ===== 页面标题 ===== */}
            <div className="alert-center__header">
                <div className="alert-center__header-left">
                    <h1 className="alert-center__title">
                        <BellOutlined /> 告警中心
                    </h1>
                    <span className="alert-center__subtitle">实时监控告警与故障处理</span>
                </div>
                <div className="alert-center__header-right">
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchAlerts(); fetchStats(); }} loading={loading}>
                        刷新数据
                    </Button>
                </div>
            </div>

            {/* ===== 1. 告警统计卡片 ===== */}
            <div className="alert-stats-cards">
                <div className="alert-stat-card alert-stat-card--total">
                    <div className="alert-stat-card__icon">🚨</div>
                    <div className="alert-stat-card__info">
                        <span className="alert-stat-card__value">{stats?.total ?? 0}</span>
                        <span className="alert-stat-card__label">总告警</span>
                    </div>
                </div>
                <div
                    className="alert-stat-card alert-stat-card--critical"
                    onClick={() => handleFilterChange('level', filter.level === 'critical' ? 'all' : 'critical')}
                >
                    <div className="alert-stat-card__icon" style={{ color: '#ff4d4f' }}>🔴</div>
                    <div className="alert-stat-card__info">
                        <span className="alert-stat-card__value" style={{ color: '#ff4d4f' }}>{stats?.critical ?? 0}</span>
                        <span className="alert-stat-card__label">严重</span>
                    </div>
                </div>
                <div
                    className="alert-stat-card alert-stat-card--warning"
                    onClick={() => handleFilterChange('level', filter.level === 'warning' ? 'all' : 'warning')}
                >
                    <div className="alert-stat-card__icon" style={{ color: '#faad14' }}>🟡</div>
                    <div className="alert-stat-card__info">
                        <span className="alert-stat-card__value" style={{ color: '#faad14' }}>{stats?.warning ?? 0}</span>
                        <span className="alert-stat-card__label">警告</span>
                    </div>
                </div>
                <div
                    className="alert-stat-card alert-stat-card--info"
                    onClick={() => handleFilterChange('level', filter.level === 'info' ? 'all' : 'info')}
                >
                    <div className="alert-stat-card__icon" style={{ color: '#1890ff' }}>🔵</div>
                    <div className="alert-stat-card__info">
                        <span className="alert-stat-card__value" style={{ color: '#1890ff' }}>{stats?.info ?? 0}</span>
                        <span className="alert-stat-card__label">提示</span>
                    </div>
                </div>
            </div>

            {/* ===== 筛选栏 ===== */}
            <div className="alert-filter-bar">
                <div className="alert-filter-bar__left">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="搜索告警标题/内容..."
                        allowClear
                        value={filter.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        style={{ width: 240 }}
                    />
                    <Select
                        placeholder="告警等级"
                        allowClear
                        value={filter.level === 'all' ? undefined : filter.level}
                        onChange={(v) => handleFilterChange('level', v || 'all')}
                        style={{ width: 120 }}
                        options={Object.entries(ALERT_LEVEL_LABELS).map(([key, label]) => ({
                            label, value: key,
                        }))}
                    />
                    <Select
                        placeholder="告警状态"
                        allowClear
                        value={filter.status === 'all' ? undefined : filter.status}
                        onChange={(v) => handleFilterChange('status', v || 'all')}
                        style={{ width: 120 }}
                        options={Object.entries(ALERT_STATUS_LABELS).map(([key, label]) => ({
                            label, value: key,
                        }))}
                    />
                    <Select
                        placeholder="来源类型"
                        allowClear
                        value={filter.source_type === 'all' ? undefined : filter.source_type}
                        onChange={(v) => handleFilterChange('source_type', v || 'all')}
                        style={{ width: 110 }}
                        options={Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => ({
                            label, value: key,
                        }))}
                    />
                    <Segmented
                        options={TIME_RANGE_OPTIONS}
                        value={filter.time_range}
                        onChange={(v) => handleFilterChange('time_range', v as string)}
                    />
                </div>
                <span className="alert-filter-bar__count">
                    共 <strong>{alerts.total}</strong> 条告警
                </span>
            </div>

            {/* ===== 告警列表表格 ===== */}
            <ConfigProvider
                theme={{
                    token: {
                        colorBgContainer: 'var(--bg-card)',
                        colorBorderSecondary: 'var(--border-secondary)',
                        colorText: 'var(--text-primary)',
                        colorTextSecondary: 'var(--text-secondary)',
                        colorTextTertiary: 'var(--text-muted)',
                    },
                }}
            >
                <Table
                    columns={columns}
                    dataSource={alerts.items}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    onRow={(alert) => ({
                        onClick: () => handleViewDetail(alert),
                        style: {
                            cursor: 'pointer',
                            background: alert.level === 'critical'
                                ? 'rgba(255, 77, 79, 0.03)'
                                : alert.level === 'warning'
                                    ? 'rgba(250, 173, 20, 0.02)'
                                    : undefined,
                        },
                    })}
                    rowClassName={(alert) => `alert-table-row alert-table-row--${alert.level}`}
                />
                <Pagination
                    align="center"
                    current={currentPage}
                    pageSize={pageSize}
                    total={alerts.total}
                    onChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条告警`}
                    pageSizeOptions={['10', '20', '50', '100']}
                />
            </ConfigProvider>

            {/* ===== 详情抽屉 ===== */}
            <Drawer
                title={null}
                placement="right"
                size="large"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className="alert-drawer"
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                {selectedAlert && (
                    <div className="detail-drawer">
                        {/* 头部 */}
                        <div className={`detail-drawer__header detail-drawer__header--${selectedAlert.level}`}>
                            <div className="detail-drawer__header-top">
                                <span
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                                    style={{
                                        backgroundColor: LEVEL_CONFIG[selectedAlert.level].bgColor,
                                        color: LEVEL_CONFIG[selectedAlert.level].color,
                                    }}
                                >
                                    {LEVEL_CONFIG[selectedAlert.level].icon}
                                    {LEVEL_CONFIG[selectedAlert.level].label}
                                </span>
                                <Tag
                                    icon={STATUS_CONFIG[selectedAlert.status].icon}
                                    color={STATUS_CONFIG[selectedAlert.status].color}
                                >
                                    {STATUS_CONFIG[selectedAlert.status].label}
                                </Tag>
                            </div>
                            <h2 className="detail-drawer__title">{selectedAlert.title}</h2>
                            <div className="detail-drawer__meta">
                                <span>{SOURCE_TYPE_LABELS[selectedAlert.source_type]}: {selectedAlert.source_name || selectedAlert.source_id}</span>
                                {selectedAlert.region && <span>· {selectedAlert.region}</span>}
                                <span>· {formatTime(selectedAlert.created_at)}</span>
                            </div>
                        </div>

                        <div className="detail-drawer__body">
                            {/* 告警详情 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><WarningOutlined /> 告警详情</h4>
                                <div className="detail-message">{selectedAlert.message}</div>
                            </section>

                            {/* 指标信息 */}
                            {selectedAlert.metric_type && selectedAlert.metric_value && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><BugOutlined /> 指标信息</h4>
                                    <div className="metric-info-grid">
                                        <div className="metric-info-item">
                                            <span className="metric-info-item__label">指标类型</span>
                                            <span className="metric-info-item__value">{selectedAlert.metric_type.toUpperCase()}</span>
                                        </div>
                                        <div className="metric-info-item">
                                            <span className="metric-info-item__label">当前值</span>
                                            <span className="metric-info-item__value" style={{ color: selectedAlert.level === 'critical' ? '#ff4d4f' : '#faad14' }}>
                                                {selectedAlert.metric_value}
                                                {selectedAlert.metric_type === 'latency' ? ' ms' : '%'}
                                            </span>
                                        </div>
                                        {selectedAlert.threshold && (
                                            <div className="metric-info-item">
                                                <span className="metric-info-item__label">阈值</span>
                                                <span className="metric-info-item__value">{selectedAlert.threshold}</span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* 根因分析 */}
                            {selectedAlert.root_cause && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><NodeIndexOutlined /> 根因分析</h4>
                                    <div className="detail-root-cause">{selectedAlert.root_cause}</div>
                                </section>
                            )}

                            {/* 关联告警 */}
                            {selectedAlert.related_alerts.length > 0 && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><NodeIndexOutlined /> 关联告警</h4>
                                    <div className="related-alerts">
                                        {selectedAlert.related_alerts.map((id) => (
                                            <Tag key={id} color="blue" className="related-alert-tag" onClick={() => {
                                                getAlertById(id).then(detail => {
                                                    setSelectedAlert(detail);
                                                });
                                            }}>
                                                告警 #{id}
                                            </Tag>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 告警时间线 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><ClockCircleOutlined /> 告警时间线</h4>
                                {selectedAlert.timeline && selectedAlert.timeline.length > 0 ? (
                                    <Timeline
                                        items={selectedAlert.timeline.map((entry) => ({
                                            dot: getTimelineIcon(entry.action),
                                            children: (
                                                <div className="timeline-item">
                                                    <div className="timeline-item__header">
                                                        <span className="timeline-item__action">
                                                            {entry.action === 'created' ? '告警发生' :
                                                             entry.action === 'acknowledged' ? '已确认' :
                                                             entry.action === 'resolved' ? '已恢复' : '状态更新'}
                                                        </span>
                                                        <span className="timeline-item__time">{formatTime(entry.created_at)}</span>
                                                    </div>
                                                    {entry.operator && (
                                                        <div className="timeline-item__operator">操作人: {entry.operator}</div>
                                                    )}
                                                    {entry.remark && (
                                                        <div className="timeline-item__remark">{entry.remark}</div>
                                                    )}
                                                </div>
                                            ),
                                        }))}
                                    />
                                ) : (
                                    <Empty description="暂无时间线数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </section>

                            {/* 快捷操作 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">快捷操作</h4>
                                <div className="quick-actions">
                                    {selectedAlert.status === 'new' && (
                                        <Button
                                            icon={<CheckCircleOutlined />}
                                            onClick={() => handleStatusChange(selectedAlert.id, 'acknowledged', '已确认')}
                                        >
                                            确认告警
                                        </Button>
                                    )}
                                    {selectedAlert.status !== 'resolved' && (
                                        <Button
                                            icon={<CheckCircleOutlined />}
                                            style={{ color: '#52c41a', borderColor: '#52c41a' }}
                                            onClick={() => handleStatusChange(selectedAlert.id, 'resolved', '已恢复')}
                                        >
                                            标记恢复
                                        </Button>
                                    )}
                                    <Button
                                        icon={<EnvironmentOutlined />}
                                        style={{ color: '#722ed1', borderColor: '#722ed1' }}
                                        onClick={() => handleLocate(selectedAlert)}
                                    >
                                        定位对象
                                    </Button>
                                    <Popconfirm
                                        title="确定删除该告警？"
                                        description="此操作不可恢复"
                                        onConfirm={() => handleDelete(selectedAlert.id)}
                                    >
                                        <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                        >
                                            删除告警
                                        </Button>
                                    </Popconfirm>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
