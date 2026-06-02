/**
 * 推荐路径对比面板
 * 展示 Top3 推荐路径的详细对比
 */
import { Tag, Button, Tooltip, Empty } from 'antd';
import {
    CheckCircleOutlined,
    SwapOutlined,
    ThunderboltOutlined,
    LineChartOutlined,
} from '@ant-design/icons';
import type { RecommendedPath, CurrentPolicy } from '../types';

interface PathRecommendPanelProps {
    /** 推荐路径列表 */
    paths: RecommendedPath[];
    /** 源站点名称 */
    sourceName: string;
    /** 目的站点名称 */
    destName: string;
    /** 当前生效策略 */
    currentPolicy: CurrentPolicy | null;
    /** 应用路径回调 */
    onApplyPath: (path: RecommendedPath) => void;
    /** 编辑策略回调 */
    onEditPolicy: () => void;
}

/** 延迟颜色 */
function latencyColor(v: number): string {
    if (v < 20) return '#52c41a';
    if (v < 50) return '#faad14';
    if (v < 100) return '#fa8c16';
    return '#ff4d4f';
}

/** 丢包颜色 */
function lossColor(v: number): string {
    if (v < 0.05) return '#52c41a';
    if (v < 0.2) return '#faad14';
    return '#ff4d4f';
}

/** SLA 评分颜色 */
function slaColor(v: number): string {
    if (v >= 80) return '#52c41a';
    if (v >= 60) return '#faad14';
    return '#ff4d4f';
}

/** 链路类型颜色 */
const LINK_TYPE_COLORS: Record<string, string> = {
    MPLS: '#1890ff',
    Internet: '#52c41a',
    '5G': '#722ed1',
    IPsec: '#13c2c2',
    GRE: '#a0d911',
    VXLAN: '#fa8c16',
};

/**
 * 推荐路径对比面板组件
 */
export default function PathRecommendPanel({
    paths,
    sourceName,
    destName,
    currentPolicy,
    onApplyPath,
    onEditPolicy,
}: PathRecommendPanelProps) {
    if (paths.length === 0) {
        return (
            <div className="recommend-panel">
                <div className="recommend-panel__header">
                    <h3 className="recommend-panel__title">
                        <ThunderboltOutlined /> 推荐路径
                    </h3>
                </div>
                <Empty description="暂无推荐路径，请先选择站点并开始选路" />
            </div>
        );
    }

    return (
        <div className="recommend-panel">
            {/* 头部 */}
            <div className="recommend-panel__header">
                <h3 className="recommend-panel__title">
                    <ThunderboltOutlined /> 推荐路径
                </h3>
                <div className="recommend-panel__route">
                    <Tag color="blue">{sourceName}</Tag>
                    <SwapOutlined style={{ color: 'var(--text-muted)', margin: '0 6px' }} />
                    <Tag color="green">{destName}</Tag>
                </div>
            </div>

            {/* 当前策略摘要 */}
            {currentPolicy && (
                <div className="recommend-panel__policy">
                    <span className="recommend-panel__policy-label">当前策略：</span>
                    <Tag color="purple">{currentPolicy.name}</Tag>
                    <Button type="link" size="small" onClick={onEditPolicy}>
                        编辑
                    </Button>
                </div>
            )}

            {/* 推荐路径卡片列表 */}
            <div className="recommend-panel__paths">
                {paths.map((path) => (
                    <div
                        key={path.rank}
                        className={`path-card path-card--${path.label}`}
                        style={{ borderLeftColor: path.color }}
                    >
                        {/* 路径头部 */}
                        <div className="path-card__header">
                            <span className="path-card__rank" style={{ color: path.color }}>
                                {path.label}
                            </span>
                            <span className="path-card__score">
                                <LineChartOutlined style={{ marginRight: 4 }} />
                                综合评分
                                <span style={{ color: slaColor(path.avgSlaScore), marginLeft: 4, fontWeight: 700 }}>
                                    {path.avgSlaScore}
                                </span>
                            </span>
                        </div>

                        {/* 路径链路 */}
                        <div className="path-card__links">
                            {path.links.map((link, idx) => (
                                <span key={link.id}>
                                    {idx > 0 && (
                                        <span className="path-card__arrow">→</span>
                                    )}
                                    <Tooltip title={`${link.isp} | ${link.type} | SLA ${link.slaScore}`}>
                                        <Tag
                                            color={LINK_TYPE_COLORS[link.type] || 'magenta'}
                                            style={{ margin: 0, cursor: 'default' }}
                                        >
                                            {link.name}
                                        </Tag>
                                    </Tooltip>
                                </span>
                            ))}
                        </div>

                        {/* 指标 */}
                        <div className="path-card__metrics">
                            <div className="path-card__metric">
                                <span className="path-card__metric-label">延迟</span>
                                <span
                                    className="path-card__metric-value"
                                    style={{ color: latencyColor(path.totalLatency) }}
                                >
                                    {path.totalLatency}ms
                                </span>
                            </div>
                            <div className="path-card__metric">
                                <span className="path-card__metric-label">丢包</span>
                                <span
                                    className="path-card__metric-value"
                                    style={{ color: lossColor(path.maxLoss) }}
                                >
                                    {path.maxLoss}%
                                </span>
                            </div>
                            <div className="path-card__metric">
                                <span className="path-card__metric-label">可用带宽</span>
                                <span className="path-card__metric-value">
                                    {path.minBandwidth}Mbps
                                </span>
                            </div>
                        </div>

                        {/* 推荐理由 */}
                        <div className="path-card__reason">
                            💡 {path.reason}
                        </div>

                        {/* 操作按钮 */}
                        {path.rank === 1 && (
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                block
                                onClick={() => onApplyPath(path)}
                                className="path-card__apply"
                            >
                                应用此路径
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* 无策略提示 */}
            {!currentPolicy && (
                <div className="recommend-panel__no-policy">
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        暂无生效策略
                    </span>
                    <Button type="link" size="small" onClick={onEditPolicy}>
                        创建策略
                    </Button>
                </div>
            )}
        </div>
    );
}
