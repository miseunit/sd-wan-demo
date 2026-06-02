/**
 * SD-WAN 拓扑视图 - 模拟数据
 * 包含设备节点、隧道链路、设备详情、策略数据、流量路径等
 */

/** 设备类型 */
export enum DeviceType {
    /** 总部 CPE */
    HQ = "hq",
    /** vSmart 控制器 */
    VSMART = "vsmart",
    /** vBond 编排器 */
    VBOND = "vbond",
    /** 分支站点 */
    BRANCH = "branch",
    /** 云网关 */
    CLOUD_GW = "cloud-gw",
}

/** 隧道状态 */
export enum TunnelStatus {
    /** 活跃 */
    ACTIVE = "active",
    /** 备用 */
    STANDBY = "standby",
    /** 故障 */
    DOWN = "down",
}

/** 健康状态 */
export enum HealthStatus {
    /** 正常 */
    GOOD = "good",
    /** 告警 */
    WARNING = "warning",
    /** 严重 */
    CRITICAL = "critical",
}

/** 视图模式 */
export enum ViewMode {
    /** 标准视图 */
    STANDARD = "standard",
    /** 应用流量视图 */
    APP_FLOW = "app-flow",
    /** 策略视图 */
    POLICY = "policy",
    /** 故障视图 */
    FAULT = "fault",
}

/** 接口信息 */
export interface InterfaceInfo {
    name: string;
    ip: string;
    status: "up" | "down";
    bandwidth: string;
    description: string;
}

/** 设备详情 */
export interface DeviceDetail {
    id: string;
    label: string;
    type: DeviceType;
    model: string;
    version: string;
    cpu: number;
    memory: number;
    uptime: string;
    interfaces: InterfaceInfo[];
    configTemplate: string;
    siteId: string;
}

/** 隧道信息 */
export interface TunnelInfo {
    bandwidth: string;
    latency: number;
    jitter: number;
    packetLoss: number;
    encrypted: boolean;
    status: TunnelStatus;
    health: HealthStatus;
    isp: string;
}

/** 策略信息 */
export interface PolicyInfo {
    id: string;
    name: string;
    type: "route" | "qos" | "security";
    description: string;
    appliedNodes: string[];
}

/** 应用流量路径 */
export interface TrafficFlowPath {
    id: string;
    appName: string;
    path: string[];
    bandwidth: string;
    qosPolicy: string;
    color: string;
}

/* ============================================================
 *  颜色常量
 * ============================================================ */

/** 隧道健康颜色映射 */
export const HEALTH_COLORS = {
    [HealthStatus.GOOD]: "#00ff88",
    [HealthStatus.WARNING]: "#ffdd00",
    [HealthStatus.CRITICAL]: "#ff4444",
} as const;

/** 设备类型颜色映射 */
export const DEVICE_COLORS = {
    [DeviceType.HQ]: "#00b4d8",
    [DeviceType.VSMART]: "#00fff5",
    [DeviceType.VBOND]: "#ffd700",
    [DeviceType.BRANCH]: "#9d4edd",
    [DeviceType.CLOUD_GW]: "#c8d6e5",
} as const;

/* ============================================================
 *  G6 拓扑节点数据
 * ============================================================ */

export const topologyNodes = [
    {
        id: "aws-cloud",
        type: "ellipse",
        style: {
            x: 700,
            y: 60,
            size: [100, 50],
            fill: "rgba(200, 214, 229, 0.15)",
            stroke: DEVICE_COLORS[DeviceType.CLOUD_GW],
            lineWidth: 2.5,
            labelText: "☁ AWS Cloud GW",
            labelFill: "#e8eff5",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.CLOUD_GW],
            shadowBlur: 20,
        },
        data: {
            deviceType: DeviceType.CLOUD_GW,
            label: "AWS Cloud GW",
        },
    },
    {
        id: "azure-cloud",
        type: "ellipse",
        style: {
            x: 950,
            y: 60,
            size: [100, 50],
            fill: "rgba(200, 214, 229, 0.15)",
            stroke: DEVICE_COLORS[DeviceType.CLOUD_GW],
            lineWidth: 2.5,
            labelText: "☁ Azure Cloud GW",
            labelFill: "#e8eff5",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.CLOUD_GW],
            shadowBlur: 20,
        },
        data: {
            deviceType: DeviceType.CLOUD_GW,
            label: "Azure Cloud GW",
        },
    },
    {
        id: "v-bond",
        type: "diamond",
        style: {
            x: 700,
            y: 200,
            size: 48,
            fill: "rgba(255, 215, 0, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.VBOND],
            lineWidth: 2.5,
            labelText: "vBond 编排器",
            labelFill: DEVICE_COLORS[DeviceType.VBOND],
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 12,
            shadowColor: DEVICE_COLORS[DeviceType.VBOND],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.VBOND,
            label: "vBond 编排器",
        },
    },
    {
        id: "hq-cpe",
        type: "hexagon",
        style: {
            x: 700,
            y: 400,
            size: 65,
            fill: "rgba(0, 180, 216, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.HQ],
            lineWidth: 3,
            labelText: "总部 HQ-CPE",
            labelFill: "#ffffff",
            labelFontSize: 14,
            labelFontWeight: 700,
            labelPlacement: "bottom" as const,
            labelOffsetY: 14,
            shadowColor: DEVICE_COLORS[DeviceType.HQ],
            shadowBlur: 28,
        },
        data: {
            deviceType: DeviceType.HQ,
            label: "总部 HQ-CPE",
        },
    },
    {
        id: "v-smart",
        type: "rect",
        style: {
            x: 700,
            y: 560,
            size: [95, 42],
            fill: "rgba(0, 255, 245, 0.1)",
            stroke: DEVICE_COLORS[DeviceType.VSMART],
            lineWidth: 2.5,
            labelText: "vSmart 控制器",
            labelFill: DEVICE_COLORS[DeviceType.VSMART],
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 12,
            shadowColor: DEVICE_COLORS[DeviceType.VSMART],
            shadowBlur: 20,
            radius: 8,
        },
        data: {
            deviceType: DeviceType.VSMART,
            label: "vSmart 控制器",
        },
    },
    {
        id: "branch-shanghai",
        type: "circle",
        style: {
            x: 250,
            y: 350,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "上海分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "上海分支",
        },
    },
    {
        id: "branch-beijing",
        type: "circle",
        style: {
            x: 1150,
            y: 350,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "北京分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "北京分支",
        },
    },
    {
        id: "branch-guangzhou",
        type: "circle",
        style: {
            x: 250,
            y: 550,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "广州分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "广州分支",
        },
    },
    {
        id: "branch-shenzhen",
        type: "circle",
        style: {
            x: 500,
            y: 700,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "深圳分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "深圳分支",
        },
    },
    {
        id: "branch-chengdu",
        type: "circle",
        style: {
            x: 950,
            y: 700,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "成都分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "成都分支",
        },
    },
    {
        id: "branch-wuhan",
        type: "circle",
        style: {
            x: 1150,
            y: 580,
            size: 46,
            fill: "rgba(157, 78, 221, 0.12)",
            stroke: DEVICE_COLORS[DeviceType.BRANCH],
            lineWidth: 2.5,
            labelText: "武汉分支",
            labelFill: "#e0d0f0",
            labelFontSize: 12,
            labelFontWeight: 600,
            labelPlacement: "bottom" as const,
            labelOffsetY: 10,
            shadowColor: DEVICE_COLORS[DeviceType.BRANCH],
            shadowBlur: 18,
        },
        data: {
            deviceType: DeviceType.BRANCH,
            label: "武汉分支",
        },
    },
];

/* ============================================================
 *  G6 拓扑边数据（隧道）
 * ============================================================ */

/** 生成边标签文本 */
function tunnelLabel(tunnel: TunnelInfo): string {
    const statusIcon = tunnel.encrypted ? "🔒" : "";
    return `${statusIcon} ${tunnel.bandwidth} | ${tunnel.latency}ms`;
}

/** 生成边样式 */
function tunnelEdgeStyle(tunnel: TunnelInfo) {
    const color = HEALTH_COLORS[tunnel.health];
    const base: Record<string, unknown> = {
        stroke: color,
        lineWidth: tunnel.status === TunnelStatus.STANDBY ? 1.5 : 2,
        lineDash: tunnel.status === TunnelStatus.STANDBY ? [8, 4] : tunnel.status === TunnelStatus.DOWN ? [4, 4] : [],
        endArrow: tunnel.status !== TunnelStatus.DOWN,
        labelText: tunnelLabel(tunnel),
        labelFill: color,
        labelFontSize: 10,
        labelBackground: true,
        labelBackgroundFill: "rgba(10, 14, 39, 0.85)",
        labelBackgroundOpacity: 0.9,
        labelPadding: [4, 8],
        labelBackgroundRadius: 4,
    };
    return base;
}

/** 活跃隧道数据 */
const tunnels: Array<{ id: string; source: string; target: string; tunnel: TunnelInfo }> = [
    { id: "t-cloud-1", source: "aws-cloud", target: "v-bond", tunnel: { bandwidth: "200 Mbps", latency: 8, jitter: 1, packetLoss: 0, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "AWS Direct Connect" } },
    { id: "t-cloud-2", source: "azure-cloud", target: "v-bond", tunnel: { bandwidth: "200 Mbps", latency: 15, jitter: 3, packetLoss: 0.01, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "Azure ExpressRoute" } },
    { id: "t-vbond-hq", source: "v-bond", target: "hq-cpe", tunnel: { bandwidth: "1 Gbps", latency: 1, jitter: 0.5, packetLoss: 0, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "专线" } },
    { id: "t-vbond-vsmart", source: "v-bond", target: "v-smart", tunnel: { bandwidth: "500 Mbps", latency: 2, jitter: 0.5, packetLoss: 0, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "管理通道" } },
    { id: "t-hq-sh", source: "hq-cpe", target: "branch-shanghai", tunnel: { bandwidth: "100 Mbps", latency: 12, jitter: 2, packetLoss: 0.01, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "中国电信 MPLS" } },
    { id: "t-hq-sh-backup", source: "hq-cpe", target: "branch-shanghai", tunnel: { bandwidth: "50 Mbps", latency: 25, jitter: 5, packetLoss: 0.05, encrypted: true, status: TunnelStatus.STANDBY, health: HealthStatus.WARNING, isp: "中国联通 5G" } },
    { id: "t-hq-bj", source: "hq-cpe", target: "branch-beijing", tunnel: { bandwidth: "100 Mbps", latency: 35, jitter: 8, packetLoss: 0.15, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.WARNING, isp: "中国电信 Internet" } },
    { id: "t-hq-bj-backup", source: "hq-cpe", target: "branch-beijing", tunnel: { bandwidth: "50 Mbps", latency: 45, jitter: 10, packetLoss: 0.2, encrypted: true, status: TunnelStatus.STANDBY, health: HealthStatus.CRITICAL, isp: "中国移动 5G" } },
    { id: "t-hq-gz", source: "hq-cpe", target: "branch-guangzhou", tunnel: { bandwidth: "100 Mbps", latency: 15, jitter: 1, packetLoss: 0, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "中国电信 MPLS" } },
    { id: "t-vs-sz", source: "v-smart", target: "branch-shenzhen", tunnel: { bandwidth: "80 Mbps", latency: 18, jitter: 3, packetLoss: 0.02, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "中国联通 MPLS" } },
    { id: "t-vs-sz-backup", source: "v-smart", target: "branch-shenzhen", tunnel: { bandwidth: "40 Mbps", latency: 30, jitter: 6, packetLoss: 0.08, encrypted: true, status: TunnelStatus.STANDBY, health: HealthStatus.WARNING, isp: "电信 5G" } },
    { id: "t-vs-cd", source: "v-smart", target: "branch-chengdu", tunnel: { bandwidth: "80 Mbps", latency: 50, jitter: 12, packetLoss: 0.3, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.CRITICAL, isp: "中国移动 Internet" } },
    { id: "t-vs-wh", source: "v-smart", target: "branch-wuhan", tunnel: { bandwidth: "80 Mbps", latency: 22, jitter: 2, packetLoss: 0, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "中国电信 MPLS" } },
    /* 分支间 mesh 隧道 */
    { id: "t-sh-gz", source: "branch-shanghai", target: "branch-guangzhou", tunnel: { bandwidth: "30 Mbps", latency: 20, jitter: 2, packetLoss: 0.01, encrypted: true, status: TunnelStatus.ACTIVE, health: HealthStatus.GOOD, isp: "P2P Overlay" } },
    { id: "t-bj-cd", source: "branch-beijing", target: "branch-chengdu", tunnel: { bandwidth: "30 Mbps", latency: 60, jitter: 15, packetLoss: 0.4, encrypted: true, status: TunnelStatus.DOWN, health: HealthStatus.CRITICAL, isp: "P2P Overlay" } },
];

export const topologyEdges = tunnels.map((t) => ({
    id: t.id,
    source: t.source,
    target: t.target,
    type: "line",
    style: tunnelEdgeStyle(t.tunnel),
    data: {
        tunnel: t.tunnel,
        isStandby: t.tunnel.status === TunnelStatus.STANDBY,
        isDown: t.tunnel.status === TunnelStatus.DOWN,
    },
}));

/* ============================================================
 *  设备详情数据
 * ============================================================ */

export const deviceDetailMap: Record<string, DeviceDetail> = {
    "aws-cloud": {
        id: "aws-cloud", label: "AWS Cloud GW", type: DeviceType.CLOUD_GW,
        model: "vEdge-Cloud-AWS", version: "vEdge-17.6.3",
        cpu: 32, memory: 58, uptime: "45d 12h 30m",
        interfaces: [
            { name: "GE0/0", ip: "10.1.0.1/30", status: "up", bandwidth: "1 Gbps", description: "WAN - AWS Direct Connect" },
            { name: "GE0/1", ip: "172.16.0.1/30", status: "up", bandwidth: "1 Gbps", description: "Overlay - to vBond" },
        ],
        configTemplate: "Cloud-GW-AWS-v2", siteId: "SITE-100",
    },
    "azure-cloud": {
        id: "azure-cloud", label: "Azure Cloud GW", type: DeviceType.CLOUD_GW,
        model: "vEdge-Cloud-Azure", version: "vEdge-17.6.3",
        cpu: 28, memory: 52, uptime: "30d 8h 15m",
        interfaces: [
            { name: "GE0/0", ip: "10.2.0.1/30", status: "up", bandwidth: "1 Gbps", description: "WAN - Azure ExpressRoute" },
            { name: "GE0/1", ip: "172.16.1.1/30", status: "up", bandwidth: "1 Gbps", description: "Overlay - to vBond" },
        ],
        configTemplate: "Cloud-GW-Azure-v2", siteId: "SITE-101",
    },
    "v-bond": {
        id: "v-bond", label: "vBond 编排器", type: DeviceType.VBOND,
        model: "vBond-1000", version: "vManage-17.6.3",
        cpu: 18, memory: 40, uptime: "90d 2h 45m",
        interfaces: [
            { name: "GE0/0", ip: "10.0.0.1/24", status: "up", bandwidth: "10 Gbps", description: "Mgmt - vManage" },
            { name: "GE0/1", ip: "172.16.0.2/30", status: "up", bandwidth: "1 Gbps", description: "WAN - ISP-A" },
        ],
        configTemplate: "vBond-Standard-v3", siteId: "SITE-001",
    },
    "hq-cpe": {
        id: "hq-cpe", label: "总部 HQ-CPE", type: DeviceType.HQ,
        model: "vEdge-1000", version: "vEdge-17.6.3",
        cpu: 45, memory: 62, uptime: "120d 5h 20m",
        interfaces: [
            { name: "GE0/0", ip: "10.10.0.1/24", status: "up", bandwidth: "1 Gbps", description: "LAN - HQ Internal" },
            { name: "GE0/1", ip: "172.16.10.1/30", status: "up", bandwidth: "200 Mbps", description: "WAN - 电信 MPLS" },
            { name: "GE0/2", ip: "172.16.11.1/30", status: "up", bandwidth: "100 Mbps", description: "WAN - 联通 Internet" },
            { name: "GE0/3", ip: "172.16.12.1/30", status: "down", bandwidth: "50 Mbps", description: "WAN - 5G Backup" },
        ],
        configTemplate: "HQ-Primary-v4", siteId: "SITE-010",
    },
    "v-smart": {
        id: "v-smart", label: "vSmart 控制器", type: DeviceType.VSMART,
        model: "vSmart-1000", version: "vManage-17.6.3",
        cpu: 22, memory: 48, uptime: "90d 2h 45m",
        interfaces: [
            { name: "GE0/0", ip: "10.0.0.2/24", status: "up", bandwidth: "10 Gbps", description: "Mgmt - vManage" },
            { name: "GE0/1", ip: "172.16.0.3/30", status: "up", bandwidth: "1 Gbps", description: "Control - to vBond" },
            { name: "GE0/2", ip: "172.16.20.1/24", status: "up", bandwidth: "1 Gbps", description: "Overlay - to Branches" },
        ],
        configTemplate: "vSmart-Standard-v3", siteId: "SITE-001",
    },
    "branch-shanghai": {
        id: "branch-shanghai", label: "上海分支", type: DeviceType.BRANCH,
        model: "vEdge-2000", version: "vEdge-17.6.3",
        cpu: 35, memory: 55, uptime: "60d 14h 10m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.1.1/24", status: "up", bandwidth: "1 Gbps", description: "LAN - Shanghai Office" },
            { name: "GE0/1", ip: "172.16.30.1/30", status: "up", bandwidth: "100 Mbps", description: "WAN - 电信 MPLS" },
            { name: "GE0/2", ip: "172.16.31.1/30", status: "up", bandwidth: "50 Mbps", description: "WAN - 联通 5G" },
        ],
        configTemplate: "Branch-Standard-v3", siteId: "SITE-020",
    },
    "branch-beijing": {
        id: "branch-beijing", label: "北京分支", type: DeviceType.BRANCH,
        model: "vEdge-2000", version: "vEdge-17.6.3",
        cpu: 52, memory: 68, uptime: "45d 8h 30m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.2.1/24", status: "up", bandwidth: "1 Gbps", description: "LAN - Beijing Office" },
            { name: "GE0/1", ip: "172.16.40.1/30", status: "up", bandwidth: "100 Mbps", description: "WAN - 电信 Internet" },
            { name: "GE0/2", ip: "172.16.41.1/30", status: "up", bandwidth: "50 Mbps", description: "WAN - 移动 5G" },
        ],
        configTemplate: "Branch-Standard-v3", siteId: "SITE-030",
    },
    "branch-guangzhou": {
        id: "branch-guangzhou", label: "广州分支", type: DeviceType.BRANCH,
        model: "vEdge-100", version: "vEdge-17.6.3",
        cpu: 20, memory: 35, uptime: "30d 22h 15m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.3.1/24", status: "up", bandwidth: "100 Mbps", description: "LAN - Guangzhou Office" },
            { name: "GE0/1", ip: "172.16.50.1/30", status: "up", bandwidth: "100 Mbps", description: "WAN - 电信 MPLS" },
        ],
        configTemplate: "Branch-Small-v2", siteId: "SITE-040",
    },
    "branch-shenzhen": {
        id: "branch-shenzhen", label: "深圳分支", type: DeviceType.BRANCH,
        model: "vEdge-2000", version: "vEdge-17.6.3",
        cpu: 40, memory: 58, uptime: "55d 10h 45m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.4.1/24", status: "up", bandwidth: "1 Gbps", description: "LAN - Shenzhen Office" },
            { name: "GE0/1", ip: "172.16.60.1/30", status: "up", bandwidth: "80 Mbps", description: "WAN - 联通 MPLS" },
            { name: "GE0/2", ip: "172.16.61.1/30", status: "up", bandwidth: "40 Mbps", description: "WAN - 电信 5G" },
        ],
        configTemplate: "Branch-Standard-v3", siteId: "SITE-050",
    },
    "branch-chengdu": {
        id: "branch-chengdu", label: "成都分支", type: DeviceType.BRANCH,
        model: "vEdge-2000", version: "vEdge-17.6.2",
        cpu: 65, memory: 75, uptime: "15d 6h 20m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.5.1/24", status: "up", bandwidth: "1 Gbps", description: "LAN - Chengdu Office" },
            { name: "GE0/1", ip: "172.16.70.1/30", status: "up", bandwidth: "80 Mbps", description: "WAN - 移动 Internet" },
        ],
        configTemplate: "Branch-Standard-v3", siteId: "SITE-060",
    },
    "branch-wuhan": {
        id: "branch-wuhan", label: "武汉分支", type: DeviceType.BRANCH,
        model: "vEdge-100", version: "vEdge-17.6.3",
        cpu: 18, memory: 30, uptime: "40d 16h 55m",
        interfaces: [
            { name: "GE0/0", ip: "192.168.6.1/24", status: "up", bandwidth: "100 Mbps", description: "LAN - Wuhan Office" },
            { name: "GE0/1", ip: "172.16.80.1/30", status: "up", bandwidth: "80 Mbps", description: "WAN - 电信 MPLS" },
        ],
        configTemplate: "Branch-Small-v2", siteId: "SITE-070",
    },
};

/* ============================================================
 *  策略数据
 * ============================================================ */

export const policies: PolicyInfo[] = [
    {
        id: "policy-route-1",
        name: "全局路由策略",
        type: "route",
        description: "默认 HQ 集中出口，分支间流量直连（SLA ≥ 20ms）",
        appliedNodes: ["hq-cpe", "branch-shanghai", "branch-beijing", "branch-guangzhou", "branch-shenzhen", "branch-chengdu", "branch-wuhan"],
    },
    {
        id: "policy-qos-1",
        name: "视频会议 QoS",
        type: "qos",
        description: "Zoom/Teams 流量优先级最高，保障 50ms 内延迟",
        appliedNodes: ["hq-cpe", "branch-shanghai", "branch-beijing"],
    },
    {
        id: "policy-qos-2",
        name: "ERP 系统 QoS",
        type: "qos",
        description: "SAP ERP 流量带宽保障 ≥ 20Mbps",
        appliedNodes: ["hq-cpe", "branch-guangzhou", "branch-shenzhen"],
    },
    {
        id: "policy-security-1",
        name: "云端安全策略",
        type: "security",
        description: "互联网流量经 AWS Cloud GW 进行 DPI 检测",
        appliedNodes: ["hq-cpe", "branch-beijing", "branch-chengdu"],
    },
];

/* ============================================================
 *  应用流量路径数据
 * ============================================================ */

export const trafficFlows: TrafficFlowPath[] = [
    {
        id: "flow-zoom",
        appName: "Zoom 视频会议",
        path: ["branch-shanghai", "hq-cpe", "branch-beijing"],
        bandwidth: "5 Mbps",
        qosPolicy: "视频会议 QoS",
        color: "#2ed573",
    },
    {
        id: "flow-sap",
        appName: "SAP ERP",
        path: ["branch-guangzhou", "hq-cpe"],
        bandwidth: "15 Mbps",
        qosPolicy: "ERP 系统 QoS",
        color: "#1e90ff",
    },
    {
        id: "flow-webex",
        appName: "Webex 会议",
        path: ["branch-shenzhen", "v-smart", "branch-chengdu"],
        bandwidth: "3 Mbps",
        qosPolicy: "视频会议 QoS",
        color: "#ffa502",
    },
];

/* ============================================================
 *  故障根因分析数据
 * ============================================================ */

export interface FaultInfo {
    id: string;
    nodeId: string;
    severity: "critical" | "major" | "minor";
    title: string;
    rootCause: string;
    impact: string;
    timestamp: string;
    suggestion: string;
}

export const faults: FaultInfo[] = [
    {
        id: "fault-1",
        nodeId: "branch-chengdu",
        severity: "critical",
        title: "成都分支 ISP 链路质量劣化",
        rootCause: "中国移动骨干网拥塞 → 延迟 > 50ms、丢包 30%",
        impact: "影响成都分支全部业务，视频会议卡顿严重",
        timestamp: "2026-05-30 09:23:15",
        suggestion: "建议切换至 5G 备用链路，同时联系运营商",
    },
    {
        id: "fault-2",
        nodeId: "branch-beijing",
        severity: "major",
        title: "北京分支 Internet 链路波动",
        rootCause: "中国电信城域网抖动 → 延迟 35ms、抖动 8ms",
        impact: "北京-北京-HQ 主隧道降级，备用隧道已自动切换",
        timestamp: "2026-05-30 10:05:42",
        suggestion: "监控中，若持续恶化将自动切换至 5G",
    },
    {
        id: "fault-3",
        nodeId: "branch-beijing",
        severity: "critical",
        title: "北京↔成都 Mesh 隧道中断",
        rootCause: "P2P Overlay 路由不可达 → 隧道 DOWN",
        impact: "北京与成都间直接通信中断，需经 HQ 转发",
        timestamp: "2026-05-30 09:30:00",
        suggestion: "等待 ISP 恢复后隧道将自动重建",
    },
];

/* ============================================================
 *  统计数据
 * ============================================================ */

export const statsSummary = {
    totalDevices: topologyNodes.length,
    totalTunnels: topologyEdges.length,
    activeTunnels: topologyEdges.filter((e) => !e.data?.isStandby && !e.data?.isDown).length,
    standbyTunnels: topologyEdges.filter((e) => e.data?.isStandby).length,
    downTunnels: topologyEdges.filter((e) => e.data?.isDown).length,
    criticalAlerts: faults.filter((f) => f.severity === "critical").length,
    majorAlerts: faults.filter((f) => f.severity === "major").length,
};
