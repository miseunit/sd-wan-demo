/**
 * SD-WAN 策略管理 - API 服务层
 * 通过 vite proxy 调用后端 /api/v1/policies 接口
 *
 * 后端使用统一响应格式中间件，所有响应格式为：
 * { code: number, message: string, data: T }
 * 通过 axios 拦截器自动解包
 */
import axios from 'axios';
import type { Policy, PolicyFormData } from './types';

const BASE_URL = '/api/v1/policies';

const request = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

/** 分页响应类型 */
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

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

/**
 * 获取策略列表（分页）
 */
export async function getPolicies(params?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}): Promise<PaginatedResponse<Policy>> {
    const { data } = await request.get<PaginatedResponse<Policy>>('/', {
        params: {
            type: params?.type,
            status: params?.status,
            search: params?.search,
            page: params?.page || 1,
            pageSize: params?.pageSize || 500,  // 默认获取所有，前端自行分页（后端最大限制500）
        },
    });
    return data;
}

/**
 * 获取策略详情
 */
export async function getPolicyById(id: number): Promise<Policy> {
    const { data } = await request.get<Policy>(`/${id}`);
    return data;
}

/**
 * 创建策略
 */
export async function createPolicy(payload: PolicyFormData): Promise<Policy> {
    const { data } = await request.post<Policy>('/', payload);
    return data;
}

/**
 * 更新策略
 */
export async function updatePolicy(id: number, payload: Partial<PolicyFormData>): Promise<Policy> {
    const { data } = await request.put<Policy>(`/${id}`, payload);
    return data;
}

/**
 * 删除策略
 */
export async function deletePolicy(id: number): Promise<void> {
    await request.delete(`/${id}`);
}

/**
 * 切换策略状态（启用/禁用）
 */
export async function togglePolicyStatus(id: number, status: 'active' | 'inactive'): Promise<Policy> {
    const { data } = await request.patch<Policy>(`/${id}/status`, { status });
    return data;
}
