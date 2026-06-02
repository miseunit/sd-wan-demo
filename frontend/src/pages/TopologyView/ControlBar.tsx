/**
 * 左侧控制栏组件
 * 仅保留：在线状态概览 + 完整图例
 */

import { useState } from "react";
import {
    ViewMode,
    statsSummary,
    HEALTH_COLORS,
    HealthStatus,
    DEVICE_COLORS,
    DeviceType,
} from "./mockData";

interface ControlBarProps {
    /** 当前视图模式 */
    viewMode: ViewMode;
    /** 切换视图模式 */
    onViewModeChange: (mode: ViewMode) => void;
    /** 搜索关键词 */
    searchQuery: string;
    /** 搜索变更 */
    onSearchChange: (query: string) => void;
    /** 选中的应用流量 ID */
    selectedFlowId: string | null;
    /** 选择应用流量 */
    onFlowSelect: (flowId: string | null) => void;
    /** 模拟故障回调 */
    onSimulateFault: () => void;
    /** 导出拓扑回调 */
    onExportTopology: () => void;
}

/** 设备类型图例配置（与 mockData 节点 type 对应） */
const DEVICE_LEGEND_ITEMS = [
    { type: DeviceType.HQ, label: "总部", shape: "hexagon", shapeLabel: "六边形" },
    { type: DeviceType.BRANCH, label: "分支", shape: "circle", shapeLabel: "圆形" },
    { type: DeviceType.VSMART, label: "vSmart 控制器", shape: "rect", shapeLabel: "矩形" },
    { type: DeviceType.VBOND, label: "vBond 编排器", shape: "diamond", shapeLabel: "菱形" },
    { type: DeviceType.CLOUD_GW, label: "云网关", shape: "ellipse", shapeLabel: "椭圆" },
];

/**
 * 左侧控制栏
 */
export default function ControlBar({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    selectedFlowId,
    onFlowSelect,
    onSimulateFault,
    onExportTopology,
}: ControlBarProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`control-bar ${collapsed ? "control-bar--collapsed" : ""}`}
        >
            {/* 控制栏头部 */}
            <div className="control-bar__header">
                {!collapsed && (
                    <>
                        <h2 className="control-bar__title">SD-WAN</h2>
                        <span className="control-bar__subtitle">拓扑视图</span>
                    </>
                )}
                <button
                    className="control-bar__toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? "展开控制栏" : "收起控制栏"}
                >
                    {collapsed ? "▶" : "◀"}
                </button>
            </div>

            {!collapsed && (
                <div className="control-bar__content">

                    {/* 在线状态概览 */}
                    <section className="control-bar__section">
                        <h3 className="control-bar__section-title">在线状态</h3>
                        <div className="control-bar__stats">
                            <div className="stat-item">
                                <span className="stat-item__value">{statsSummary.totalDevices}</span>
                                <span className="stat-item__label">设备</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-item__value stat-item__value--green">
                                    {statsSummary.activeTunnels}
                                </span>
                                <span className="stat-item__label">活跃</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-item__value stat-item__value--yellow">
                                    {statsSummary.standbyTunnels}
                                </span>
                                <span className="stat-item__label">备用</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-item__value stat-item__value--red">
                                    {statsSummary.downTunnels}
                                </span>
                                <span className="stat-item__label">中断</span>
                            </div>
                        </div>
                    </section>

                    {/* 图例 */}
                    <section className="control-bar__section control-bar__section--last">
                        <h3 className="control-bar__section-title">图例</h3>
                        <div className="legend">
                            {/* 设备类型 */}
                            <div className="legend__group">
                                <span className="legend__subtitle">设备类型</span>
                                {DEVICE_LEGEND_ITEMS.map(({ type, label, shapeLabel }) => {
                                    const color = DEVICE_COLORS[type];
                                    const isClipPath = type === DeviceType.HQ || type === DeviceType.VBOND;
                                    return (
                                        <div key={type} className="legend__item">
                                            <span
                                                className={`legend__shape legend__shape--${type}`}
                                                style={{
                                                    ...(isClipPath
                                                        ? { color, background: color }
                                                        : { borderColor: color }),
                                                    boxShadow: `0 0 6px ${color}60`,
                                                }}
                                            />
                                            <span className="legend__text">{label}（{shapeLabel}）</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 隧道状态：状态（线型）× 健康（颜色） */}
                            <div className="legend__group">
                                <span className="legend__subtitle">隧道链路</span>
                                {/* 活跃 — 实线 */}
                                <div className="legend__item">
                                    <span className="legend__line" style={{ background: HEALTH_COLORS[HealthStatus.GOOD] }} />
                                    <span className="legend__text">活跃 · 正常</span>
                                </div>
                                <div className="legend__item">
                                    <span className="legend__line" style={{ background: HEALTH_COLORS[HealthStatus.WARNING] }} />
                                    <span className="legend__text">活跃 · 告警</span>
                                </div>
                                <div className="legend__item">
                                    <span className="legend__line" style={{ background: HEALTH_COLORS[HealthStatus.CRITICAL] }} />
                                    <span className="legend__text">活跃 · 严重</span>
                                </div>
                                {/* 备用 — 虚线 */}
                                <div className="legend__item">
                                    <span className="legend__line legend__line--dashed" style={{ background: `repeating-linear-gradient(to right, ${HEALTH_COLORS[HealthStatus.GOOD]} 0, ${HEALTH_COLORS[HealthStatus.GOOD]} 4px, transparent 4px, transparent 7px)` }} />
                                    <span className="legend__text">备用 · 正常</span>
                                </div>
                                <div className="legend__item">
                                    <span className="legend__line legend__line--dashed" style={{ background: `repeating-linear-gradient(to right, ${HEALTH_COLORS[HealthStatus.WARNING]} 0, ${HEALTH_COLORS[HealthStatus.WARNING]} 4px, transparent 4px, transparent 7px)` }} />
                                    <span className="legend__text">备用 · 告警</span>
                                </div>
                                {/* 中断 — 短虚线 */}
                                <div className="legend__item">
                                    <span className="legend__line legend__line--down" style={{ background: `repeating-linear-gradient(to right, ${HEALTH_COLORS[HealthStatus.CRITICAL]} 0, ${HEALTH_COLORS[HealthStatus.CRITICAL]} 3px, transparent 3px, transparent 5px)` }} />
                                    <span className="legend__text">中断 · 严重</span>
                                </div>
                            </div>

                            {/* 多链路说明 */}
                            <div className="legend__group">
                                <span className="legend__subtitle">多链路（主备）</span>
                                <div className="legend__item">
                                    <span className="legend__multiline">
                                        <span className="legend__line" style={{ background: HEALTH_COLORS[HealthStatus.WARNING] }} />
                                        <span className="legend__line legend__line--dashed" style={{ background: `repeating-linear-gradient(to right, ${HEALTH_COLORS[HealthStatus.CRITICAL]} 0, ${HEALTH_COLORS[HealthStatus.CRITICAL]} 4px, transparent 4px, transparent 7px)` }} />
                                    </span>
                                    <span className="legend__text">双链路叠加</span>
                                </div>
                                <div className="legend__item" style={{ paddingLeft: 32, fontSize: 10, color: 'var(--text-muted)' }}>
                                    实线 = 主链路，虚线 = 备用链路
                                </div>
                            </div>

                            {/* 流量粒子 */}
                            <div className="legend__group">
                                <span className="legend__subtitle">流量动画</span>
                                <div className="legend__item">
                                    <span className="legend__particle" />
                                    <span className="legend__text">数据流量粒子</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </aside>
    );
}
