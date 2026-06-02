/**
 * 全局顶部工具栏 — SD-WAN 专业设计
 * 包含：Logo + 搜索 + 通知 + 换肤 + 用户
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Badge, Avatar, Dropdown } from 'antd';
import {
    SearchOutlined,
    BellOutlined,
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
    DashboardOutlined,
    ApartmentOutlined,
    MonitorOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext.jsx';
// @ts-ignore - JSX module
import { ThemeToggleButton } from '../ThemeSwitcher/ThemeSwitcher';
import './GlobalHeader.css';

/** 顶部导航 Tab 配置 */
const TOP_NAV_ITEMS = [
    { key: '/',         label: '总览',     icon: <DashboardOutlined /> },
    { key: '/topology', label: '拓扑视图', icon: <ApartmentOutlined /> },
    { key: '/dashboard', label: '全网监控', icon: <MonitorOutlined /> },
];

/** 用户下拉菜单项 */
const getUserMenuItems = (onLogout) => [
    {
        key: 'profile',
        label: '个人信息',
        icon: <UserOutlined />,
    },
    {
        key: 'settings',
        label: '账号设置',
        icon: <SettingOutlined />,
    },
    {
        type: 'divider',
    },
    {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: onLogout,
    },
];

/**
 * 全局顶部工具栏组件
 */
export default function GlobalHeader({ onSidebarToggle, sidebarCollapsed }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchValue, setSearchValue] = useState('');
    const [notificationCount] = useState(3); // 模拟通知数量

    /** 判断 Tab 是否激活 */
    const isActiveTab = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    /** 处理用户菜单点击 */
    const handleUserMenuClick = ({ key }) => {
        if (key === 'logout') {
            logout();
        }
    };

    /** 处理搜索 */
    const handleSearch = (value) => {
        console.log('搜索:', value);
        // TODO: 实现全局搜索功能
    };

    return (
        <header className="global-header">
            {/* 左侧：Logo + 折叠按钮 */}
            <div className="global-header__left">
                {!sidebarCollapsed && (
                    <div className="global-header__logo">
                        <span className="global-header__logo-icon">SD</span>
                        <span className="global-header__logo-text">SD-WAN</span>
                    </div>
                )}
            </div>

            {/* 中间：主导航 Tab */}
            <nav className="global-header__nav">
                {TOP_NAV_ITEMS.map((item) => (
                    <div
                        key={item.key}
                        className={`global-header__nav-tab${isActiveTab(item.key) ? ' global-header__nav-tab--active' : ''}`}
                        onClick={() => navigate(item.key)}
                    >
                        <span className="global-header__nav-tab-icon">{item.icon}</span>
                        <span className="global-header__nav-tab-label">{item.label}</span>
                    </div>
                ))}
            </nav>

            {/* 右侧：通知 + 换肤 + 用户 */}
            <div className="global-header__right">
                {/* 通知 */}
                <div className="global-header__action">
                    <Badge count={notificationCount} size="small" offset={[-4, 4]}>
                        <button className="global-header__icon-btn" title="通知">
                            <BellOutlined />
                        </button>
                    </Badge>
                </div>

                {/* 换肤 */}
                <div className="global-header__action">
                    <ThemeToggleButton />
                </div>

                {/* 用户 */}
                {user && (
                    <div className="global-header__action global-header__user">
                        <Dropdown
                            menu={{
                                items: getUserMenuItems(logout),
                                onClick: handleUserMenuClick
                            }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <div className="global-header__user-info">
                                <Avatar
                                    size="small"
                                    icon={<UserOutlined />}
                                    style={{ backgroundColor: 'var(--accent-cyan)' }}
                                />
                                <span className="global-header__user-name">
                                    {user.full_name || user.username}
                                </span>
                            </div>
                        </Dropdown>
                    </div>
                )}
            </div>
        </header>
    );
}
