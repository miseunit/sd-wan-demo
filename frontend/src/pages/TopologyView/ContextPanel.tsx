/**
 * 右侧上下文面板组件
 * 点击节点/边后滑入显示设备详情、隧道信息、故障分析等
 */

import { useMemo } from "react";
import {
    deviceDetailMap,
    topologyEdges,
    policies,
    faults,
    ViewMode,
    DeviceType,
    TunnelStatus,
    DEVICE_COLORS,
    type DeviceDetail,
    type TunnelInfo,
    type PolicyInfo,
    type FaultInfo,
} from "./mockData";

interface ContextPanelProps {
    /** 选中的节点 ID */
    selectedNodeId: string | null;
    /** 选中的边 ID */
    selectedEdgeId: string | null;
    /** 当前视图模式 */
    viewMode: ViewMode;
    /** 关闭面板 */
    onClose: () => void;
    /** 固定/解除固定面板 */
    onPin: () => void;
    /** 面板是否固定 */
    pinned: boolean;
}

/** 设备类型中文映射 */
const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
    [DeviceType.HQ]: "总部 CPE",
    [DeviceType.VSMART]: "vSmart 控制器",
    [DeviceType.VBOND]: "vBond 编排器",
    [DeviceType.BRANCH]: "分支站点",
    [DeviceType.CLOUD_GW]: "云网关",
};

/** CPU/内存使用率颜色 */
function usageColor(value: number): string {
    if (value < 50) return "#00ff88";
    if (value < 75) return "#ffdd00";
    return "#ff4444";
}

/**
 * 右侧上下文面板
 */
export default function ContextPanel({
    selectedNodeId,
    selectedEdgeId,
    viewMode,
    onClose,
    onPin,
    pinned,
}: ContextPanelProps) {
    const visible = !!selectedNodeId || !!selectedEdgeId;

    const device = useMemo<DeviceDetail | null>(() => {
        if (!selectedNodeId) return null;
        return deviceDetailMap[selectedNodeId] || null;
    }, [selectedNodeId]);

    const edgeTunnel = useMemo<TunnelInfo | null>(() => {
        if (!selectedEdgeId) return null;
        const edge = topologyEdges.find((e) => e.id === selectedEdgeId);
        return (edge?.data?.tunnel as TunnelInfo) || null;
    }, [selectedEdgeId]);

    const edgeSourceLabel = useMemo(() => {
        if (!selectedEdgeId) return "";
        const edge = topologyEdges.find((e) => e.id === selectedEdgeId);
        if (!edge) return "";
        const src = deviceDetailMap[edge.source];
        return src?.label || edge.source;
    }, [selectedEdgeId]);

    const edgeTargetLabel = useMemo(() => {
        if (!selectedEdgeId) return "";
        const edge = topologyEdges.find((e) => e.id === selectedEdgeId);
        if (!edge) return "";
        const tgt = deviceDetailMap[edge.target];
        return tgt?.label || edge.target;
    }, [selectedEdgeId]);

    const nodePolicies = useMemo<PolicyInfo[]>(() => {
        if (!selectedNodeId) return [];
        return policies.filter((p) => p.appliedNodes.includes(selectedNodeId));
    }, [selectedNodeId]);

    const nodeFaults = useMemo<FaultInfo[]>(() => {
        if (!selectedNodeId) return [];
        return faults.filter((f) => f.nodeId === selectedNodeId);
    }, [selectedNodeId]);

    if (!visible) return null;

    return (
        <aside className="context-panel">
            {/* 面板头部 */}
            <div className="context-panel__header">
                <h3 className="context-panel__title">
                    {device ? device.label : edgeTunnel ? "隧道详情" : "详情"}
                </h3>
                <div className="context-panel__actions">
                    <button
                        className={`context-panel__pin-btn ${pinned ? "context-panel__pin-btn--active" : ""}`}
                        onClick={onPin}
                        title={pinned ? "解除固定" : "固定面板"}
                    >
                        📌
                    </button>
                    <button className="context-panel__close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>
            </div>

            {/* 面板内容（可滚动） */}
            <div className="context-panel__body">
                {/* ========== 设备详情 ========== */}
                {device && (
                    <>
                        {/* 设备基本信息 */}
                        <section className="detail-section">
                            <h4 className="detail-section__title">设备信息</h4>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-item__label">类型</span>
                                    <span
                                        className="info-item__value info-item__value--tag"
                                        style={{ color: DEVICE_COLORS[device.type] }}
                                    >
                                        {DEVICE_TYPE_LABELS[device.type]}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">型号</span>
                                    <span className="info-item__value">{device.model}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">版本</span>
                                    <span className="info-item__value">{device.version}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">站点 ID</span>
                                    <span className="info-item__value">{device.siteId}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">运行时间</span>
                                    <span className="info-item__value">{device.uptime}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">配置模板</span>
                                    <span className="info-item__value">{device.configTemplate}</span>
                                </div>
                            </div>
                        </section>

                        {/* CPU / 内存使用率 */}
                        <section className="detail-section">
                            <h4 className="detail-section__title">资源使用</h4>
                            <div className="usage-bars">
                                <div className="usage-bar">
                                    <div className="usage-bar__header">
                                        <span>CPU</span>
                                        <span style={{ color: usageColor(device.cpu) }}>{device.cpu}%</span>
                                    </div>
                                    <div className="usage-bar__track">
                                        <div
                                            className="usage-bar__fill"
                                            style={{
                                                width: `${device.cpu}%`,
                                                background: usageColor(device.cpu),
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="usage-bar">
                                    <div className="usage-bar__header">
                                        <span>内存</span>
                                        <span style={{ color: usageColor(device.memory) }}>
                                            {device.memory}%
                                        </span>
                                    </div>
                                    <div className="usage-bar__track">
                                        <div
                                            className="usage-bar__fill"
                                            style={{
                                                width: `${device.memory}%`,
                                                background: usageColor(device.memory),
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 接口状态 */}
                        <section className="detail-section">
                            <h4 className="detail-section__title">接口状态</h4>
                            <div className="interface-table">
                                <div className="interface-table__header">
                                    <span>名称</span>
                                    <span>IP 地址</span>
                                    <span>状态</span>
                                    <span>带宽</span>
                                </div>
                                {device.interfaces.map((iface) => (
                                    <div key={iface.name} className="interface-table__row">
                                        <span className="interface-table__name">{iface.name}</span>
                                        <span className="interface-table__ip">{iface.ip}</span>
                                        <span className="interface-table__status">
                                            <span
                                                className={`status-dot status-dot--${iface.status}`}
                                            />
                                            {iface.status === "up" ? "UP" : "DOWN"}
                                        </span>
                                        <span className="interface-table__bw">{iface.bandwidth}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 相关策略 */}
                        {nodePolicies.length > 0 && (
                            <section className="detail-section">
                                <h4 className="detail-section__title">生效策略</h4>
                                <div className="policy-list">
                                    {nodePolicies.map((policy) => (
                                        <div key={policy.id} className="policy-card">
                                            <div className="policy-card__header">
                                                <span
                                                    className={`policy-type-tag policy-type-tag--${policy.type}`}
                                                >
                                                    {policy.type === "route"
                                                        ? "路由"
                                                        : policy.type === "qos"
                                                        ? "QoS"
                                                        : "安全"}
                                                </span>
                                                <span className="policy-card__name">{policy.name}</span>
                                            </div>
                                            <p className="policy-card__desc">{policy.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 故障信息 */}
                        {nodeFaults.length > 0 && (
                            <section className="detail-section">
                                <h4 className="detail-section__title detail-section__title--danger">
                                    故障告警
                                </h4>
                                {nodeFaults.map((fault) => (
                                    <div
                                        key={fault.id}
                                        className={`fault-card fault-card--${fault.severity}`}
                                    >
                                        <div className="fault-card__header">
                                            <span
                                                className={`severity-badge severity-badge--${fault.severity}`}
                                            >
                                                {fault.severity === "critical"
                                                    ? "严重"
                                                    : fault.severity === "major"
                                                    ? "重要"
                                                    : "次要"}
                                            </span>
                                            <span className="fault-card__time">{fault.timestamp}</span>
                                        </div>
                                        <h5 className="fault-card__title">{fault.title}</h5>
                                        <div className="fault-card__detail">
                                            <p>
                                                <strong>根因：</strong>
                                                {fault.rootCause}
                                            </p>
                                            <p>
                                                <strong>影响：</strong>
                                                {fault.impact}
                                            </p>
                                            <p>
                                                <strong>建议：</strong>
                                                {fault.suggestion}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}
                    </>
                )}

                {/* ========== 隧道详情 ========== */}
                {edgeTunnel && (
                    <>
                        <section className="detail-section">
                            <h4 className="detail-section__title">隧道信息</h4>
                            <div className="tunnel-header">
                                <span className="tunnel-header__source">{edgeSourceLabel}</span>
                                <span className="tunnel-header__arrow">⟶</span>
                                <span className="tunnel-header__target">{edgeTargetLabel}</span>
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-item__label">状态</span>
                                    <span className="info-item__value info-item__value--tag">
                                        <span
                                            className={`status-dot status-dot--${
                                                edgeTunnel.status === TunnelStatus.ACTIVE
                                                    ? "active"
                                                    : edgeTunnel.status === TunnelStatus.STANDBY
                                                    ? "standby"
                                                    : "down"
                                            }`}
                                        />
                                        {edgeTunnel.status === TunnelStatus.ACTIVE
                                            ? "Active"
                                            : edgeTunnel.status === TunnelStatus.STANDBY
                                            ? "Standby"
                                            : "Down"}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">ISP</span>
                                    <span className="info-item__value">{edgeTunnel.isp}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-item__label">加密</span>
                                    <span className="info-item__value">
                                        {edgeTunnel.encrypted ? "🔒 IPsec" : "❌ 未加密"}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className="detail-section">
                            <h4 className="detail-section__title">性能指标</h4>
                            <div className="metric-grid">
                                <div className="metric-card">
                                    <span className="metric-card__value">{edgeTunnel.bandwidth}</span>
                                    <span className="metric-card__label">带宽</span>
                                </div>
                                <div className="metric-card">
                                    <span
                                        className="metric-card__value"
                                        style={{
                                            color:
                                                edgeTunnel.latency < 20
                                                    ? "#00ff88"
                                                    : edgeTunnel.latency < 50
                                                    ? "#ffdd00"
                                                    : "#ff4444",
                                        }}
                                    >
                                        {edgeTunnel.latency}ms
                                    </span>
                                    <span className="metric-card__label">延迟</span>
                                </div>
                                <div className="metric-card">
                                    <span
                                        className="metric-card__value"
                                        style={{
                                            color:
                                                edgeTunnel.jitter < 5
                                                    ? "#00ff88"
                                                    : edgeTunnel.jitter < 10
                                                    ? "#ffdd00"
                                                    : "#ff4444",
                                        }}
                                    >
                                        {edgeTunnel.jitter}ms
                                    </span>
                                    <span className="metric-card__label">抖动</span>
                                </div>
                                <div className="metric-card">
                                    <span
                                        className="metric-card__value"
                                        style={{
                                            color:
                                                edgeTunnel.packetLoss < 0.05
                                                    ? "#00ff88"
                                                    : edgeTunnel.packetLoss < 0.2
                                                    ? "#ffdd00"
                                                    : "#ff4444",
                                        }}
                                    >
                                        {edgeTunnel.packetLoss}%
                                    </span>
                                    <span className="metric-card__label">丢包率</span>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </aside>
    );
}
