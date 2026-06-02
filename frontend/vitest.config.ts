/**
 * Vitest 测试配置
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // 使用 jsdom 模拟浏览器环境
        environment: 'jsdom',

        // 全局测试 API（describe, it, expect 等无需导入）
        globals: true,

        // 测试设置文件
        setupFiles: ['./src/test/setup.ts'],

        // 覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
            ],
        },
    },
});
