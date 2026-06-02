# 主题系统使用示例

## 1. 页面级主题切换按钮

```jsx
// src/pages/SystemSettings/SystemSettings.tsx
import { ThemeToggleButton } from '@/components/ThemeSwitcher/ThemeSwitcher';

export default function SystemSettings() {
    return (
        <div className="system-settings">
            <div className="settings-header">
                <h1>系统设置</h1>
                <ThemeToggleButton />
            </div>
            {/* 设置内容 */}
        </div>
    );
}
```

## 2. 工具栏中的主题切换

```jsx
// src/components/Toolbar/Toolbar.jsx
import { ThemeToggleButton } from '@/components/ThemeSwitcher/ThemeSwitcher';

export default function Toolbar({ onSearch, onRefresh }) {
    return (
        <div className="toolbar">
            <div className="toolbar__left">
                <Button icon={<SearchOutlined />} onClick={onSearch}>
                    搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                    刷新
                </Button>
            </div>
            <div className="toolbar__right">
                <ThemeToggleButton />
            </div>
        </div>
    );
}
```

## 3. 响应式组件样式

```css
/* src/pages/SystemSettings/SystemSettings.css */

/* 深色主题样式 */
[data-theme="dark"] .system-settings {
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* 浅色主题样式 */
[data-theme="light"] .system-settings {
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* 通用样式 */
.system-settings {
    min-height: 100vh;
    padding: 24px;
    transition: background 0.3s ease, color 0.3s ease;
}

.settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border-primary);
}
```

## 4. 卡片组件适配

```jsx
// src/components/StatusCard/StatusCard.jsx
import './StatusCard.css';

export default function StatusCard({ title, value, status }) {
    return (
        <div className={`status-card status-card--${status}`}>
            <h3 className="status-card__title">{title}</h3>
            <p className="status-card__value">{value}</p>
            <span className={`status-card__indicator status-card__indicator--${status}`} />
        </div>
    );
}
```

```css
/* src/components/StatusCard/StatusCard.css */

.status-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--shadow-md);
    transition: all 0.2s ease;
}

.status-card:hover {
    border-color: var(--border-active);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.status-card__title {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--text-secondary);
}

.status-card__value {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.status-card__indicator {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.status-card__indicator--online {
    background: var(--accent-green);
    box-shadow: 0 0 8px var(--glow-green);
}

.status-card__indicator--warning {
    background: var(--accent-yellow);
    box-shadow: 0 0 8px var(--glow-yellow);
}

.status-card__indicator--offline {
    background: var(--accent-red);
    box-shadow: 0 0 8px var(--glow-red);
}
```

## 5. 表格组件适配

```css
/* src/components/DataTable/DataTable.css */

.data-table {
    background: var(--bg-card);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    overflow: hidden;
}

.data-table table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 2px solid var(--border-primary);
}

.data-table td {
    color: var(--text-primary);
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-secondary);
}

.data-table tr:hover {
    background: var(--bg-elevated);
}

.data-table tr:last-child td {
    border-bottom: none;
}
```

## 6. 模态框适配

```jsx
// src/components/ConfirmModal/ConfirmModal.jsx
import { Modal } from 'antd';

export default function ConfirmModal({ visible, onConfirm, onCancel }) {
    return (
        <Modal
            title="确认操作"
            open={visible}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="确认"
            cancelText="取消"
        >
            <p>确定要执行此操作吗？</p>
        </Modal>
    );
}
```

注意：Ant Design 的 Modal 组件会自动通过 ConfigProvider 适配主题。

## 7. 图表颜色适配

```jsx
// src/components/TrafficChart/TrafficChart.jsx
import { useTheme } from '@/contexts/ThemeContext';
import { Line } from '@ant-design/charts';

export default function TrafficChart({ data }) {
    const { theme } = useTheme();
    
    const isDark = theme === 'dark';
    
    const config = {
        data: data,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
        theme: isDark ? 'dark' : 'light',
        color: [isDark ? '#00b4d8' : '#0066cc', isDark ? '#00ff88' : '#10b981'],
        xAxis: {
            label: {
                style: {
                    fill: isDark ? '#8892b0' : '#5a5a6e',
                },
            },
            line: {
                style: {
                    stroke: isDark ? '#1a2555' : '#d9d9d9',
                },
            },
        },
        yAxis: {
            label: {
                style: {
                    fill: isDark ? '#8892b0' : '#5a5a6e',
                },
            },
            grid: {
                line: {
                    style: {
                        stroke: isDark ? '#1a2555' : '#e8e8e8',
                        lineDash: [4, 4],
                    },
                },
            },
        },
    };
    
    return <Line {...config} />;
}
```

## 8. 自定义 Hook 监听主题变更

```jsx
// src/hooks/useThemeChange.js
import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeChange(callback) {
    const { theme } = useTheme();
    
    useEffect(() => {
        callback?.(theme);
    }, [theme, callback]);
    
    return theme;
}

// 使用示例
function MyComponent() {
    const chartRef = useRef(null);
    
    useThemeChange((theme) => {
        // 主题变更时重新渲染图表
        if (chartRef.current) {
            chartRef.current.updateOptions({
                theme: theme === 'dark' ? 'dark' : 'light',
            });
        }
    });
    
    return <div ref={chartRef} />;
}
```

## 9. 表单组件适配

```css
/* src/components/FormGroup/FormGroup.css */

.form-group {
    margin-bottom: 20px;
}

.form-group__label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
}

.form-group__input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s ease;
}

.form-group__input:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--glow-cyan);
}

.form-group__input::placeholder {
    color: var(--text-muted);
}

.form-group__hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-muted);
}

.form-group__error {
    margin-top: 6px;
    font-size: 12px;
    color: var(--accent-red);
}
```

## 10. 加载状态适配

```css
/* src/components/LoadingSpinner/LoadingSpinner.css */

.loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-secondary);
    border-top-color: var(--accent-cyan);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    margin-left: 12px;
    font-size: 14px;
    color: var(--text-secondary);
}
```

## 11. 面包屑导航

```css
/* src/components/Breadcrumb/Breadcrumb.css */

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    margin-bottom: 16px;
}

.breadcrumb__item {
    font-size: 14px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s ease;
}

.breadcrumb__item:hover {
    color: var(--accent-cyan);
}

.breadcrumb__item--active {
    color: var(--text-primary);
    font-weight: 500;
}

.breadcrumb__separator {
    color: var(--text-muted);
}
```

## 12. 侧边栏菜单

```css
/* src/components/SidebarMenu/SidebarMenu.css */

.sidebar-menu {
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-primary);
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
}

.menu-item:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
}

.menu-item--active {
    background: var(--bg-elevated);
    color: var(--accent-cyan);
    border-left-color: var(--accent-cyan);
}

.menu-item__icon {
    font-size: 16px;
    color: inherit;
}

.menu-item__label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
}
```

---

这些示例展示了如何在各种场景中使用主题系统。根据你的具体需求，可以参考这些模式进行适配。
