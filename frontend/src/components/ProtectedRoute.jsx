/**
 * 受保护路由组件
 * 用于保护需要登录才能访问的页面
 * 未登录用户会被重定向到登录页
 */

import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute 组件
 * 未登录用户访问受保护页面时会被重定向到登录页
 * 使用 Outlet 渲染嵌套的子路由
 */
function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

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

    // 未登录，重定向到登录页
    if (!isAuthenticated) {
        // 保存原始路径，登录后跳回
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 已登录，渲染子路由
    return <Outlet />;
}

export default ProtectedRoute;
