/**
 * 智能选路 - 类型定义
 */

/** 应用类型 */
export type AppType =
    | 'voip'
    | 'video_conference'
    | 'web_browsing'
    | 'erp'
    | 'file_transfer'
    | 'custom';

/** 应用类型选项 */
export interface AppTypeOption {
    value: string;
    label: string;
    icon: string;
}

/** 路径中的链路 */
export interface PathLink {
    id: string;
    name: string;
    type: string;
    siteId: string;
    siteName: string;
    isp: string;
    healthStatus: 'healthy' | 'degraded' | 'down';
    latency: number;
    loss: number;
    jitter: number;
    bandwidth: number;
    usedBandwidth: number;
    utilization: number;
    slaScore: number;
}

/** 推荐路径 */
export interface RecommendedPath {
    rank: number;
    label: string;
    color: string;
    links: PathLink[];
    totalLatency: number;
    maxLoss: number;
    minBandwidth: number;
    avgSlaScore: number;
    reason: string;
}

/** 路径推荐结果 */
export interface PathRecommendation {
    sourceSiteId: string;
    sourceSiteName: string;
    destSiteId: string;
    destSiteName: string;
    appType: string | null;
    paths: RecommendedPath[];
    currentPolicy: CurrentPolicy | null;
}

/** 当前生效策略 */
export interface CurrentPolicy {
    id: number;
    name: string;
    type: string;
    priority: number;
    actionConfig: Record<string, unknown> | null;
}

/** 链路实况数据 */
export interface LinkQuality {
    id: string;
    name: string;
    type: string;
    isp: string;
    healthStatus: 'healthy' | 'degraded' | 'down';
    activeStatus: 'active' | 'standby' | 'down';
    latency: number;
    loss: number;
    jitter: number;
    bandwidth: number;
    usedBandwidth: number;
    utilization: number;
    slaScore: number;
}

/** 站点选项（用于下拉） */
export interface SiteOption {
    value: string;
    label: string;
    region: string;
    status: string;
}
