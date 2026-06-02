/**
 * 智能选路 - 主页面
 * 场景导向设计：选站点对 → 看推荐路径 → 改策略
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import PathExplorer from './components/PathExplorer';
import PathRecommendPanel from './components/PathRecommendPanel';
import LinkQualityTable from './components/LinkQualityTable';
import PolicyQuickEdit from './components/PolicyQuickEdit';
import { recommendPath, getSourceLinks } from './api';
import { createPolicy, updatePolicy } from '../PolicyManagement/api';
import type {
    PathRecommendation,
    RecommendedPath,
    LinkQuality,
    CurrentPolicy,
    SiteOption,
} from './types';
import { getSiteOptions } from './api';
import './SmartRouting.css';

/**
 * 智能选路主页面
 */
export default function SmartRouting() {
    /* ---------- 状态 ---------- */
    const [recommendation, setRecommendation] = useState<PathRecommendation | null>(null);
    const [sourceLinks, setSourceLinks] = useState<LinkQuality[]>([]);
    const [loading, setLoading] = useState(false);
    const [linksLoading, setLinksLoading] = useState(false);
    const [policyModalOpen, setPolicyModalOpen] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState<CurrentPolicy | null>(null);
    const [sourceSiteId, setSourceSiteId] = useState<string>('');
    const [destSiteId, setDestSiteId] = useState<string>('');
    const [sourceName, setSourceName] = useState<string>('');
    const [destName, setDestName] = useState<string>('');
    const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
    const [messageApi, contextHolder] = message.useMessage();

    /* ---------- 画布尺寸 ---------- */
    const canvasRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current) {
                setCanvasSize({
                    width: canvasRef.current.clientWidth,
                    height: canvasRef.current.clientHeight,
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    /* ---------- 加载站点列表 ---------- */
    useEffect(() => {
        getSiteOptions().then(setSiteOptions).catch(() => {});
    }, []);

    /* ---------- 站点名称查找 ---------- */
    const getSiteName = useCallback((siteId: string): string => {
        const site = siteOptions.find((s) => s.value === siteId);
        return site ? site.label : siteId;
    }, [siteOptions]);

    /* ---------- 开始选路 ---------- */
    const handleExplore = useCallback(async (
        srcId: string,
        dstId: string,
        appType?: string,
    ) => {
        setSourceSiteId(srcId);
        setDestSiteId(dstId);
        setSourceName(getSiteName(srcId));
        setDestName(getSiteName(dstId));
        setLoading(true);

        try {
            const result = await recommendPath(srcId, dstId, appType);
            setRecommendation(result);
            setCurrentPolicy(result.currentPolicy);

            // 同时加载源站点链路
            setLinksLoading(true);
            getSourceLinks(srcId)
                .then(setSourceLinks)
                .catch(() => setSourceLinks([]))
                .finally(() => setLinksLoading(false));
        } catch (err) {
            messageApi.error(err instanceof Error ? err.message : '路径推荐失败');
            setRecommendation(null);
            setSourceLinks([]);
        } finally {
            setLoading(false);
        }
    }, [getSiteName, messageApi]);

    /* ---------- 应用推荐路径（自动创建/更新策略） ---------- */
    const handleApplyPath = useCallback(async (path: RecommendedPath) => {
        if (!sourceSiteId || !destSiteId) return;

        // 构建链路路径描述
        const linkNames = path.links.map((l) => l.name).join(' → ');
        const policyName = `${sourceName}→${destName} 智能选路`;

        // 构建策略数据
        const policyData = {
            name: policyName,
            type: 'route' as const,
            priority: 10,
            description: `智能选路推荐路径：${linkNames}（综合评分 ${path.avgSlaScore}，延迟 ${path.totalLatency}ms）`,
            match_conditions: {
                source_sites: [sourceSiteId],
                dest_sites: [destSiteId],
            },
            action_config: {
                routing_mode: 'smart',
                recommended_links: path.links.map((l) => l.id),
                total_latency: path.totalLatency,
                max_loss: path.maxLoss,
                sla_score: path.avgSlaScore,
            },
            applied_sites: [sourceSiteId, destSiteId],
        };

        try {
            // 如果已有同名策略则更新，否则创建
            if (currentPolicy && currentPolicy.name === policyName) {
                await updatePolicy(currentPolicy.id, policyData);
                messageApi.success(`策略"${policyName}"已更新`);
            } else {
                await createPolicy(policyData);
                messageApi.success(`策略"${policyName}"已创建，推荐路径已生效`);
            }
            // 刷新当前策略
            setCurrentPolicy({
                id: currentPolicy?.id || 0,
                name: policyName,
                type: 'route',
                priority: 10,
                actionConfig: policyData.action_config,
            });
        } catch (err) {
            messageApi.error(err instanceof Error ? err.message : '策略应用失败');
        }
    }, [sourceSiteId, destSiteId, sourceName, destName, currentPolicy, messageApi]);

    /* ---------- 打开策略编辑 ---------- */
    const handleEditPolicy = useCallback(() => {
        setPolicyModalOpen(true);
    }, []);

    /* ---------- 策略保存成功 ---------- */
    const handlePolicySaved = useCallback(() => {
        // 重新推荐路径
        if (sourceSiteId && destSiteId) {
            handleExplore(sourceSiteId, destSiteId);
        }
    }, [sourceSiteId, destSiteId, handleExplore]);

    /* ---------- 拓扑可视化渲染 ---------- */
    const renderTopology = () => {
        if (!recommendation || recommendation.paths.length === 0) {
            return (
                <div className="topology-placeholder">
                    <div className="topology-placeholder__icon">🌐</div>
                    <div className="topology-placeholder__text">
                        选择源站点和目的站点，开始智能选路
                    </div>
                </div>
            );
        }

        const bestPath = recommendation.paths[0];
        const allSites = new Set<string>();
        allSites.add(recommendation.sourceSiteName);
        allSites.add(recommendation.destSiteName);
        bestPath.links.forEach((l) => allSites.add(l.siteName));

        const siteList = Array.from(allSites);
        const w = canvasSize.width;
        const h = canvasSize.height;

        // 计算节点位置（水平排列）
        const nodePositions: Record<string, { x: number; y: number }> = {};
        const padding = 80;
        const spacing = siteList.length > 1 ? (w - padding * 2) / (siteList.length - 1) : 0;

        siteList.forEach((site, i) => {
            nodePositions[site] = {
                x: padding + i * spacing,
                y: h / 2,
            };
        });

        return (
            <svg width={w} height={h} className="topology-svg">
                {/* 背景网格 */}
                <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                    {/* 发光滤镜 */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* 绘制链路连线 */}
                {recommendation.paths.map((path) => {
                    const pathColor = path.color;
                    const isTop = path.rank === 1;
                    return (
                        <g key={path.rank}>
                            {path.links.map((link, idx) => {
                                const fromSite = idx === 0 ? recommendation.sourceSiteName : path.links[idx - 1].siteName;
                                const toSite = link.siteName;
                                const from = nodePositions[fromSite];
                                const to = nodePositions[toSite];
                                if (!from || !to) return null;

                                // 如果 from 和 to 是同一个站点（同站点链路），画弧线
                                if (fromSite === toSite) {
                                    return (
                                        <path
                                            key={link.id}
                                            d={`M ${from.x} ${from.y - 40} Q ${from.x + 60} ${from.y - 100} ${from.x} ${from.y - 40}`}
                                            fill="none"
                                            stroke={pathColor}
                                            strokeWidth={isTop ? 3 : 2}
                                            strokeDasharray={isTop ? 'none' : '6 4'}
                                            opacity={isTop ? 1 : 0.5}
                                            filter={isTop ? 'url(#glow)' : undefined}
                                        />
                                    );
                                }

                                return (
                                    <g key={link.id}>
                                        <line
                                            x1={from.x}
                                            y1={from.y}
                                            x2={to.x}
                                            y2={to.y}
                                            stroke={pathColor}
                                            strokeWidth={isTop ? 3 : 2}
                                            strokeDasharray={isTop ? 'none' : '6 4'}
                                            opacity={isTop ? 1 : 0.5}
                                            filter={isTop ? 'url(#glow)' : undefined}
                                        />
                                        {/* 链路指标标注 */}
                                        {isTop && (
                                            <g>
                                                <rect
                                                    x={(from.x + to.x) / 2 - 40}
                                                    y={(from.y + to.y) / 2 - 22}
                                                    width={80}
                                                    height={18}
                                                    rx={4}
                                                    fill="rgba(0,0,0,0.7)"
                                                    stroke={pathColor}
                                                    strokeWidth={1}
                                                />
                                                <text
                                                    x={(from.x + to.x) / 2}
                                                    y={(from.y + to.y) / 2 - 10}
                                                    textAnchor="middle"
                                                    fill={pathColor}
                                                    fontSize={11}
                                                    fontFamily="monospace"
                                                >
                                                    {link.latency}ms | {link.type}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}

                {/* 绘制站点节点 */}
                {siteList.map((site) => {
                    const pos = nodePositions[site];
                    const isSource = site === recommendation.sourceSiteName;
                    const isDest = site === recommendation.destSiteName;
                    const nodeColor = isSource ? '#1890ff' : isDest ? '#52c41a' : '#8c8c8c';

                    return (
                        <g key={site}>
                            {/* 外圈光晕 */}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={28}
                                fill="none"
                                stroke={nodeColor}
                                strokeWidth={2}
                                opacity={0.3}
                            />
                            {/* 主节点 */}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={22}
                                fill="rgba(0,0,0,0.6)"
                                stroke={nodeColor}
                                strokeWidth={2}
                            />
                            {/* 内部图标 */}
                            <text
                                x={pos.x}
                                y={pos.y + 1}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={nodeColor}
                                fontSize={16}
                            >
                                {isSource ? '🏢' : isDest ? '🏢' : '🔗'}
                            </text>
                            {/* 站点名称 */}
                            <text
                                x={pos.x}
                                y={pos.y + 40}
                                textAnchor="middle"
                                fill="var(--text-primary, #e0e6ff)"
                                fontSize={12}
                                fontWeight={600}
                            >
                                {site}
                            </text>
                            {/* 角色标签 */}
                            <text
                                x={pos.x}
                                y={pos.y + 55}
                                textAnchor="middle"
                                fill={nodeColor}
                                fontSize={10}
                            >
                                {isSource ? '源站点' : isDest ? '目的站点' : '中转'}
                            </text>
                        </g>
                    );
                })}

                {/* 路径排名图例 */}
                {recommendation.paths.map((path) => (
                    <g key={`legend-${path.rank}`}>
                        <rect
                            x={w - 150}
                            y={20 + (path.rank - 1) * 24}
                            width={12}
                            height={12}
                            rx={2}
                            fill={path.color}
                        />
                        <text
                            x={w - 130}
                            y={30 + (path.rank - 1) * 24}
                            fill="var(--text-secondary, #8a8a9e)"
                            fontSize={12}
                        >
                            {path.label} (评分 {path.avgSlaScore})
                        </text>
                    </g>
                ))}
            </svg>
        );
    };

    /* ---------- 渲染 ---------- */
    return (
        <div className="smart-routing">
            {contextHolder}

            {/* 页面标题 */}
            <div className="smart-routing__header">
                <div className="smart-routing__header-left">
                    <h1 className="smart-routing__title">
                        <ThunderboltOutlined /> 智能选路
                    </h1>
                    <span className="smart-routing__subtitle">
                        基于实时链路质量的智能路径推荐与流量调度
                    </span>
                </div>
            </div>

            {/* 路径探索选择器 */}
            <PathExplorer loading={loading} onExplore={handleExplore} />

            {/* 主内容区：左拓扑 + 右推荐 */}
            <div className="smart-routing__main">
                {/* 左侧拓扑可视化 */}
                <div className="smart-routing__topology" ref={canvasRef}>
                    {renderTopology()}
                </div>

                {/* 右侧推荐路径面板 */}
                <PathRecommendPanel
                    paths={recommendation?.paths || []}
                    sourceName={sourceName}
                    destName={destName}
                    currentPolicy={currentPolicy}
                    onApplyPath={handleApplyPath}
                    onEditPolicy={handleEditPolicy}
                />
            </div>

            {/* 底部链路实况表格 */}
            {sourceSiteId && (
                <LinkQualityTable
                    siteName={sourceName}
                    links={sourceLinks}
                    loading={linksLoading}
                />
            )}

            {/* 策略编辑弹窗 */}
            <PolicyQuickEdit
                open={policyModalOpen}
                currentPolicy={currentPolicy}
                sourceSiteId={sourceSiteId}
                destSiteId={destSiteId}
                sourceName={sourceName}
                destName={destName}
                onClose={() => setPolicyModalOpen(false)}
                onSaved={handlePolicySaved}
            />
        </div>
    );
}
