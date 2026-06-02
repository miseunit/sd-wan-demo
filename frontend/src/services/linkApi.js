/**
 * WAN 链路管理 API 封装
 */
import { get, post, put, del } from './api';

/**
 * 获取链路列表
 * @param {Object} params - 查询参数
 * @param {string} params.type - 链路类型 (MPLS/Internet/5G)
 * @param {string} params.healthStatus - 健康状态 (healthy/degraded/down)
 * @param {string} params.siteName - 站点名称筛选
 * @param {string} params.search - 搜索关键词
 * @param {number} params.page - 页码（从1开始）
 * @param {number} params.pageSize - 每页记录数
 */
export function getLinks(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.healthStatus) query.append('healthStatus', params.healthStatus);
    if (params.siteName) query.append('siteName', params.siteName);
    if (params.search) query.append('search', params.search);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);

    const url = `/links/${query.toString() ? '?' + query.toString() : ''}`;
    return get(url);
}

/**
 * 获取链路统计信息
 */
export function getLinkStats() {
    return get('/links/stats');
}

/**
 * 获取所有站点名称（去重，用于筛选下拉）
 */
export function getLinkSiteNames() {
    return get('/links/site-names');
}

/**
 * 获取链路详情
 * @param {string} linkId - 链路ID
 */
export function getLink(linkId) {
    return get(`/links/${encodeURIComponent(linkId)}`);
}

/**
 * 创建链路
 * @param {Object} data - 链路数据
 */
export function createLink(data) {
    return post('/links/', data);
}

/**
 * 更新链路
 * @param {string} linkId - 链路ID
 * @param {Object} data - 更新数据
 */
export function updateLink(linkId, data) {
    return put(`/links/${encodeURIComponent(linkId)}`, data);
}

/**
 * 删除链路
 * @param {string} linkId - 链路ID
 */
export function deleteLink(linkId) {
    return del(`/links/${encodeURIComponent(linkId)}`);
}

/**
 * 获取链路历史性能数据
 * @param {string} linkId - 链路ID
 * @param {string} timeRange - 时间范围 (5min/1hour)
 */
export function getLinkHistory(linkId, timeRange = '5min') {
    return get(`/links/${encodeURIComponent(linkId)}/history?timeRange=${timeRange}`);
}

/**
 * 手动切换链路
 * @param {string} linkId - 链路ID
 */
export function switchLink(linkId) {
    return post(`/links/${encodeURIComponent(linkId)}/switch`);
}
