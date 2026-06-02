/**
 * 告警中心 - API 服务层
 */
import axios from 'axios';
import type { Alert, AlertStats, AlertWithTimeline, AlertStatus, PaginatedResponse } from './types';

const BASE_URL = '/api/v1/alerts';

/** axios 实例 */
const request = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

/** 添加响应拦截器，解包统一响应格式 {code, message, data} */
request.interceptors.response.use(
    (response) => {
        const rawData = response.data;
        // 解包统一响应格式：{code, message, data} → data
        if (rawData && typeof rawData === 'object' && 'code' in rawData && 'message' in rawData) {
            response.data = rawData.data;
        }
        return response;
    },
    (error) => {
        // 统一错误处理
        if (error.response) {
            const rawData = error.response.data;
            if (rawData && typeof rawData === 'object' && 'message' in rawData) {
                error.message = rawData.message;
            }
        }
        return Promise.reject(error);
    }
);

/** WebSocket 连接实例 */
let ws: WebSocket | null = null;
let wsCallbacks: ((alert: Alert) => void)[] = [];

/**
 * 获取告警列表
 */
export async function getAlerts(params?: {
    level?: string;
    status?: string;
    source_type?: string;
    source_id?: string;
    search?: string;
    time_range?: string;
    skip?: number;
    limit?: number;
}): Promise<PaginatedResponse<Alert>> {
    const { data } = await request.get<PaginatedResponse<Alert>>('/', { params });
    return data;
}

/**
 * 获取告警统计
 */
export async function getAlertStats(): Promise<AlertStats> {
    const { data } = await request.get<AlertStats>('/stats');
    return data;
}

/**
 * 获取告警详情
 */
export async function getAlertById(id: number): Promise<AlertWithTimeline> {
    const { data } = await request.get<AlertWithTimeline>(`/${id}`);
    return data;
}

/**
 * 更新告警状态
 */
export async function updateAlertStatus(
    id: number,
    status: AlertStatus,
    acknowledged_by?: string,
    root_cause?: string,
    remark?: string,
): Promise<Alert> {
    const { data } = await request.patch<Alert>(`/${id}`, {
        status,
        acknowledged_by,
        root_cause,
        remark,
    });
    return data;
}

/**
 * 删除告警
 */
export async function deleteAlert(id: number): Promise<void> {
    await request.delete(`/${id}`);
}

/**
 * 连接 WebSocket
 */
export function connectAlertWebSocket(onAlert: (alert: Alert) => void): void {
    wsCallbacks.push(onAlert);

    if (ws) return; // 已连接

    const wsUrl = `ws://${window.location.host}/api/v1/alerts/ws`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
            const alert = JSON.parse(event.data) as Alert;
            wsCallbacks.forEach(cb => cb(alert));
        } catch (e) {
            console.error('解析告警消息失败:', e);
        }
    };

    ws.onclose = () => {
        ws = null;
        // 3秒后重连
        setTimeout(() => {
            if (wsCallbacks.length > 0) {
                connectAlertWebSocket(wsCallbacks[wsCallbacks.length - 1]);
            }
        }, 3000);
    };

    ws.onerror = (err) => {
        console.error('WebSocket 错误:', err);
    };

    // 心跳
    const heartbeat = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);
}

/**
 * 断开 WebSocket
 */
export function disconnectAlertWebSocket(): void {
    wsCallbacks = [];
    if (ws) {
        ws.close();
        ws = null;
    }
}
