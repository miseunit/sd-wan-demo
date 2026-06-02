/**
 * 站点管理 API 封装
 */
import { get, post, put, patch, del } from './api';

/**
 * 获取站点列表
 * @param {Object} params - 查询参数
 * @param {string} params.region - 区域筛选
 * @param {string} params.status - 状态筛选
 * @param {string} params.search - 搜索关键词
 * @param {string} params.linkType - 链路类型筛选
 * @param {number} params.page - 页码（从1开始）
 * @param {number} params.pageSize - 每页记录数
 */
export function getSites(params = {}) {
    const query = new URLSearchParams();
    if (params.region) query.append('region', params.region);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.linkType) query.append('linkType', params.linkType);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);

    const url = `/sites/${query.toString() ? '?' + query.toString() : ''}`;
    return get(url);
}

/**
 * 获取站点统计信息
 */
export function getSiteStats() {
    return get('/sites/stats');
}

/**
 * 获取站点详情
 * @param {string} siteId - 站点ID
 */
export function getSite(siteId) {
    return get(`/sites/${siteId}`);
}

/**
 * 创建站点
 * @param {Object} data - 站点数据
 */
export function createSite(data) {
    return post('/sites/', data);
}

/**
 * 更新站点
 * @param {string} siteId - 站点ID
 * @param {Object} data - 更新数据
 */
export function updateSite(siteId, data) {
    return put(`/sites/${siteId}`, data);
}

/**
 * 删除站点
 * @param {string} siteId - 站点ID
 */
export function deleteSite(siteId) {
    return del(`/sites/${siteId}`);
}

/**
 * 获取站点历史数据
 * @param {string} siteId - 站点ID
 * @param {string} timeRange - 时间范围 (5min/1hour/24hour)
 */
export function getSiteHistory(siteId, timeRange = '5min') {
    return get(`/sites/${siteId}/history?time_range=${timeRange}`);
}

/**
 * 执行批量操作
 * @param {Object} data - 批量操作数据
 * @param {string} data.action - 操作类型 (restart/switchLink/upgradeConfig)
 * @param {string[]} data.siteIds - 站点ID列表
 */
export function batchAction(data) {
    return post('/sites/batch/action', data);
}

/**
 * 获取批量操作任务状态
 * @param {string} taskId - 任务ID
 */
export function getBatchTaskStatus(taskId) {
    return get(`/sites/batch/tasks/${taskId}`);
}

/**
 * 切换站点链路
 * @param {string} siteId - 站点ID
 * @param {string} linkId - 链路ID
 */
export function switchLink(siteId, linkId) {
    return post(`/sites/${siteId}/links/${linkId}/switch`, {});
}

/**
 * 确认告警
 * @param {string} siteId - 站点ID
 * @param {string} alertId - 告警ID
 * @param {Object} data - 确认数据
 * @param {string} data.operator - 确认人
 * @param {string} data.remark - 备注
 */
export function acknowledgeAlert(siteId, alertId, data) {
    return post(`/sites/${siteId}/alerts/${alertId}/acknowledge`, data);
}

/**
 * 静默告警
 * @param {string} siteId - 站点ID
 * @param {string} alertId - 告警ID
 * @param {Object} data - 静默数据
 * @param {number} data.durationMinutes - 静默时长（分钟）
 */
export function silenceAlert(siteId, alertId, data) {
    return post(`/sites/${siteId}/alerts/${alertId}/silence`, data);
}

/**
 * 导出站点数据
 * @param {Object} params - 查询参数
 * @param {string} params.region - 区域筛选
 * @param {string} params.status - 状态筛选
 * @param {string} params.search - 搜索关键词
 * @param {string} params.linkType - 链路类型筛选
 * @param {string} params.format - 导出格式 (csv/json)
 * @param {boolean} params.includeAlerts - 是否包含告警
 * @param {boolean} params.includeLinks - 是否包含链路
 */
export function exportSites(params = {}) {
    const query = new URLSearchParams();
    if (params.region) query.append('region', params.region);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.linkType) query.append('linkType', params.linkType);
    if (params.format) query.append('format', params.format);
    if (params.includeAlerts !== undefined) query.append('includeAlerts', params.includeAlerts);
    if (params.includeLinks !== undefined) query.append('includeLinks', params.includeLinks);

    const url = `/sites/export?${query.toString()}`;
    return get(url);
}

/**
 * 获取站点下的所有设备
 * @param {string} siteId - 站点ID
 * @returns {Promise<SiteDevicesResponse>} 站点设备响应
 */
export function getSiteDevices(siteId) {
    return get(`/sites/${siteId}/devices`);
}

/**
 * 获取站点所有设备的接口和隧道（聚合）
 * @param {string} siteId - 站点ID
 * @returns {Promise<SiteNetworkResponse>} 接口+隧道聚合响应
 */
export function getSiteNetwork(siteId) {
    return get(`/sites/${siteId}/interfaces`);
}

/**
 * 设置站点主链路（接口或隧道）
 * @param {string} siteId - 站点ID
 * @param {string} linkType - 链路类型: "interface" | "tunnel"
 * @param {number} linkId - 链路ID
 * @returns {Promise<any>}
 */
export function setPrimaryLink(siteId, linkType, linkId) {
    return put(`/sites/${siteId}/primary-link`, { linkType, linkId });
}

/**
 * 获取在线设备列表（用于站点绑定设备）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页记录数
 * @param {string} params.online_status - 在线状态筛选
 * @returns {Promise<PaginatedDevices>} 设备分页响应
 */
export function getOnlineDevices(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page !== undefined) searchParams.append('page', String(params.page));
    if (params.pageSize !== undefined) searchParams.append('pageSize', String(params.pageSize));
    if (params.online_status) searchParams.append('online_status', params.online_status);

    const qs = searchParams.toString();
    return get(`/devices${qs ? '?' + qs : ''}`);
}
