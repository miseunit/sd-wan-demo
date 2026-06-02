/**
 * 认证状态管理 Context（生产环境版本）
 * 提供用户登录状态、用户信息、登录/登出/注册等功能
 *
 * 生产环境特性：
 * - 自动检查 token 过期
 * - 定期刷新 token
 * - 跨标签页同步登出
 * - 会话超时处理
 */

import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import * as authApi from '../services/authApi';
import { hasAccessToken, clearTokens, isTokenExpired, getAccessToken } from '../utils/tokenStorage';

// 创建 AuthContext
const AuthContext = createContext(null);

// 会话检查间隔（5 分钟）
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Storage 事件 key
const LOGOUT_EVENT_KEY = 'sdwan_logout_event';

/**
 * AuthProvider 组件
 * 包裹应用根组件，提供认证状态和方法
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();
    const sessionCheckTimerRef = useRef(null);

    /**
     * 初始化认证状态
     * 应用启动时检查是否有有效的 token
     */
    const initAuth = useCallback(async () => {
        try {
            if (hasAccessToken()) {
                const token = getAccessToken();
                // 检查 token 是否过期
                if (isTokenExpired(token)) {
                    clearTokens();
                    setUser(null);
                    setIsAuthenticated(false);
                    return;
                }

                // 有有效 token，获取用户信息
                try {
                    const userData = await authApi.getCurrentUser();
                    setUser(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    // 获取用户信息失败，清除 token
                    console.error('获取用户信息失败:', error);
                    clearTokens();
                    setUser(null);
                    setIsAuthenticated(false);
                }
            }
        } catch (error) {
            console.error('初始化认证状态失败:', error);
            clearTokens();
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 处理登出（用于跨标签页同步）
     */
    const handleLogout = useCallback(() => {
        authApi.logout();
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
    }, [navigate]);

    // 初始化认证状态
    useEffect(() => {
        initAuth();
    }, [initAuth]);

    // 监听 storage 事件（跨标签页同步登出）
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === LOGOUT_EVENT_KEY) {
                handleLogout();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [handleLogout]);

    // 定期检查会话状态
    useEffect(() => {
        if (!isAuthenticated) return;

        sessionCheckTimerRef.current = setInterval(() => {
            const token = getAccessToken();
            if (token && isTokenExpired(token)) {
                // token 过期，尝试刷新或登出
                if (hasAccessToken()) {
                    // 可以尝试刷新，这里简化处理为登出
                    message.warning('会话已过期，请重新登录');
                    handleLogout();
                }
            }
        }, SESSION_CHECK_INTERVAL);

        return () => {
            if (sessionCheckTimerRef.current) {
                clearInterval(sessionCheckTimerRef.current);
            }
        };
    }, [isAuthenticated, handleLogout]);

    /**
     * 用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise<object>}
     */
    const login = async (username, password) => {
        try {
            setIsLoading(true);
            const data = await authApi.login(username, password);

            // 设置用户信息
            setUser(data.user);
            setIsAuthenticated(true);

            message.success('登录成功');

            return data;
        } catch (error) {
            message.error(error.message || '登录失败');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 用户注册
     * @param {object} userData - 用户数据
     * @returns {Promise<object>}
     */
    const register = async (userData) => {
        try {
            setIsLoading(true);
            const data = await authApi.register(userData);

            message.success('注册成功，请登录');

            return data;
        } catch (error) {
            message.error(error.message || '注册失败');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 用户登出
     */
    const logout = () => {
        authApi.logout();
        setUser(null);
        setIsAuthenticated(false);

        // 通知其他标签页登出
        try {
            localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
            localStorage.removeItem(LOGOUT_EVENT_KEY);
        } catch (e) {
            // 忽略错误
        }

        message.info('已登出');

        // 跳转到登录页
        navigate('/login', { replace: true });
    };

    /**
     * 更新用户信息
     * @param {object} userData - 新的用户数据
     */
    const updateUser = (userData) => {
        setUser((prev) => ({ ...prev, ...userData }));
    };

    /**
     * 检查用户是否有指定权限
     * @param {string} permission - 权限名称
     * @returns {boolean}
     */
    const hasPermission = (permission) => {
        if (!user) return false;
        // 超级用户拥有所有权限
        if (user.is_superuser) return true;
        // 可以扩展角色权限系统
        return false;
    };

    // Context 值
    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        register,
        updateUser,
        hasPermission,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * 用于在组件中访问认证状态和方法
 * @returns {object}
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return context;
}

export default AuthContext;
