/**
 * 系统设置类型定义
 */

// 系统设置项
export interface SystemSetting {
    key: string;
    value: string;
    category: 'basic' | 'security' | 'network' | 'alert';
    description: string;
}

// 角色
export interface Role {
    id: number;
    name: string;
    displayName: string;
    description: string;
    permissions: string;
    isSystem: boolean;
}

// 审计日志
export interface AuditLog {
    id: number;
    userId?: number;
    username?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    status: string;
    createdAt: string;
}

// 登录日志
export interface LoginLog {
    id: number;
    userId?: number;
    username?: string;
    ipAddress?: string;
    status: string;
    failureReason?: string;
    createdAt: string;
}

// 告警规则
export interface AlertRule {
    id: number;
    name: string;
    type: string;
    metric?: string;
    condition?: string;
    threshold?: number;
    severity: 'critical' | 'warning' | 'info';
    isActive: boolean;
    description?: string;
}

// 通知配置
export interface NotificationConfig {
    id: number;
    name: string;
    type: 'email' | 'sms' | 'webhook';
    config: string;
    alertTypes: string;
    isActive: boolean;
}

// Webhook配置
export interface WebhookConfig {
    id: number;
    name: string;
    url: string;
    method: string;
    headers: string;
    events: string;
    isActive: boolean;
}

// 系统设置子模块
export type SettingsModule =
    | 'basic'
    | 'user-permission'
    | 'security'
    | 'network-policy'
    | 'alert-notify'
    | 'log-audit'
    | 'api-integration';
