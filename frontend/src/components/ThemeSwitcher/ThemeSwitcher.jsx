import React from 'react';
import { Switch } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTheme, THEME_TYPES } from '../../contexts/ThemeContext';
import './ThemeSwitcher.css';

/**
 * 主题切换器组件
 * 提供深色/浅色主题切换功能
 */
const ThemeSwitcher = ({
    size = 'default',
    showLabels = false,
    placement = 'right'
}) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === THEME_TYPES.DARK;

    const handleChange = (checked) => {
        // checked = true 表示浅色主题
        const newTheme = checked ? THEME_TYPES.LIGHT : THEME_TYPES.DARK;
        if (newTheme !== theme) {
            toggleTheme();
        }
    };

    return (
        <div className={`theme-switcher theme-switcher--${placement}`}>
            {showLabels && (
                <span className="theme-switcher__label">
                    {isDark ? '深色' : '浅色'}
                </span>
            )}
            <Switch
                size={size}
                checked={!isDark}
                onChange={handleChange}
                checkedChildren={<SunOutlined />}
                unCheckedChildren={<MoonOutlined />}
                className="theme-switcher__switch"
            />
        </div>
    );
};

/**
 * 主题切换按钮组件
 * 使用图标按钮形式，更适合工具栏
 */
export const ThemeToggleButton = ({
    size = 'middle',
    iconOnly = true
}) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === THEME_TYPES.DARK;

    const handleClick = () => {
        toggleTheme();
    };

    return (
        <button
            className="theme-toggle-button"
            onClick={handleClick}
            title={isDark ? '切换到浅色主题' : '切换到深色主题'}
            aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
        >
            <span className="theme-toggle-button__icon">
                {isDark ? <SunOutlined /> : <MoonOutlined />}
            </span>
            {!iconOnly && (
                <span className="theme-toggle-button__label">
                    {isDark ? '浅色' : '深色'}
                </span>
            )}
        </button>
    );
};

export default ThemeSwitcher;
