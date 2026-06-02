/**
 * SD-WAN 链路管理 - 类型定义
 */

/** 链路类型 */
export type LinkType = 'MPLS' | 'Internet' | '5G' | 'WAN';

/** 链路健康状态 */
export type LinkHealthStatus = 'healthy' | 'degraded' | 'down';

/** 链路使用状态 */
export type LinkActiveStatus = 'active' | 'standby' | 'down';

/** 切换策略类型 */
export type SwitchPolicy = 'mpls-priority' | 'internet-fallback' | 'load-balance' | 'cost-optimize';

/** 告警级别 */
export type AlertSeverity = 'critical' | 'major' | 'minor';

/** 告警类别 */
export type AlertCategory = 'link-down' | 'sla-breach' | 'auto-switch' | 'quality-degrade';

/** 链路信息（核心） */
export interface WanLink {
    id: string;
    name: string;
    type: LinkType;
    /** 所属站点名称 */
    siteName: string;
    /** 所属站点 ID */
    siteId: string;
    /** 所属设备 ID */
    deviceId?: string;
    /** 所属设备名称 */
    deviceName?: string;
    /** ISP 运营商 */
    isp: string;
    /** 健康状态 */
    healthStatus: LinkHealthStatus;
    /** 使用状态 */
    activeStatus: LinkActiveStatus;
    /** IP 地址 */
    ip: string;
    /** 性能指标 */
    latency: number;        // 延迟 ms
    loss: number;          // 丢包率 %
    jitter: number;        // 抖动 ms
    bandwidth: number;     // 总带宽 Mbps
    usedBandwidth: number; // 已用带宽 Mbps
    /** 利用率 = usedBandwidth / bandwidth * 100 */
    utilization: number;  // 利用率 %
    /** SLA 评分 0-100 */
    slaScore: number;
    /** 切换策略 */
    switchPolicy: SwitchPolicy;
    /** 月成本（元） */
    monthlyCost: number;
    /** 自动切换历史 */
    switchHistory: SwitchEvent[];
    /** 告警记录 */
    alerts: LinkAlert[];
}

/** 自动切换事件 */
export interface SwitchEvent {
    id: string;
    linkId: string;
    time: string;
    /** 从哪条链路切走 */
    fromLink: string;
    /** 切到哪条链路 */
    toLink: string;
    /** 切换原因 */
    reason: string;
}

/** 链路告警 */
export interface LinkAlert {
    id: string;
    linkId: string;
    severity: AlertSeverity;
    category: AlertCategory;
    title: string;
    reason: string;
    timestamp: string;
    resolved: boolean;
}

/** 历史性能数据点 */
export interface HistoryPoint {
    time: string;
    latency: number;
    loss: number;
    jitter: number;
    bandwidth: number;
    /** 吞吐量（Mbps） */
    throughput: number;
}

/** 筛选条件 */
export interface LinkFilterState {
    type: LinkType | 'all';
    healthStatus: LinkHealthStatus | 'all';
    siteName: string | 'all';
    search: string;
}
