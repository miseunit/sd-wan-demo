/**
 * 链路实况表格
 * 展示源站点的所有链路性能数据
 */
import { Tag, Progress, Empty, ConfigProvider, Table } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { LinkQuality } from '../types';

interface LinkQualityTableProps {
    /** 站点名称 */
    siteName: string;
    /** 链路数据 */
    links: LinkQuality[];
    /** 加载中 */
    loading: boolean;
}

/** 健康状态配置 */
const HEALTH_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    healthy: { label: '健康', color: '#52c41a', icon: <CheckCircleOutlined /> },
    degraded: { label: '劣化', color: '#faad14', icon: <ExclamationCircleOutlined /> },
    down: { label: '故障', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
};

/** 链路类型颜色 */
const LINK_TYPE_COLORS: Record<string, string> = {
    MPLS: 'blue',
    Internet: 'green',
    '5G': 'purple',
    IPsec: 'cyan',
    GRE: 'lime',
    VXLAN: 'orange',
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

/** 利用率颜色 */
function utilizationColor(v: number): string {
    if (v < 50) return '#52c41a';
    if (v < 80) return '#faad14';
    return '#ff4d4f';
}

/**
 * 链路实况表格组件
 */
export default function LinkQualityTable({ siteName, links, loading }: LinkQualityTableProps) {
    if (!siteName) {
        return null;
    }

    const columns = [
        {
            title: '链路名称',
            width: 140,
            key: 'name',
            render: (_: unknown, link: LinkQuality) => (
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
            render: (_: unknown, link: LinkQuality) => (
                <Tag color={LINK_TYPE_COLORS[link.type] || 'magenta'} style={{ margin: 0 }}>
                    {link.type}
                </Tag>
            ),
        },
        {
            title: '状态',
            width: 100,
            key: 'healthStatus',
            render: (_: unknown, link: LinkQuality) => {
                const config = HEALTH_CONFIG[link.healthStatus] || HEALTH_CONFIG.healthy;
                return (
                    <span style={{ color: config.color, fontSize: 13 }}>
                        {config.icon} {config.label}
                        {link.activeStatus === 'active' && link.healthStatus !== 'down' && (
                            <span style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#1890ff',
                                marginLeft: 6,
                            }} />
                        )}
                    </span>
                );
            },
        },
        {
            title: '延迟',
            width: 90,
            key: 'latency',
            sorter: (a: LinkQuality, b: LinkQuality) => a.latency - b.latency,
            render: (_: unknown, link: LinkQuality) => (
                <span style={{ color: latencyColor(link.latency), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {link.latency === 0 ? '—' : `${link.latency} ms`}
                </span>
            ),
        },
        {
            title: '丢包',
            width: 80,
            key: 'loss',
            sorter: (a: LinkQuality, b: LinkQuality) => a.loss - b.loss,
            render: (_: unknown, link: LinkQuality) => (
                <span style={{ color: lossColor(link.loss), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {link.loss >= 100 ? '—' : `${link.loss}%`}
                </span>
            ),
        },
        {
            title: '抖动',
            width: 80,
            key: 'jitter',
            sorter: (a: LinkQuality, b: LinkQuality) => a.jitter - b.jitter,
            render: (_: unknown, link: LinkQuality) => (
                <span style={{ color: latencyColor(link.jitter), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {link.jitter === 0 && link.healthStatus === 'down' ? '—' : `${link.jitter} ms`}
                </span>
            ),
        },
        {
            title: '带宽 / 利用率',
            width: 160,
            key: 'utilization',
            sorter: (a: LinkQuality, b: LinkQuality) => a.utilization - b.utilization,
            render: (_: unknown, link: LinkQuality) => (
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
            width: 70,
            key: 'slaScore',
            sorter: (a: LinkQuality, b: LinkQuality) => a.slaScore - b.slaScore,
            render: (_: unknown, link: LinkQuality) => (
                <span style={{
                    color: link.slaScore >= 80 ? '#52c41a' : link.slaScore >= 60 ? '#faad14' : '#ff4d4f',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 15,
                }}>
                    {link.slaScore}
                </span>
            ),
        },
        {
            title: '角色',
            width: 80,
            key: 'activeStatus',
            render: (_: unknown, link: LinkQuality) => (
                <Tag
                    color={link.activeStatus === 'active' ? 'green' : link.activeStatus === 'standby' ? 'orange' : 'red'}
                    style={{ margin: 0 }}
                >
                    {link.activeStatus === 'active' ? '承载中' : link.activeStatus === 'standby' ? '备用' : '故障'}
                </Tag>
            ),
        },
    ];

    return (
        <div className="link-quality">
            <h3 className="link-quality__title">
                🔗 {siteName} 链路实况
                <span className="link-quality__count">共 {links.length} 条链路</span>
            </h3>
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
                    columns={columns}
                    dataSource={links}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    size="small"
                    locale={{
                        emptyText: <Empty description="暂无链路数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                    }}
                />
            </ConfigProvider>
        </div>
    );
}
