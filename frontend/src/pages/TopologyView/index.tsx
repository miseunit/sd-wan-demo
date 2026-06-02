/**
 * SD-WAN 拓扑视图 - 主页面
 * 全屏大屏布局：左侧控制栏 + 中央拓扑画布 + 右侧上下文面板
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import TopologyCanvas from "./TopologyCanvas";
import ControlBar from "./ControlBar";
import ContextPanel from "./ContextPanel";
import { ViewMode } from "./mockData";
import useFullscreen from "../../hooks/useFullscreen";

/** 控制栏默认宽度 */
const CONTROL_BAR_WIDTH = 280;
/** 控制栏折叠宽度 */
const CONTROL_BAR_COLLAPSED_WIDTH = 40;
/** 上下文面板宽度 */
const CONTEXT_PANEL_WIDTH = 360;

/**
 * 拓扑视图主页面
 */
export default function TopologyView() {
    /* ---------- 状态 ---------- */
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.STANDARD);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [panelPinned, setPanelPinned] = useState(false);
    const [controlBarCollapsed, setControlBarCollapsed] = useState(false);

    /* ---------- 全屏 ---------- */
    const pageRef = useRef<HTMLDivElement>(null);
    const { isFullscreen, toggleFullscreen } = useFullscreen(pageRef);

    /* ---------- 尺寸计算 ---------- */
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateSize = () => {
            if (canvasWrapperRef.current) {
                setCanvasSize({
                    width: canvasWrapperRef.current.clientWidth,
                    height: canvasWrapperRef.current.clientHeight,
                });
            }
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    /* ---------- 回调 ---------- */

    /** 节点点击 */
    const handleNodeClick = useCallback(
        (nodeId: string) => {
            if (selectedNodeId === nodeId && !panelPinned) {
                // 再次点击同一节点且未固定 → 取消选中
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
            } else {
                setSelectedNodeId(nodeId);
                setSelectedEdgeId(null);
            }
        },
        [selectedNodeId, panelPinned]
    );

    /** 边点击 */
    const handleEdgeClick = useCallback(
        (edgeId: string) => {
            if (selectedEdgeId === edgeId && !panelPinned) {
                setSelectedEdgeId(null);
                setSelectedNodeId(null);
            } else {
                setSelectedEdgeId(edgeId);
                setSelectedNodeId(null);
            }
        },
        [selectedEdgeId, panelPinned]
    );

    /** 关闭面板 */
    const handleClosePanel = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, []);

    /** 固定面板 */
    const handlePinPanel = useCallback(() => {
        setPanelPinned((prev) => !prev);
    }, []);

    /** 视图模式变更 */
    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        setSelectedFlowId(null);
    }, []);

    /** 导出拓扑 */
    const handleExportTopology = useCallback(() => {
        // TODO: 实现拓扑导出（导出为 JSON 或 PNG）
        const data = {
            timestamp: new Date().toISOString(),
            message: "拓扑导出功能待实现",
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sdwan-topology-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    /** 模拟故障 */
    const handleSimulateFault = useCallback(() => {
        setViewMode(ViewMode.FAULT);
    }, []);

    /* ---------- 面板可见性 ---------- */
    const panelVisible = !!(selectedNodeId || selectedEdgeId) || panelPinned;

    return (
        <div className="topology-page" ref={pageRef}>
            {/* 顶部状态栏 */}
            <header className="topology-header">
                <div className="topology-header__left">
                    <span className="topology-header__logo">◆</span>
                    <h1 className="topology-header__title">SD-WAN Network Topology</h1>
                </div>
                <div className="topology-header__center">
                    <span className="topology-header__mode">
                        {viewMode === ViewMode.STANDARD && "🌐 标准视图"}
                        {viewMode === ViewMode.APP_FLOW && "📊 应用流量视图"}
                        {viewMode === ViewMode.POLICY && "📋 策略视图"}
                        {viewMode === ViewMode.FAULT && "⚠️ 故障分析视图"}
                    </span>
                </div>
                <div className="topology-header__right">
                    <button
                        className="fullscreen-btn"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "退出全屏" : "全屏显示"}
                    >
                        {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        {isFullscreen ? "退出全屏" : "全屏"}
                    </button>
                    <span className="topology-header__time">
                        {new Date().toLocaleString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })}
                    </span>
                    <span className="topology-header__status topology-header__status--live">
                        ● LIVE
                    </span>
                </div>
            </header>

            {/* 主体区域 */}
            <main className="topology-main">
                {/* 左侧控制栏 */}
                <ControlBar
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedFlowId={selectedFlowId}
                    onFlowSelect={setSelectedFlowId}
                    onSimulateFault={handleSimulateFault}
                    onExportTopology={handleExportTopology}
                />

                {/* 中央拓扑画布 */}
                <div className="topology-canvas-wrapper" ref={canvasWrapperRef}>
                    <TopologyCanvas
                        viewMode={viewMode}
                        selectedFlowId={selectedFlowId}
                        searchQuery={searchQuery}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        width={canvasSize.width}
                        height={canvasSize.height}
                    />

                    {/* 策略视图叠加层 */}
                    {viewMode === ViewMode.POLICY && (
                        <div className="policy-overlay">
                            <div className="policy-overlay__item policy-overlay__item--route">
                                🛤️ 全局路由策略：默认 HQ 集中出口
                            </div>
                            <div className="policy-overlay__item policy-overlay__item--qos">
                                ⚡ QoS：视频会议流量优先
                            </div>
                            <div className="policy-overlay__item policy-overlay__item--security">
                                🛡️ 安全：互联网流量经 Cloud GW DPI
                            </div>
                        </div>
                    )}

                    {/* 故障视图叠加层 */}
                    {viewMode === ViewMode.FAULT && (
                        <div className="fault-overlay">
                            <div className="fault-banner fault-banner--critical">
                                🚨 CRITICAL: 成都分支 ISP 链路质量劣化 — 延迟 &gt; 50ms
                            </div>
                            <div className="fault-banner fault-banner--major">
                                ⚠️ MAJOR: 北京分支 Internet 链路波动 — 延迟 35ms
                            </div>
                            <div className="fault-banner fault-banner--critical">
                                🚨 CRITICAL: 北京↔成都 Mesh 隧道中断 — P2P 不可达
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧上下文面板 */}
                {panelVisible && (
                    <ContextPanel
                        selectedNodeId={selectedNodeId}
                        selectedEdgeId={selectedEdgeId}
                        viewMode={viewMode}
                        onClose={handleClosePanel}
                        onPin={handlePinPanel}
                        pinned={panelPinned}
                    />
                )}
            </main>
        </div>
    );
}
