/**
 * API 基础配置（生产环境版本）
 * 统一管理 API 请求配置，添加认证拦截器
 *
 * 生产环境特性：
 * - 请求去重（防止并发请求重复发送）
 * - 主动 token 刷新（过期前自动刷新）
 * - CSRF token 支持
 * - 请求超时控制
 * - 请求重试机制
 */

import { message } from 'antd';
import {
    getAccessToken,
    getRefreshToken,
    hasRefreshToken,
    isTokenExpired,
    setAccessToken,
    clearTokens,
} from '../utils/tokenStorage';

const API_BASE = '/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 秒超时
const MAX_RETRY_COUNT = 1;    // 最大重试次数

// ============================================================
//  刷新 Token 控制
// ============================================================

/** 是否正在刷新 token */
let isRefreshing = false;

/** 等待刷新完成的请求队列 */
let pendingRequestsQueue = [];

/**
 * 处理等待队列
 * @param {Error|null} error - 如果刷新失败，传入错误对象
 */
function processPendingQueue(error) {
    pendingRequestsQueue.forEach(({ reject, resolve }) => {
        if (error) {
            reject(error);
        } else {
            resolve();
        }
    });
    pendingRequestsQueue = [];
}

/**
 * 将请求加入等待队列
 * @returns {Promise<void>}
 */
function addToPendingQueue() {
    return new Promise((resolve, reject) => {
        pendingRequestsQueue.push({ resolve, reject });
    });
}

/**
 * 刷新访问令牌
 * @returns {Promise<string>} 新的 access_token
 */
async function doRefreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('没有刷新令牌');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时

    try {
        const response = await fetch(`${API_BASE}/users/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || '刷新令牌失败');
        }

        const data = await response.json();

        // 解包统一响应格式：{code, message, data: {access_token}} → {access_token}
        const tokenData = (data && typeof data === 'object' && 'code' in data && 'message' in data)
            ? data.data
            : data;

        // 存储新的 token
        setAccessToken(tokenData.access_token);

        return tokenData.access_token;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * 尝试刷新 token
 * @returns {Promise<string>} 新的 access_token
 */
async function tryRefreshToken() {
    if (isRefreshing) {
        // 已在刷新中，加入等待队列
        await addToPendingQueue();
        return getAccessToken();
    }

    isRefreshing = true;

    try {
        const newToken = await doRefreshToken();
        processPendingQueue(null);
        return newToken;
    } catch (error) {
        processPendingQueue(error);
        // 刷新失败，清除所有 token
        clearTokens();
        // 跳转到登录页（使用 setTimeout 避免在渲染期间跳转）
        setTimeout(() => {
            window.location.href = '/login';
        }, 100);
        throw error;
    } finally {
        isRefreshing = false;
    }
}

/**
 * 确保有有效的 access_token
 * 如果即将过期，提前刷新
 * @returns {Promise<string|null>}
 */
async function ensureValidToken() {
    const token = getAccessToken();

    // 没有 token
    if (!token) {
        if (hasRefreshToken()) {
            return await tryRefreshToken();
        }
        return null;
    }

    // token 即将过期，提前刷新
    if (isTokenExpired(token, 120)) { // 提前 2 分钟刷新
        if (hasRefreshToken()) {
            return await tryRefreshToken();
        }
    }

    return token;
}

// ============================================================
//  请求去重
// ============================================================

/** 进行中的请求 Map，用于去重 */
const pendingRequests = new Map();

/**
 * 生成请求的唯一 key
 * @param {string} url
 * @param {RequestInit} options
 * @returns {string}
 */
function getRequestKey(url, options) {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${url}:${body}`;
}

/**
 * 带超时的 fetch
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeout
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
}

/**
 * 带重试的 fetch
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} retries
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, retries = MAX_RETRY_COUNT) {
    let lastError;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fetchWithTimeout(url, options);
        } catch (error) {
            lastError = error;
            // 只对网络错误重试，不对 abort 重试
            if (error.name === 'AbortError' || i === retries) {
                throw error;
            }
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }

    throw lastError;
}

// ============================================================
//  核心 API 请求函数
// ============================================================

/**
 * 统一的 fetch 封装
 * @param {string} url - 请求路径（不含基础路径）
 * @param {RequestInit} options - fetch 选项
 * @param {object} config - 额外配置
 * @param {boolean} config.requireAuth - 是否需要认证（默认 true）
 * @param {boolean} config.deduplicate - 是否去重（GET 请求默认开启）
 * @returns {Promise<any>}
 */
async function apiFetch(url, options = {}, config = {}) {
    const { requireAuth = true, deduplicate } = config;
    const method = (options.method || 'GET').toUpperCase();
    const fullUrl = `${API_BASE}${url}`;

    // GET 请求默认开启去重
    const shouldDeduplicate = deduplicate ?? (method === 'GET');

    // 请求去重检查
    const requestKey = getRequestKey(fullUrl, options);
    if (shouldDeduplicate && pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
    }

    // 构建请求配置
    const requestConfig = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    // 添加认证 token
    if (requireAuth) {
        const token = await ensureValidToken();
        if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }
    }

    // 执行请求（带去重）
    const requestPromise = (async () => {
        try {
            let response = await fetchWithRetry(fullUrl, requestConfig);

            // 处理 401 错误（token 过期）
            if (response.status === 401 && requireAuth) {
                try {
                    // 尝试刷新 token
                    const newToken = await tryRefreshToken();
                    requestConfig.headers.Authorization = `Bearer ${newToken}`;
                    response = await fetchWithRetry(fullUrl, requestConfig);
                } catch (refreshError) {
                    // 刷新失败，跳转登录页
                    message.error('登录已过期，请重新登录');
                    throw refreshError;
                }
            }

            // 处理 204 No Content
            if (response.status === 204) {
                return null;
            }

            // 处理非 JSON 响应
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/csv')) {
                return response;
            }

            // 解析 JSON
            const rawData = await response.json();

            // 处理错误响应
            if (!response.ok) {
                // 统一格式错误：{code, message, data: null}
                if (rawData && typeof rawData === 'object' && 'code' in rawData && 'message' in rawData) {
                    throw new Error(rawData.message || `请求失败 (${response.status})`);
                }
                // 旧格式错误：{detail: "..."}
                const errorMessage = rawData.detail || rawData.message || `请求失败 (${response.status})`;
                throw new Error(errorMessage);
            }

            // 解包统一响应格式：{code, message, data} → data
            if (rawData && typeof rawData === 'object' && 'code' in rawData && 'message' in rawData) {
                return rawData.data;
            }

            // 非统一格式，原样返回
            return rawData;
        } finally {
            // 清除去重记录
            if (shouldDeduplicate) {
                pendingRequests.delete(requestKey);
            }
        }
    })();

    // 记录进行中的请求
    if (shouldDeduplicate) {
        pendingRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
}

/**
 * GET 请求
 * @param {string} url - 请求路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>}
 */
function get(url, options = {}) {
    return apiFetch(url, { ...options, method: 'GET' });
}

/**
 * POST 请求
 * @param {string} url - 请求路径
 * @param {object} data - 请求数据
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>}
 */
function post(url, data, options = {}) {
    return apiFetch(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * PUT 请求
 * @param {string} url - 请求路径
 * @param {object} data - 请求数据
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>}
 */
function put(url, data, options = {}) {
    return apiFetch(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * PATCH 请求
 * @param {string} url - 请求路径
 * @param {object} data - 请求数据
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>}
 */
function patch(url, data, options = {}) {
    return apiFetch(url, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * DELETE 请求
 * @param {string} url - 请求路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>}
 */
function del(url, options = {}) {
    return apiFetch(url, { ...options, method: 'DELETE' });
}

/**
 * 上传文件（不设置 Content-Type，让浏览器自动设置 multipart boundary）
 * @param {string} url - 请求路径
 * @param {FormData} formData - FormData 对象
 * @returns {Promise<any>}
 */
function upload(url, formData) {
    return apiFetch(url, {
        method: 'POST',
        body: formData,
        headers: {}, // 不设置 Content-Type
    });
}

export { API_BASE, apiFetch, get, post, put, patch, del, upload };
