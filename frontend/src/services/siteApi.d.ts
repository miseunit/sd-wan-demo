/**
 * 站点管理 API 类型声明
 */

/** 站点列表项（简化，用于下拉选择） */
export interface SiteOption {
    id: string;
    name: string;
    displayName: string;
    region: string;
    status: string;
}

/** 分页响应 */
export interface SitesPaginatedResponse {
    items: SiteOption[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function getSites(params?: {
    region?: string;
    status?: string;
    search?: string;
    linkType?: string;
    page?: number;
    pageSize?: number;
}): Promise<SitesPaginatedResponse>;

export function getSiteStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    warning: number;
    alertCount: number;
}>;

export function getSite(siteId: string): Promise<any>;

export function createSite(data: any): Promise<any>;

export function updateSite(siteId: string, data: any): Promise<any>;

export function deleteSite(siteId: string): Promise<void>;

export function getSiteHistory(siteId: string, timeRange?: string): Promise<any[]>;

export function batchAction(data: {
    action: string;
    siteIds: string[];
}): Promise<{
    taskId: string;
    action: string;
    totalCount: number;
    status: string;
    createdAt: string;
}>;

export function getBatchTaskStatus(taskId: string): Promise<any>;

export function switchLink(siteId: string, linkId: string): Promise<any>;

export function acknowledgeAlert(siteId: string, alertId: string, data: any): Promise<any>;

export function silenceAlert(siteId: string, alertId: string, data: any): Promise<any>;

export function exportSites(params?: any): Promise<any>;

export function getSiteDevices(siteId: string): Promise<any>;

export function getSiteNetwork(siteId: string): Promise<any>;

export function setPrimaryLink(siteId: string, linkType: 'interface' | 'tunnel', linkId: number): Promise<any>;

export function getOnlineDevices(params?: {
    page?: number;
    pageSize?: number;
    online_status?: string;
}): Promise<any>;
