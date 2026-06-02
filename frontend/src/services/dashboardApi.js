/**
 * Dashboard 大屏 API
 * 从后端获取 Dashboard 全部数据
 */
import { get } from './api';

/**
 * 获取 Dashboard 全部数据（一次性返回）
 * 包含：健康分数、统计、站点、链路、应用SLA、告警、ISP带宽
 * 后端会添加随机抖动模拟实时数据
 * @returns {Promise<DashboardData>}
 */
export function fetchDashboardData() {
    return get('/dashboard');
}
