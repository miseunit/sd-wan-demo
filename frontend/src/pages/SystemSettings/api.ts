/**
 * 系统设置 API 服务
 */
import axios from 'axios';

const API_BASE = '/api/v1';

// 系统配置 API
export const settingsApi = {
    list: (category?: string) =>
        axios.get(`${API_BASE}/settings/`, { params: { category } }),
    get: (key: string) =>
        axios.get(`${API_BASE}/settings/${key}`),
    create: (data: any) =>
        axios.post(`${API_BASE}/settings/`, data),
    update: (key: string, data: any) =>
        axios.put(`${API_BASE}/settings/${key}`, data),
    delete: (key: string) =>
        axios.delete(`${API_BASE}/settings/${key}`),
};

// 角色 API
export const rolesApi = {
    list: () =>
        axios.get(`${API_BASE}/roles/`),
    get: (id: number) =>
        axios.get(`${API_BASE}/roles/${id}`),
    create: (data: any) =>
        axios.post(`${API_BASE}/roles/`, data),
    update: (id: number, data: any) =>
        axios.put(`${API_BASE}/roles/${id}`, data),
    delete: (id: number) =>
        axios.delete(`${API_BASE}/roles/${id}`),
};

// 审计日志 API
export const auditLogsApi = {
    list: (params?: any) =>
        axios.get(`${API_BASE}/audit-logs/`, { params }),
};

// 登录日志 API
export const loginLogsApi = {
    list: (params?: any) =>
        axios.get(`${API_BASE}/login-logs/`, { params }),
};

// 告警规则 API
export const alertRulesApi = {
    list: (params?: any) =>
        axios.get(`${API_BASE}/alert-rules/`, { params }),
    create: (data: any) =>
        axios.post(`${API_BASE}/alert-rules/`, data),
    update: (id: number, data: any) =>
        axios.put(`${API_BASE}/alert-rules/${id}`, data),
    delete: (id: number) =>
        axios.delete(`${API_BASE}/alert-rules/${id}`),
};

// 通知配置 API
export const notificationsApi = {
    list: (type?: string) =>
        axios.get(`${API_BASE}/notifications/`, { params: { type } }),
    create: (data: any) =>
        axios.post(`${API_BASE}/notifications/`, data),
    update: (id: number, data: any) =>
        axios.put(`${API_BASE}/notifications/${id}`, data),
    delete: (id: number) =>
        axios.delete(`${API_BASE}/notifications/${id}`),
};

// Webhook配置 API
export const webhooksApi = {
    list: () =>
        axios.get(`${API_BASE}/webhooks/`),
    create: (data: any) =>
        axios.post(`${API_BASE}/webhooks/`, data),
    update: (id: number, data: any) =>
        axios.put(`${API_BASE}/webhooks/${id}`, data),
    delete: (id: number) =>
        axios.delete(`${API_BASE}/webhooks/${id}`),
};
