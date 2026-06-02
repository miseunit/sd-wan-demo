/**
 * 公开路由组件
 * 用于登录/注册等公开页面
 * 已登录用户访问这些页面时会被重定向到首页
 */

import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

/**
 * PublicRoute 组件
 * 已登录用户访问登录/注册页面时会被重定向到首页
 * 使用 Outlet 渲染嵌套的子路由
 */
function PublicRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    // 显示加载状态
    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'var(--bg-primary)',
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    // 已登录，重定向到首页
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // 未登录，渲染子路由
    return <Outlet />;
}

export default PublicRoute;
