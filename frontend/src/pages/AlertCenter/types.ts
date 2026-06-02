/**
 * SD-WAN 告警中心 - 类型定义
 */

/** 告警等级 */
export type AlertLevel = 'critical' | 'warning' | 'info';

/** 告警状态 */
export type AlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';

/** 告警来源类型 */
export type AlertSourceType = 'site' | 'link' | 'device';

/** 指标类型 */
export type MetricType = 'latency' | 'loss' | 'bandwidth' | 'cpu' | 'memory';

/** 分页响应 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/** 告警数据 */
export interface Alert {
    id: number;
    level: AlertLevel;
    status: AlertStatus;
    title: string;
    message: string;
    source_type: AlertSourceType;
    source_id: string;
    source_name: string | null;
    region: string | null;
    metric_type: MetricType | null;
    metric_value: number | null;
    threshold: number | null;
    root_cause: string | null;
    related_alerts: number[];
    acknowledged_by: string | null;
    acknowledged_at: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

/** 告警时间线条目 */
export interface AlertTimelineEntry {
    id: number;
    action: string;
    operator: string | null;
    remark: string | null;
    created_at: string;
}

/** 带时间线的告警详情 */
export interface AlertWithTimeline extends Alert {
    timeline: AlertTimelineEntry[];
}

/** 告警统计 */
export interface AlertStats {
    total: number;
    critical: number;
    warning: number;
    info: number;
    new: number;
    acknowledged: number;
    in_progress: number;
    resolved: number;
}

/** 筛选条件 */
export interface AlertFilter {
    level: AlertLevel | 'all';
    status: AlertStatus | 'all';
    source_type: AlertSourceType | 'all';
    time_range: '5min' | '1hour' | '24hour' | 'all';
    search: string;
}

/** 告警等级标签映射 */
export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
    critical: '严重',
    warning: '警告',
    info: '提示',
};

/** 告警状态标签映射 */
export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
    new: '新增',
    acknowledged: '已确认',
    in_progress: '处理中',
    resolved: '已恢复',
};

/** 来源类型标签映射 */
export const SOURCE_TYPE_LABELS: Record<AlertSourceType, string> = {
    site: '站点',
    link: '链路',
    device: '设备',
};
