/**
 * SD-WAN 拓扑画布组件
 * 基于 AntV G6 5.x 的网络拓扑可视化
 * 支持视图模式切换、节点/边交互、流量动画、故障闪烁
 */

import { useEffect, useRef, useCallback } from "react";
import { Graph } from "@antv/g6";
import {
    topologyNodes,
    topologyEdges,
    trafficFlows,
    faults,
    ViewMode,
    TunnelStatus,
    HealthStatus,
    HEALTH_COLORS,
} from "./mockData";
import type { NodeData, EdgeData } from "@antv/g6/lib/spec";

interface TopologyCanvasProps {
    /** 当前视图模式 */
    viewMode: ViewMode;
    /** 选中的应用流量 ID */
    selectedFlowId: string | null;
    /** 搜索关键词 */
    searchQuery: string;
    /** 节点点击回调 */
    onNodeClick: (nodeId: string) => void;
    /** 边点击回调 */
    onEdgeClick: (edgeId: string) => void;
    /** 容器宽度 */
    width: number;
    /** 容器高度 */
    height: number;
}

/** 保存布局的 localStorage key */
const SAVED_LAYOUT_KEY = "sdwan-topology-layout";

/** 每条边的粒子数量 */
const PARTICLE_COUNT_PER_EDGE = 4;
const PARTICLE_COUNT_STANDBY = 2;

/** 动画帧 ID */
let particleAnimId: number | null = null;

/** 从 localStorage 加载保存的节点位置 */
function loadSavedPositions(): Record<string, { x: number; y: number }> {
    try {
        const raw = localStorage.getItem(SAVED_LAYOUT_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

/** 保存单个节点位置到 localStorage */
function saveNodePosition(nodeId: string, x: number, y: number) {
    try {
        const saved = loadSavedPositions();
        saved[nodeId] = { x, y };
        localStorage.setItem(SAVED_LAYOUT_KEY, JSON.stringify(saved));
    } catch {
        // 存储不可用时静默失败
    }
}

/** 将保存的位置应用到节点数据 */
function applySavedPositions(nodes: typeof topologyNodes) {
    const saved = loadSavedPositions();
    return nodes.map((n) => {
        const pos = saved[n.id];
        if (pos) {
            return {
                ...n,
                style: { ...n.style, x: pos.x, y: pos.y },
            };
        }
        return n;
    });
}

/** 从 style 中排除位置属性，避免 updateData 时重置节点位置 */
function styleWithoutPosition(style: Record<string, unknown>) {
    const { x, y, ...rest } = style;
    return rest;
}

/** 获取边的健康颜色 */
function getEdgeHealthColor(edge: (typeof topologyEdges)[0]): string {
    const tunnel = edge.data?.tunnel as { health: HealthStatus } | undefined;
    if (!tunnel) return HEALTH_COLORS[HealthStatus.GOOD];
    return HEALTH_COLORS[tunnel.health] || HEALTH_COLORS[HealthStatus.GOOD];
}

/** 粒子数据 */
interface Particle {
    edgeId: string;
    position: number;
    direction: number;
    speed: number;
    size: number;
    alpha: number;
    color: string;
}

/**
 * 拓扑画布组件
 */
export default function TopologyCanvas({
    viewMode,
    selectedFlowId,
    searchQuery,
    onNodeClick,
    onEdgeClick,
    width,
    height,
}: TopologyCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);
    const particleCanvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);

    /** 初始化粒子数据 */
    const initParticles = useCallback(() => {
        const particles: Particle[] = [];
        topologyEdges.forEach((edge) => {
            // 故障边不生成粒子
            if (edge.data?.isDown) return;
            const count = edge.data?.isStandby
                ? PARTICLE_COUNT_STANDBY
                : PARTICLE_COUNT_PER_EDGE;
            const color = getEdgeHealthColor(edge);
            for (let i = 0; i < count; i++) {
                particles.push({
                    edgeId: edge.id,
                    position: Math.random(),
                    direction: i < count / 2 ? 1 : -1,
                    speed: 0.002 + Math.random() * 0.008,
                    size: 2 + Math.random() * 2,
                    alpha: 0.5 + Math.random() * 0.5,
                    color,
                });
            }
        });
        particlesRef.current = particles;
    }, []);

    /** 将图坐标转换为画布像素坐标 */
    const graphToCanvas = useCallback(
        (graph: Graph, gx: number, gy: number): { x: number; y: number } => {
            const zoom = graph.getZoom();
            const canvasCenter = graph.getCanvasCenter();
            const viewportCenter = graph.getViewportCenter();
            return {
                x: (gx - viewportCenter[0]) * zoom + canvasCenter[0],
                y: (gy - viewportCenter[1]) * zoom + canvasCenter[1],
            };
        },
        []
    );

    /** 启动粒子动画循环 */
    const startParticleAnimation = useCallback(() => {
        if (particleAnimId) cancelAnimationFrame(particleAnimId);

        const animate = () => {
            const canvas = particleCanvasRef.current;
            const graph = graphRef.current;
            if (!canvas || !graph) {
                particleAnimId = requestAnimationFrame(animate);
                return;
            }

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                particleAnimId = requestAnimationFrame(animate);
                return;
            }

            // 同步 overlay canvas 尺寸
            if (canvas.width !== width * 2 || canvas.height !== height * 2) {
                canvas.width = width * 2;
                canvas.height = height * 2;
                ctx.scale(2, 2);
            }

            ctx.clearRect(0, 0, width, height);

            // 更新粒子位置
            for (const p of particlesRef.current) {
                p.position += p.speed * p.direction;
                // 到达端点后重置到另一端，实现单向流动
                if (p.position > 1) {
                    p.position = 0;
                } else if (p.position < 0) {
                    p.position = 1;
                }
            }

            // 绘制粒子
            for (const p of particlesRef.current) {
                const edge = topologyEdges.find((e) => e.id === p.edgeId);
                if (!edge) continue;

                // 应用流量视图下，非选中路径的粒子变暗
                if (
                    viewMode === ViewMode.APP_FLOW &&
                    selectedFlowId
                ) {
                    const flow = trafficFlows.find(
                        (f) => f.id === selectedFlowId
                    );
                    const path = flow?.path || [];
                    const isOnPath =
                        path.includes(edge.source) &&
                        path.includes(edge.target);
                    if (!isOnPath) continue; // 不在路径上的边跳过绘制
                }

                const srcData = graph.getNodeData(edge.source);
                const tgtData = graph.getNodeData(edge.target);
                if (!srcData?.style || !tgtData?.style) continue;

                const srcX = srcData.style.x as number;
                const srcY = srcData.style.y as number;
                const tgtX = tgtData.style.x as number;
                const tgtY = tgtData.style.y as number;

                // 转换图坐标到画布像素坐标
                const src = graphToCanvas(graph, srcX, srcY);
                const tgt = graphToCanvas(graph, tgtX, tgtY);

                // 根据节点渲染尺寸计算"触碰边界"的 position 阈值
                const zoom = graph.getZoom();
                const srcSize = ((srcData.style.size as number) || 40) * zoom * 0.5;
                const tgtSize = ((tgtData.style.size as number) || 40) * zoom * 0.5;
                const edgeLen = Math.hypot(tgt.x - src.x, tgt.y - src.y) || 1;
                const srcFade = srcSize / edgeLen;
                const tgtFade = tgtSize / edgeLen;

                const x = src.x + (tgt.x - src.x) * p.position;
                const y = src.y + (tgt.y - src.y) * p.position;

                // 接触节点边界即淡出
                const edgeAlpha =
                    p.position < srcFade
                        ? p.position / srcFade
                        : p.position > 1 - tgtFade
                        ? (1 - p.position) / tgtFade
                        : 1;
                const drawAlpha = p.alpha * edgeAlpha;
                if (drawAlpha < 0.01) continue; // 完全透明时跳过绘制

                // 光晕
                const glow = ctx.createRadialGradient(
                    x, y, 0,
                    x, y, p.size * 3
                );
                glow.addColorStop(0, p.color);
                glow.addColorStop(0.4, `${p.color}80`);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
                ctx.fill();

                // 核心亮点
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                ctx.beginPath();
                ctx.arc(x, y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();

                // 主体
                ctx.globalAlpha = drawAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            particleAnimId = requestAnimationFrame(animate);
        };

        particleAnimId = requestAnimationFrame(animate);
    }, [width, height, viewMode, selectedFlowId, graphToCanvas]);

    /** 初始化 G6 图 */
    const initGraph = useCallback(() => {
        if (!containerRef.current) return;

        // 清理旧图
        if (graphRef.current) {
            graphRef.current.destroy();
            graphRef.current = null;
        }

        const graph = new Graph({
            container: containerRef.current,
            width,
            height,
            theme: "dark",
            background: "transparent",
            autoFit: "view",
            padding: [60, 60, 60, 60],
            node: {
                style: {
                    halo: false,
                    labelPlacement: "bottom",
                    // 文字描边：深色外轮廓让浅色标签在任何背景上都清晰可读
                    labelStroke: "rgba(6, 11, 26, 0.9)",
                    labelLineWidth: 3,
                },
                state: {
                    hover: {
                        lineWidth: 4,
                        shadowBlur: 25,
                    },
                    selected: {
                        lineWidth: 4,
                        shadowBlur: 30,
                    },
                    fault: {
                        stroke: "#ff4444",
                        shadowColor: "#ff4444",
                        shadowBlur: 25,
                    },
                },
            },
            edge: {
                style: {
                    endArrowSize: 8,
                    labelStroke: "rgba(6, 11, 26, 0.85)",
                    labelLineWidth: 2,
                },
                state: {
                    hover: {
                        lineWidth: 3,
                        shadowBlur: 10,
                    },
                    selected: {
                        lineWidth: 3,
                    },
                },
            },
            behaviors: [
                { type: "drag-canvas", key: "drag-canvas" },
                { type: "zoom-canvas", key: "zoom-canvas", sensitivity: 1.2 },
                { type: "click-select", key: "click-select", multiple: true },
                { type: "hover-activate", key: "hover-activate", degree: 1 },
                { type: "drag-element", key: "drag-element" },
            ],
            plugins: [
                {
                    key: "minimap",
                    type: "minimap",
                    size: [180, 120],
                },
            ],
        });

        // 加载数据（应用保存的布局）
        graph.setData({
            nodes: applySavedPositions(topologyNodes) as NodeData[],
            edges: topologyEdges as EdgeData[],
        });
        graph.render();

        // 绑定事件
        // G6 运行时事件有 target.id，但类型定义不精确，用 any 绕过
        graph.on("node:click", (evt: any) => {
            onNodeClick(evt.target.id);
        });

        graph.on("edge:click", (evt: any) => {
            onEdgeClick(evt.target.id);
        });

        // 节点拖拽结束 → 保存布局
        graph.on("node:dragend", (evt: any) => {
            const nodeId = evt.target.id;
            const data = graph.getNodeData(nodeId);
            if (data?.style && data.style.x != null && data.style.y != null) {
                saveNodePosition(nodeId, data.style.x, data.style.y);
            }
        });

        graphRef.current = graph;

        // 初始化粒子并启动动画
        initParticles();
        startParticleAnimation();
    }, [
        width,
        height,
        onNodeClick,
        onEdgeClick,
        initParticles,
        startParticleAnimation,
    ]);

    /** 根据视图模式更新图样式 */
    const applyViewMode = useCallback(
        (mode: ViewMode, flowId: string | null) => {
            const graph = graphRef.current;
            if (!graph) return;

            const nodeData = topologyNodes.map((n) => {
                const node: Record<string, unknown> = { id: n.id };
                const isFaultNode =
                    mode === ViewMode.FAULT &&
                    faults.some((f) => f.nodeId === n.id);
                const isFlowNode =
                    mode === ViewMode.APP_FLOW &&
                    flowId &&
                    trafficFlows
                        .find((f) => f.id === flowId)
                        ?.path.includes(n.id);

                // 故障节点闪烁
                if (isFaultNode) {
                    node.states = ["fault"];
                } else {
                    node.states = [];
                }

                // 应用流量视图 - 高亮路径节点
                if (mode === ViewMode.APP_FLOW && flowId) {
                    if (isFlowNode) {
                        node.style = {
                            ...styleWithoutPosition(n.style),
                            shadowBlur: 35,
                        };
                    } else {
                        node.style = {
                            ...styleWithoutPosition(n.style),
                            opacity: 0.3,
                        };
                    }
                } else if (mode === ViewMode.FAULT) {
                    if (isFaultNode) {
                        node.style = {
                            ...styleWithoutPosition(n.style),
                            shadowBlur: 30,
                        };
                    } else {
                        node.style = {
                            ...styleWithoutPosition(n.style),
                            opacity: 0.4,
                        };
                    }
                } else {
                    // 标准视图恢复原样
                    node.style = {
                        ...styleWithoutPosition(n.style),
                        opacity: 1,
                    };
                }

                return node;
            });

            const edgeData = topologyEdges.map((e) => {
                const edge: Record<string, unknown> = {
                    id: e.id,
                    source: e.source,
                    target: e.target,
                };
                const tunnel = e.data?.tunnel as
                    | { status: TunnelStatus; health: HealthStatus }
                    | undefined;

                if (mode === ViewMode.APP_FLOW && flowId) {
                    const flow = trafficFlows.find((f) => f.id === flowId);
                    const path = flow?.path || [];
                    const isOnPath =
                        path.includes(e.source) && path.includes(e.target);

                    if (isOnPath) {
                        edge.style = {
                            ...e.style,
                            lineWidth: 4,
                            stroke: flow?.color || "#00ff88",
                            opacity: 1,
                        };
                    } else {
                        edge.style = {
                            ...e.style,
                            opacity: 0.15,
                        };
                    }
                } else if (mode === ViewMode.FAULT) {
                    if (tunnel?.status === TunnelStatus.DOWN) {
                        edge.style = {
                            ...e.style,
                            lineWidth: 3,
                            stroke: "#ff4444",
                            opacity: 1,
                        };
                    } else {
                        edge.style = {
                            ...e.style,
                            opacity: 0.25,
                        };
                    }
                } else if (mode === ViewMode.POLICY) {
                    edge.style = { ...e.style, opacity: 0.6 };
                } else {
                    edge.style = { ...e.style, opacity: 1 };
                }

                return edge;
            });

            graph.updateData({
                nodes: nodeData as any,
                edges: edgeData as any,
            });
        },
        []
    );

    /** 搜索节点并居中 */
    const focusNode = useCallback(
        (query: string) => {
            const graph = graphRef.current;
            if (!graph || !query.trim()) {
                // 清空搜索 → 恢复所有节点透明度
                if (graph && query === "") {
                    applyViewMode(viewMode, selectedFlowId);
                }
                return;
            }

            const q = query.toLowerCase();
            const matchNode = topologyNodes.find(
                (n) =>
                    n.id.toLowerCase().includes(q) ||
                    (n.data?.label as string)?.toLowerCase().includes(q) ||
                    (n.data?.deviceType as string)?.toLowerCase().includes(q)
            );

            if (matchNode) {
                // 高亮匹配节点，暗化其他
                const nodeData = topologyNodes.map((n) => ({
                    id: n.id,
                    style: {
                        ...styleWithoutPosition(n.style),
                        opacity: n.id === matchNode.id ? 1 : 0.2,
                        shadowBlur: n.id === matchNode.id ? 30 : 0,
                    },
                }));
                const edgeData = topologyEdges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    style: {
                        ...e.style,
                        opacity:
                            e.source === matchNode.id ||
                            e.target === matchNode.id
                                ? 1
                                : 0.1,
                    },
                }));

                graph.updateData({
                    nodes: nodeData as any,
                    edges: edgeData as any,
                });

                // 居中到匹配节点
                graph.focusElement(matchNode.id, {
                    easing: "ease-cubic",
                    duration: 500,
                });
            }
        },
        [viewMode, selectedFlowId, applyViewMode]
    );

    /** 初始化图 */
    useEffect(() => {
        initGraph();
        return () => {
            if (graphRef.current) {
                graphRef.current.destroy();
                graphRef.current = null;
            }
            if (particleAnimId) {
                cancelAnimationFrame(particleAnimId);
                particleAnimId = null;
            }
        };
    }, [initGraph]);

    /** 视图模式变化 */
    useEffect(() => {
        applyViewMode(viewMode, selectedFlowId);
    }, [viewMode, selectedFlowId, applyViewMode]);

    /** 搜索变化 */
    useEffect(() => {
        if (searchQuery) {
            focusNode(searchQuery);
        } else {
            applyViewMode(viewMode, selectedFlowId);
        }
    }, [searchQuery, focusNode, viewMode, selectedFlowId, applyViewMode]);

    /** 窗口大小变化 */
    useEffect(() => {
        const graph = graphRef.current;
        if (graph) {
            graph.resize(width, height);
        }
    }, [width, height]);

    return (
        <div
            ref={containerRef}
            className="topology-canvas"
            style={{ width, height, position: "relative" }}
        >
            {/* 粒子动画覆盖层 */}
            <canvas
                ref={particleCanvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width,
                    height,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            />
        </div>
    );
}
