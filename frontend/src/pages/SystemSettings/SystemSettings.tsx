/**
 * 系统设置主容器 - 左右布局
 */
import { useState } from 'react';
import { Card } from 'antd';
import type { SettingsModule } from './types';
import './SystemSettings.css';

// 子模块组件（后续实现）
const Placeholder = ({ title }: { title: string }) => (
    <div className="settings-placeholder">
        <h2>{title}</h2>
        <p>此模块正在开发中...</p>
    </div>
);

/**
 * 菜单项配置
 */
const MENU_ITEMS: Array<{
    key: SettingsModule;
    label: string;
    icon: string;
    title: string;
}> = [
    { key: 'basic',            label: '基础设置',     icon: '⚙️',  title: '系统名称、时区、语言、主题' },
    { key: 'user-permission',  label: '用户与权限',   icon: '👤',  title: '用户管理、角色管理、权限控制' },
    { key: 'security',         label: '安全设置',     icon: '🔒',  title: '登录策略、双因子认证、IP白名单' },
    { key: 'network-policy',   label: '网络策略',     icon: '🌐',  title: '路由策略、SLA策略、负载均衡' },
    { key: 'alert-notify',     label: '告警通知',     icon: '🔔',  title: '告警阈值、通知方式配置' },
    { key: 'log-audit',        label: '日志审计',     icon: '📜',  title: '操作日志、登录日志、配置变更' },
    { key: 'api-integration',  label: 'API集成',      icon: '🔗',  title: 'REST API、Webhook配置' },
];

export default function SystemSettings() {
    const [activeModule, setActiveModule] = useState<SettingsModule>('basic');

    // 渲染右侧内容区
    const renderContent = () => {
        const titles: Record<SettingsModule, string> = {
            'basic': '基础设置',
            'user-permission': '用户与权限',
            'security': '安全设置',
            'network-policy': '网络策略',
            'alert-notify': '告警与通知',
            'log-audit': '日志与审计',
            'api-integration': '集成与API',
        };
        
        return <Placeholder title={titles[activeModule]} />;
    };

    return (
        <div className="system-settings">
            <div className="system-settings__sidebar">
                <div className="system-settings__title">系统设置</div>
                <nav className="system-settings__nav">
                    {MENU_ITEMS.map((item) => (
                        <div
                            key={item.key}
                            className={`system-settings__menu-item ${activeModule === item.key ? 'system-settings__menu-item--active' : ''}`}
                            onClick={() => setActiveModule(item.key)}
                            title={item.title}
                        >
                            <span className="system-settings__menu-icon">{item.icon}</span>
                            <span className="system-settings__menu-label">{item.label}</span>
                        </div>
                    ))}
                </nav>
            </div>
            
            <div className="system-settings__content">
                <Card>{renderContent()}</Card>
            </div>
        </div>
    );
}
