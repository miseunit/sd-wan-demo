/**
 * SD-WAN 全局布局 — 顶部工具栏 + 可折叠侧边栏 + 内容区
 * 专业设计：全局操作在顶部，导航在侧边栏
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Tooltip } from 'antd';
import {
    CloudServerOutlined,
    FileProtectOutlined,
    AlertOutlined,
    DesktopOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LinkOutlined,
    CaretRightOutlined,
    CaretDownOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import GlobalHeader from '../components/GlobalHeader/GlobalHeader';
import './AppLayout.css';

/* ============================================================
 *  菜单数据
 * ============================================================ */

interface SubMenuItem {
    key: string;
    label: string;
    path: string;
}

interface MenuItem {
    key: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    disabled?: boolean;
    group?: 'main' | 'future';
    children?: SubMenuItem[];
}

/** 侧边栏菜单项配置（仅管理类，拓扑/监控已在顶部导航） */
const menuItems: MenuItem[] = [
    { key: 'sites',     label: '站点管理',   icon: <CloudServerOutlined />, path: '/sites',     group: 'main' },
    { key: 'links',     label: '链路管理',   icon: <LinkOutlined />,        path: '/links',     group: 'main' },
    { key: 'devices',   label: '设备管理',   icon: <DesktopOutlined />,     path: '/devices',   group: 'main' },
    { key: 'policy',    label: '策略管理',   icon: <FileProtectOutlined />, path: '/policy',    group: 'main' },
    { key: 'smart-routing', label: '智能选路', icon: <ThunderboltOutlined />, path: '/smart-routing', group: 'main' },
    { key: 'alerts',    label: '告警中心',   icon: <AlertOutlined />,       path: '/alerts',    group: 'main' },
];

const STORAGE_KEY = 'sdwan-sidebar-collapsed';
const SUBMENU_KEY_PREFIX = 'sdwan-submenu-expanded-';

/**
 * 判断路径是否匹配菜单项
 */
function isActiveMenu(path: string, currentPathname: string): boolean {
    if (path === '/') return currentPathname === '/';
    return currentPathname.startsWith(path);
}

/**
 * 判断子菜单是否有激活项
 */
function hasActiveChild(children: SubMenuItem[], currentPathname: string): boolean {
    return children.some(child => isActiveMenu(child.path, currentPathname));
}

/**
 * 全局布局组件
 */
export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // 从 localStorage 恢复折叠状态
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // 子菜单展开状态管理
    const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem(SUBMENU_KEY_PREFIX + 'settings');
            return saved ? new Set([saved]) : new Set();
        } catch {
            return new Set();
        }
    });

    // 折叠状态变化时持久化
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(collapsed));
        } catch {
            // 忽略存储失败
        }
    }, [collapsed]);

    // 子菜单展开状态持久化
    useEffect(() => {
        try {
            expandedSubmenus.forEach(key => {
                localStorage.setItem(SUBMENU_KEY_PREFIX + key, 'true');
            });
            // 清除不再展开的
            menuItems.forEach(item => {
                if (item.children && !expandedSubmenus.has(item.key)) {
                    localStorage.removeItem(SUBMENU_KEY_PREFIX + item.key);
                }
            });
        } catch {
            // 忽略存储失败
        }
    }, [expandedSubmenus]);

    /** 切换折叠状态 */
    const handleToggle = () => {
        setCollapsed((prev) => !prev);
    };

    /** 切换子菜单展开状态 */
    const toggleSubmenu = (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedSubmenus(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    /** 菜单项点击 */
    const handleMenuClick = (path: string) => {
        navigate(path);
    };

    /** 渲染子菜单项 */
    const renderSubMenuItem = (child: SubMenuItem) => {
        const active = isActiveMenu(child.path, location.pathname);
        const activeClass = active ? ' app-submenu-item--active' : '';

        return (
            <div
                key={child.key}
                className={`app-submenu-item${activeClass}`}
                onClick={() => handleMenuClick(child.path)}
            >
                <span className="app-submenu-item__label">{child.label}</span>
            </div>
        );
    };

    /** 渲染单个菜单项 */
    const renderMenuItem = (item: MenuItem) => {
        if (item.children) {
            // 父菜单（有子菜单）
            const isExpanded = expandedSubmenus.has(item.key);
            const hasActive = hasActiveChild(item.children, location.pathname);
            const activeClass = hasActive ? ' app-menu-item--active' : '';

            return (
                <div key={item.key} className={`app-menu-parent${activeClass}`}>
                    <div
                        className="app-menu-item"
                        onClick={(e) => toggleSubmenu(item.key, e)}
                    >
                        <span className="app-menu-item__icon">{item.icon}</span>
                        <span className="app-menu-item__label">{item.label}</span>
                        {!collapsed && (
                            <span className="app-menu-item__arrow">
                                {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                            </span>
                        )}
                    </div>
                    {!collapsed && isExpanded && (
                        <div className="app-submenu">
                            {item.children.map(child => renderSubMenuItem(child))}
                        </div>
                    )}
                </div>
            );
        }

        // 普通菜单项
        const active = item.path && isActiveMenu(item.path, location.pathname);
        const disabledClass = item.disabled ? ' app-menu-item--disabled' : '';
        const activeClass = active ? ' app-menu-item--active' : '';

        const content = (
            <div
                className={`app-menu-item${activeClass}${disabledClass}`}
                onClick={() => item.path && handleMenuClick(item.path)}
            >
                <span className="app-menu-item__icon">{item.icon}</span>
                <span className="app-menu-item__label">{item.label}</span>
            </div>
        );

        // 折叠态下用 Tooltip 显示菜单名
        if (collapsed && !item.disabled) {
            return (
                <Tooltip key={item.key} title={item.label} placement="right">
                    {content}
                </Tooltip>
            );
        }

        return <div key={item.key}>{content}</div>;
    };

    /** 渲染菜单列表 */
    const renderMenu = () => {
        const mainItems = menuItems.filter((i) => i.group === 'main');
        const futureItems = menuItems.filter((i) => i.group === 'future');

        return (
            <>
                {mainItems.map(renderMenuItem)}
                {futureItems.length > 0 && (
                    <>
                        <div className="app-menu-divider" />
                        {futureItems.map(renderMenuItem)}
                    </>
                )}
            </>
        );
    };

    return (
        <div className="app-layout">
            {/* 顶部全局工具栏 */}
            <GlobalHeader
                onSidebarToggle={handleToggle}
                sidebarCollapsed={collapsed}
            />

            {/* 主内容区域 */}
            <div className="app-layout__main">
                {/* 侧边栏 */}
                <aside className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}>
                    {/* 品牌区 */}
                    <div className="app-sidebar__brand">
                        <span className="app-sidebar__brand-logo">SD</span>
                        <span className="app-sidebar__brand-text">SD-WAN</span>
                    </div>

                    {/* 导航区 */}
                    <nav className="app-sidebar__nav">
                        {renderMenu()}
                    </nav>

                    {/* 底部折叠按钮 */}
                    <div className="app-sidebar__footer">
                        <div className="app-sidebar__toggle" onClick={handleToggle}>
                            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        </div>
                    </div>
                </aside>

                {/* 内容区 */}
                <main className="app-layout__content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
