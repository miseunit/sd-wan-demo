/**
 * 设备卡片组件 - 可复用
 * 展示设备的基本信息、状态、健康度等
 */
import { Tag, Progress } from 'antd';
import {
    DesktopOutlined, CloudServerOutlined, WifiOutlined, SafetyCertificateOutlined,
    SyncOutlined, TeamOutlined,
} from '@ant-design/icons';
// eslint-disable-next-line no-unused-vars
import { Device } from '../types';
import '../DeviceManagement.css';

/* ============================================================
 *  常量 & 工具函数
 * ============================================================ */

/** 设备类型配置 */
const DEVICE_TYPE_CONFIG = {
    Edge: { icon: <DesktopOutlined />, color: '#1890ff' },
    Gateway: { icon: <CloudServerOutlined />, color: '#722ed1' },
    CPE: { icon: <WifiOutlined />, color: '#52c41a' },
};

/** 健康评分颜色 */
function healthColor(v) {
    if (v >= 80) return '#52c41a';
    if (v >= 60) return '#faad14';
    return '#ff4d4f';
}

/** CPU/内存颜色 */
function usageColor(v) {
    if (v < 50) return '#52c41a';
    if (v < 70) return '#faad14';
    return '#ff4d4f';
}

/** 设备角色配置 */
const ROLE_CONFIG = {
    active: { label: '主设备', color: '#d46b08', bgColor: '#fff7e6', icon: '🏆' },
    standby: { label: '备设备', color: '#595959', bgColor: '#f5f5f5', icon: '' },
};

/** 格式化数值，保留一位小数 */
function formatPercent(value) {
    return Math.round(value * 10) / 10;
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function DeviceCard({
    device,
    onClick,
    showRole = true,
    showSessions = true,
}) {
    const roleConfig = ROLE_CONFIG[device.role];

    return (
        <div
            className={`device-card device-card--${device.online_status}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* 头部：设备名称、类型、站点、状态 */}
            <div className="device-card__header">
                <div className="device-card__icon" style={{ color: DEVICE_TYPE_CONFIG[device.device_type]?.color }}>
                    {DEVICE_TYPE_CONFIG[device.device_type]?.icon || <DesktopOutlined />}
                </div>
                <div className="device-card__info">
                    <div className="device-card__name">
                        {device.name}
                        {showRole && (
                            <span className={`device-card__role device-card__role--${device.role}`}>
                                {roleConfig.icon && <span style={{ marginRight: 4 }}>{roleConfig.icon}</span>}
                                {roleConfig.label}
                            </span>
                        )}
                    </div>
                    <div className="device-card__meta">
                        <Tag color={DEVICE_TYPE_CONFIG[device.device_type]?.color} style={{ fontSize: 11, margin: 0 }}>
                            {device.device_type}
                        </Tag>
                        <span className="device-card__site">{device.site_name || device.site_id}</span>
                    </div>
                </div>
                <div className="device-card__status">
                    <span className={`status-dot status-dot--${device.online_status}`} />
                    <span>{device.online_status === 'online' ? '在线' : '离线'}</span>
                </div>
            </div>

            {/* 资源指标：CPU、内存 */}
            <div className="device-card__metrics">
                <div className="device-card__metric">
                    <span className="device-card__metric-label">CPU</span>
                    <Progress
                        percent={formatPercent(device.cpu_usage)}
                        size="small"
                        strokeColor={usageColor(device.cpu_usage)}
                        trailColor="var(--border-primary)"
                        format={(p) => <span style={{ color: usageColor(device.cpu_usage) }}>{p}%</span>}
                    />
                </div>
                <div className="device-card__metric">
                    <span className="device-card__metric-label">内存</span>
                    <Progress
                        percent={formatPercent(device.memory_usage)}
                        size="small"
                        strokeColor={usageColor(device.memory_usage)}
                        trailColor="var(--border-primary)"
                        format={(p) => <span style={{ color: usageColor(device.memory_usage) }}>{p}%</span>}
                    />
                </div>
            </div>

            {/* 底部：健康度、版本、升级状态、会话数 */}
            <div className="device-card__footer">
                <div className="device-card__health">
                    <SafetyCertificateOutlined style={{ color: healthColor(device.health_score) }} />
                    <span style={{ color: healthColor(device.health_score), fontWeight: 700 }}>
                        {formatPercent(device.health_score)}
                    </span>
                </div>
                <div className="device-card__version">
                    v{device.firmware_version}
                </div>
                {showSessions && device.online_status === 'online' && (
                    <div className="device-card__sessions">
                        <TeamOutlined style={{ fontSize: 11, marginRight: 4 }} />
                        <span>{device.session_count.toLocaleString()}</span>
                    </div>
                )}
                {device.upgrade_status !== 'none' && (
                    <Tag color="blue" style={{ fontSize: 10 }}>
                        <SyncOutlined spin={device.upgrade_status === 'downloading' || device.upgrade_status === 'installing'} />
                        {' '}{device.upgrade_status === 'downloading' ? '下载中' : device.upgrade_status === 'installing' ? '安装中' : device.upgrade_status}
                    </Tag>
                )}
            </div>
        </div>
    );
}
