/**
 * Token 存储和管理工具（生产环境版本）
 * 使用内存 + sessionStorage 组合策略：
 * - 内存存储用于快速访问
 * - sessionStorage 用于页面刷新后恢复（关闭标签页自动清除）
 * - 生产环境建议配合 httpOnly cookie 存储 refresh_token
 */

// Token 存储键名
const ACCESS_TOKEN_KEY = 'sdwan_access_token';
const REFRESH_TOKEN_KEY = 'sdwan_refresh_token';
const CSRF_TOKEN_KEY = 'sdwan_csrf_token';

// 内存缓存（页面刷新后丢失，更安全）
let memoryAccessToken = null;
let memoryRefreshToken = null;

/**
 * 获取访问令牌
 * 优先从内存读取，回退到 sessionStorage
 * @returns {string|null}
 */
export function getAccessToken() {
    try {
        if (memoryAccessToken) {
            return memoryAccessToken;
        }
        const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
            memoryAccessToken = token;
        }
        return token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        return null;
    }
}

/**
 * 设置访问令牌
 * 同时写入内存和 sessionStorage
 * @param {string} token
 */
export function setAccessToken(token) {
    try {
        memoryAccessToken = token;
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (error) {
        console.error('设置访问令牌失败:', error);
    }
}

/**
 * 获取刷新令牌
 * @returns {string|null}
 */
export function getRefreshToken() {
    try {
        if (memoryRefreshToken) {
            return memoryRefreshToken;
        }
        const token = sessionStorage.getItem(REFRESH_TOKEN_KEY);
        if (token) {
            memoryRefreshToken = token;
        }
        return token;
    } catch (error) {
        console.error('获取刷新令牌失败:', error);
        return null;
    }
}

/**
 * 设置刷新令牌
 * @param {string} token
 */
export function setRefreshToken(token) {
    try {
        memoryRefreshToken = token;
        sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
        console.error('设置刷新令牌失败:', error);
    }
}

/**
 * 设置 CSRF Token
 * @param {string} token
 */
export function setCsrfToken(token) {
    try {
        sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    } catch (error) {
        console.error('设置 CSRF Token 失败:', error);
    }
}

/**
 * 获取 CSRF Token
 * @returns {string|null}
 */
export function getCsrfToken() {
    try {
        return sessionStorage.getItem(CSRF_TOKEN_KEY);
    } catch (error) {
        console.error('获取 CSRF Token 失败:', error);
        return null;
    }
}

/**
 * 清除所有令牌
 */
export function clearTokens() {
    try {
        // 清除内存缓存
        memoryAccessToken = null;
        memoryRefreshToken = null;
        // 清除 sessionStorage
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(CSRF_TOKEN_KEY);
    } catch (error) {
        console.error('清除令牌失败:', error);
    }
}

/**
 * 检查是否有有效的访问令牌
 * @returns {boolean}
 */
export function hasAccessToken() {
    const token = getAccessToken();
    return !!token && token !== 'null' && token !== 'undefined';
}

/**
 * 检查是否有有效的刷新令牌
 * @returns {boolean}
 */
export function hasRefreshToken() {
    const token = getRefreshToken();
    return !!token && token !== 'null' && token !== 'undefined';
}

/**
 * 解码 JWT Token（不验证签名）
 * @param {string} token
 * @returns {object|null}
 */
export function decodeJWT(token) {
    try {
        if (!token || typeof token !== 'string') return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('解码 Token 失败:', error);
        return null;
    }
}

/**
 * 检查 Token 是否已过期
 * @param {string} token
 * @param {number} bufferSeconds - 提前过期的秒数（默认 60 秒）
 * @returns {boolean}
 */
export function isTokenExpired(token, bufferSeconds = 60) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }
    // 提前 bufferSeconds 秒认为过期，避免边界情况
    const expirationTime = (payload.exp - bufferSeconds) * 1000;
    return Date.now() >= expirationTime;
}
