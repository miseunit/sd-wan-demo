import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { theme as antdTheme } from 'antd';

/**
 * 主题类型
 */
export const THEME_TYPES = {
    DARK: 'dark',
    LIGHT: 'light',
};

/**
 * 主题 Context
 */
const ThemeContext = createContext({
    theme: THEME_TYPES.DARK,
    toggleTheme: () => {},
    setTheme: () => {},
});

/**
 * 主题 Provider
 * 提供主题切换功能和当前主题状态
 */
export const ThemeProvider = ({ children }) => {
    // 从 localStorage 读取保存的主题，默认为深色
    const [theme, setThemeState] = useState(() => {
        const savedTheme = localStorage.getItem('sdwan-theme');
        return savedTheme || THEME_TYPES.DARK;
    });

    /**
     * 切换主题
     */
    const toggleTheme = useCallback(() => {
        setThemeState(prevTheme => {
            const newTheme = prevTheme === THEME_TYPES.DARK ? THEME_TYPES.LIGHT : THEME_TYPES.DARK;
            localStorage.setItem('sdwan-theme', newTheme);
            return newTheme;
        });
    }, []);

    /**
     * 设置指定主题
     */
    const setTheme = useCallback((themeType) => {
        if (Object.values(THEME_TYPES).includes(themeType)) {
            setThemeState(themeType);
            localStorage.setItem('sdwan-theme', themeType);
        }
    }, []);

    // 应用主题到 document
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // 触发主题变更事件，供其他组件监听
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
    }, [theme]);

    const value = {
        theme,
        toggleTheme,
        setTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * 使用主题 Hook
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

/**
 * Ant Design 主题配置
 * 根据当前主题返回对应的 Ant Design 主题配置
 */
export const getAntdTheme = (theme) => {
    const darkThemeConfig = {
        algorithm: antdTheme.darkAlgorithm,
        token: {
            // 主色
            colorPrimary: '#00b4d8',
            colorSuccess: '#00ff88',
            colorWarning: '#ffdd00',
            colorError: '#ff4444',
            colorInfo: '#7b61ff',

            // 背景色
            colorBgBase: '#060b1a',
            colorBgContainer: '#0d1330',
            colorBgElevated: '#111a3a',
            colorBgLayout: '#060b1a',

            // 边框色
            colorBorder: '#1a2555',
            colorBorderSecondary: '#1a2555',

            // 文本色
            colorText: '#e0e0e0',
            colorTextSecondary: '#8892b0',
            colorTextTertiary: '#555e7a',
            colorTextQuaternary: '#3d4663',

            // 其他
            borderRadius: 6,
            fontSize: 14,
        },
        components: {
            Button: {
                defaultBorderColor: '#1a2555',
                defaultBg: '#0d1330',
                defaultColor: '#e0e0e0',
            },
            Input: {
                colorBgContainer: '#0d1330',
                colorBorder: '#1a2555',
                colorText: '#e0e0e0',
            },
            Table: {
                colorBgContainer: '#0d1330',
                headerColor: '#8892b0',
            },
        },
    };

    const lightThemeConfig = {
        algorithm: antdTheme.defaultAlgorithm,
        token: {
            // 主色
            colorPrimary: '#0066cc',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',

            // 背景色
            colorBgBase: '#f5f7fa',
            colorBgContainer: '#ffffff',
            colorBgElevated: '#ffffff',
            colorBgLayout: '#f5f7fa',

            // 边框色
            colorBorder: '#d9d9d9',
            colorBorderSecondary: '#e8e8e8',

            // 文本色
            colorText: '#1a1a2e',
            colorTextSecondary: '#5a5a6e',
            colorTextTertiary: '#8a8a9e',
            colorTextQuaternary: '#aaaabf',

            // 其他
            borderRadius: 6,
            fontSize: 14,
        },
        components: {
            Button: {
                defaultBorderColor: '#d9d9d9',
                defaultBg: '#ffffff',
                defaultColor: '#1a1a2e',
            },
            Input: {
                colorBgContainer: '#ffffff',
                colorBorder: '#d9d9d9',
                colorText: '#1a1a2e',
            },
            Table: {
                colorBgContainer: '#ffffff',
                headerColor: '#5a5a6e',
            },
        },
    };

    return theme === THEME_TYPES.DARK ? darkThemeConfig : lightThemeConfig;
};
