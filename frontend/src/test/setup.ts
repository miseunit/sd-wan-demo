/**
 * 测试全局设置
 */
import '@testing-library/jest-dom';

// Mock window.matchMedia（jsdom 环境不支持，Ant Design 依赖此 API）
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});
