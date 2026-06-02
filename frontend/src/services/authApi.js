/**
 * 认证相关的 API 调用（生产环境版本）
 * 封装登录、注册、获取当前用户等认证相关的 API
 *
 * 生产环境特性：
 * - 登录失败次数限制
 * - 密码强度验证
 * - 请求签名（可选）
 */

import { get, post } from './api';
import {
    setAccessToken,
    setRefreshToken,
    clearTokens,
    hasAccessToken,
    getAccessToken,
    isTokenExpired,
} from '../utils/tokenStorage';

const API_BASE = '/api/v1';

// 登录失败次数限制
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 分钟

/** 登录失败计数器 */
let loginFailCount = 0;
let lastLoginFailTime = 0;

/**
 * 检查登录是否被锁定
 * @returns {boolean}
 */
function isLoginLocked() {
    if (loginFailCount < MAX_LOGIN_ATTEMPTS) return false;

    const now = Date.now();
    if (now - lastLoginFailTime > LOGIN_LOCKOUT_DURATION) {
        // 锁定时间已过，重置计数
        loginFailCount = 0;
        return false;
    }
    return true;
}

/**
 * 获取剩余锁定时间（秒）
 * @returns {number}
 */
function getLockoutRemaining() {
    if (!isLoginLocked()) return 0;
    const remaining = LOGIN_LOCKOUT_DURATION - (Date.now() - lastLoginFailTime);
    return Math.ceil(remaining / 1000);
}

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<object>}
 */
export async function login(username, password) {
    // 检查是否被锁定
    if (isLoginLocked()) {
        const remaining = getLockoutRemaining();
        throw new Error(`登录尝试次数过多，请 ${remaining} 秒后重试`);
    }

    // 参数验证
    if (!username || username.length < 3) {
        throw new Error('用户名至少需要 3 个字符');
    }
    if (!password || password.length < 6) {
        throw new Error('密码至少需要 6 个字符');
    }

    try {
        // 使用 FormData 格式发送登录请求（OAuth2 规范）
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 秒超时

        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            // 记录登录失败
            loginFailCount++;
            lastLoginFailTime = Date.now();
            // 统一格式错误：{code, message, data: null}
            const errMsg = (errData && typeof errData === 'object' && 'message' in errData)
                ? errData.message
                : (errData.detail || '用户名或密码错误');
            throw new Error(errMsg);
        }

        const rawData = await response.json();

        // 解包统一响应格式：{code, message, data: {access_token, ...}} → {access_token, ...}
        const data = (rawData && typeof rawData === 'object' && 'code' in rawData && 'message' in rawData)
            ? rawData.data
            : rawData;

        // 登录成功，重置失败计数
        loginFailCount = 0;

        // 存储 token
        setAccessToken(data.access_token);
        if (data.refresh_token) {
            setRefreshToken(data.refresh_token);
        }

        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('登录请求超时，请检查网络连接');
        }
        console.error('登录错误:', error);
        throw error;
    }
}

/**
 * 用户注册
 * @param {object} userData - 用户数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.email - 邮箱
 * @param {string} userData.password - 密码
 * @param {string} [userData.full_name] - 全名（可选）
 * @returns {Promise<object>}
 */
export async function register(userData) {
    // 参数验证
    if (!userData.username || userData.username.length < 3) {
        throw new Error('用户名至少需要 3 个字符');
    }
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw new Error('请输入有效的邮箱地址');
    }
    if (!userData.password || userData.password.length < 6) {
        throw new Error('密码至少需要 6 个字符');
    }

    try {
        const data = await post('/users/register', userData, { requireAuth: false });
        return data;
    } catch (error) {
        console.error('注册错误:', error);
        throw error;
    }
}

/**
 * 获取当前登录用户信息
 * @returns {Promise<object>}
 */
export async function getCurrentUser() {
    try {
        const data = await get('/users/me');
        return data;
    } catch (error) {
        console.error('获取当前用户错误:', error);
        throw error;
    }
}

/**
 * 用户登出
 * 清除本地存储的 token
 */
export function logout() {
    clearTokens();
    loginFailCount = 0;
    lastLoginFailTime = 0;
}

/**
 * 检查用户是否已登录
 * @returns {boolean}
 */
export function isLoggedIn() {
    if (!hasAccessToken()) return false;
    // 检查 token 是否已过期
    const token = getAccessToken();
    return !isTokenExpired(token);
}

/**
 * 获取密码强度建议
 * @param {string} password
 * @returns {object}
 */
export function checkPasswordStrength(password) {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
        score,
        level: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong',
        checks,
        suggestion: !checks.length ? '密码至少需要 8 个字符' :
                    !checks.uppercase ? '建议添加大写字母' :
                    !checks.number ? '建议添加数字' :
                    !checks.special ? '建议添加特殊字符' : '密码强度良好',
    };
}
