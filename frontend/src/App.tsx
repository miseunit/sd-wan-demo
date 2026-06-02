import { Routes, Route } from 'react-router-dom';
// @ts-ignore - JSX module
import ProtectedRoute from './components/ProtectedRoute.jsx';
// @ts-ignore - JSX module
import PublicRoute from './components/PublicRoute.jsx';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import TopologyView from './pages/TopologyView';
import SiteManagement from './pages/SiteManagement';
import Dashboard from './pages/Dashboard';
import LinkManagement from './pages/LinkManagement';
import PolicyManagement from './pages/PolicyManagement';
import SmartRouting from './pages/SmartRouting';
import AlertCenter from './pages/AlertCenter';
import DeviceManagement from './pages/DeviceManagement';
import SystemSettings from './pages/SystemSettings';
// @ts-ignore - JSX module
import Login from './pages/Login/index.jsx';
// @ts-ignore - JSX module
import Register from './pages/Register/index.jsx';

/**
 * 主应用组件 — 路由入口
 * 所有页面嵌套在 AppLayout 中，共享侧边栏导航
 * 支持深色/浅色主题切换
 */
function App() {
    return (
        <Routes>
            {/* 公开路由 - 登录/注册 */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* 受保护路由 - 需要登录 */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sites" element={<SiteManagement />} />
                    <Route path="/links" element={<LinkManagement />} />
                    <Route path="/policy" element={<PolicyManagement />} />
                    <Route path="/smart-routing" element={<SmartRouting />} />
                    <Route path="/alerts" element={<AlertCenter />} />
                    <Route path="/devices" element={<DeviceManagement />} />
                    <Route path="/topology" element={<TopologyView />} />
                    <Route path="/settings" element={<SystemSettings />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;
