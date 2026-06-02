/**
 * 设备管理 - API 服务
 * 使用共享 api.js 以正确解包统一响应格式 {code, message, data}
 */
import { get, post, put, del } from '../../services/api';
import type {
    Device,
    DeviceListResponse,
    DeviceDetail,
    DeviceStats,
    DeviceFilterState,
    DeviceActionRequest,
    DeviceActionResponse,
} from './types';

/** 创建/更新设备请求 */
export interface DeviceCreateRequest {
    name: string;
    device_type: string;
    site_id: string;
    firmware_version?: string;
    serial_number?: string;
    management_ip?: string;
    mac_address?: string;
}

export interface DeviceUpdateRequest {
    name?: string;
    device_type?: string;
    site_id?: string;
}

const BASE = '/devices';

/** 构建查询参数 */
function buildQuery(params: Record<string, string | number | undefined>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
            searchParams.append(key, String(value));
        }
    });
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
}

/**
 * 获取设备列表
 */
export function fetchDevices(
    filter: DeviceFilterState,
    page = 1,
    pageSize = 10
): Promise<DeviceListResponse> {
    const query = buildQuery({
        page,
        pageSize,
        device_type: filter.device_type === 'all' ? undefined : filter.device_type,
        online_status: filter.online_status === 'all' ? undefined : filter.online_status,
        site_id: filter.site_id === 'all' ? undefined : filter.site_id,
        search: filter.search || undefined,
    });
    return get(`${BASE}${query}`);
}

/**
 * 获取设备统计
 */
export function fetchDeviceStats(): Promise<DeviceStats> {
    return get(`${BASE}/stats`);
}

/**
 * 获取设备详情
 */
export function fetchDeviceDetail(deviceId: string): Promise<DeviceDetail> {
    return get(`${BASE}/${deviceId}`);
}

/**
 * 执行设备操作
 */
export function executeDeviceAction(
    deviceId: string,
    action: DeviceActionRequest
): Promise<DeviceActionResponse> {
    return post(`${BASE}/${deviceId}/action`, action);
}

/**
 * 创建设备
 */
export function createDevice(data: DeviceCreateRequest): Promise<Device> {
    return post(`${BASE}`, data);
}

/**
 * 更新设备
 */
export function updateDevice(deviceId: string, data: DeviceUpdateRequest): Promise<Device> {
    return put(`${BASE}/${deviceId}`, data);
}

/**
 * 删除设备
 */
export function deleteDevice(deviceId: string): Promise<void> {
    return del(`${BASE}/${deviceId}`);
}
