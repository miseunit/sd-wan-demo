/// <reference types="vite/client" />

declare module '*.css';

// 项目中 JS 模块的类型声明
declare module '*.js' {
    const content: any;
    export default content;
    export const get: (url: string, options?: RequestInit) => Promise<any>;
    export const post: (url: string, data?: any, options?: RequestInit) => Promise<any>;
    export const put: (url: string, data?: any, options?: RequestInit) => Promise<any>;
    export const patch: (url: string, data?: any, options?: RequestInit) => Promise<any>;
    export const del: (url: string, options?: RequestInit) => Promise<any>;
    export const upload: (url: string, formData: FormData) => Promise<any>;
    export const apiFetch: (url: string, options?: RequestInit, config?: any) => Promise<any>;
    export const API_BASE: string;
}
