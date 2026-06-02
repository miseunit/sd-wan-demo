/**
 * SD-WAN 策略管理 - 类型定义
 */

/** 策略类型 */
export type PolicyType = 'route' | 'qos' | 'app_aware' | 'security';

/** 策略状态 */
export type PolicyStatus = 'active' | 'inactive' | 'draft';

/** 策略数据（后端返回） */
export interface Policy {
    id: number;
    name: string;
    type: PolicyType;
    status: PolicyStatus;
    priority: number;
    description: string | null;
    match_conditions: Record<string, unknown> | Record<string, unknown>[] | null;
    action_config: Record<string, unknown> | Record<string, unknown>[] | null;
    applied_sites: string[];
    created_at: string;
    updated_at: string;
}

/** 策略表单数据（创建/编辑） */
export interface PolicyFormData {
    name: string;
    type: PolicyType;
    priority: number;
    description?: string;
    match_conditions?: string;
    action_config?: string;
    applied_sites?: string[];
}

/** 筛选条件 */
export interface FilterState {
    type: PolicyType | 'all';
    status: PolicyStatus | 'all';
    search: string;
}

/** 策略类型标签映射 */
export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
    route: '路由策略',
    qos: 'QoS 策略',
    app_aware: '应用感知策略',
    security: '安全策略',
};

/** 策略类型颜色映射 */
export const POLICY_TYPE_COLORS: Record<PolicyType, string> = {
    route: '#1890ff',
    qos: '#52c41a',
    app_aware: '#722ed1',
    security: '#ff4d4f',
};

/** 策略状态标签映射 */
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
    active: '启用',
    inactive: '禁用',
    draft: '草稿',
};
