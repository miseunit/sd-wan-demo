/**
 * 网络诊断 API 服务
 */
import { get, post } from './api';

const API_BASE = '/devices';

// ============= Ping 相关 API =============

/**
 * 对设备执行 Ping 测试
 * @param {string} deviceId - 设备ID
 * @param {object} params - Ping 参数
 * @param {string} params.target - 目标IP（可选）
 * @param {number} params.count - 发送包数（默认5）
 * @param {number} params.interval - 发送间隔秒数（默认1）
 * @param {number} params.timeout - 超时时间秒数（默认2）
 * @param {number} params.packet_size - 数据包大小（默认32）
 * @returns {Promise<PingResult>}
 */
export function pingDevice(deviceId, params = {}) {
    return post(`${API_BASE}/${deviceId}/diagnostics/ping`, params);
}

/**
 * 获取设备 Ping 历史记录
 * @param {string} deviceId - 设备ID
 * @param {number} limit - 返回记录数限制（默认100）
 * @returns {Promise<PingHistoryList>}
 */
export function getPingHistory(deviceId, limit = 100) {
    return get(`${API_BASE}/${deviceId}/diagnostics/ping/history`, { limit });
}

// ============= Traceroute 相关 API =============

/**
 * 对设备执行 Traceroute 测试
 * @param {string} deviceId - 设备ID
 * @param {object} params - Traceroute 参数
 * @param {string} params.destination - 目标IP（可选）
 * @param {number} params.max_hops - 最大跳数（默认30）
 * @param {number} params.timeout - 超时时间秒数（默认2）
 * @param {number} params.destination_port - 目标端口（默认33434）
 * @returns {Promise<TracerouteResult>}
 */
export function tracerouteDevice(deviceId, params = {}) {
    return post(`${API_BASE}/${deviceId}/diagnostics/traceroute`, params);
}

/**
 * 获取设备 Traceroute 历史记录
 * @param {string} deviceId - 设备ID
 * @param {number} limit - 返回记录数限制（默认50）
 * @returns {Promise<TracerouteHistoryList>}
 */
export function getTracerouteHistory(deviceId, limit = 50) {
    return get(`${API_BASE}/${deviceId}/diagnostics/traceroute/history`, { limit });
}

// ============= 链路探测相关 API =============

/**
 * 启动链路持续探测
 * @param {string} linkId - 链路ID
 * @param {number} interval - 探测间隔秒数（默认5）
 * @returns {Promise<{message: string, link_id: string}>}
 */
export function startLinkProbe(linkId, interval = 5) {
    return get(`${API_BASE}/links/${linkId}/probe/start`, { interval });
}

/**
 * 停止链路探测
 * @param {string} linkId - 链路ID
 * @returns {Promise<{message: string, link_id: string}>}
 */
export function stopLinkProbe(linkId) {
    return get(`${API_BASE}/links/${linkId}/probe/stop`);
}

/**
 * 获取所有活跃的链路探测任务
 * @returns {Promise<{active_probes: string[], count: number}>}
 */
export function getActiveProbes() {
    return get(`${API_BASE}/links/probe/active`);
}

/**
 * 获取链路探测历史记录
 * @param {string} linkId - 链路ID
 * @param {number} limit - 返回记录数限制（默认100）
 * @returns {Promise<LinkProbeHistoryList>}
 */
export function getLinkProbeHistory(linkId, limit = 100) {
    return get(`${API_BASE}/links/${linkId}/probe/history`, { limit });
}

// ============= 批量诊断相关 API =============

/**
 * 批量 Ping 多个设备
 * @param {string[]} deviceIds - 设备ID列表
 * @param {object} params - Ping 参数
 * @param {number} params.count - 发送包数（默认5）
 * @param {number} params.timeout - 超时时间（默认2）
 * @returns {Promise<{results: BatchPingResult[]}>}
 */
export function batchPing(deviceIds, params = {}) {
    return post(`${API_BASE}/diagnostics/batch-ping`, {
        device_ids: deviceIds,
        ...params
    });
}

// ============= SLA 计算相关 API =============

/**
 * 计算 SLA 评分
 * @param {object} metrics - 网络指标
 * @param {number} metrics.latency - 延迟(ms)
 * @param {number} metrics.packet_loss - 丢包率(%)
 * @param {number} metrics.jitter - 抖动(ms)
 * @returns {Promise<SLAScore>}
 */
export function calculateSLA(metrics) {
    return post(`${API_BASE}/sla/calculate`, metrics);
}

// 导出所有 API 函数
export default {
    // Ping
    pingDevice,
    getPingHistory,
    // Traceroute
    tracerouteDevice,
    getTracerouteHistory,
    // 链路探测
    startLinkProbe,
    stopLinkProbe,
    getActiveProbes,
    getLinkProbeHistory,
    // 批量诊断
    batchPing,
    // SLA 计算
    calculateSLA,
};
