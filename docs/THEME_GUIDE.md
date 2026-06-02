# SD-WAN 主题系统使用指南

## 概述

SD-WAN 应用现已支持深色/浅色主题切换，提供专业的视觉体验。

**深色主题** - 科技感、数据可视化的专业感，适合长时间监控  
**浅色主题** - 清爽现代、企业级应用的可靠性，适合日间使用

## 配色方案

### 深色主题
```css
--bg-primary: #060b1a          /* 主背景 - 深空蓝 */
--bg-secondary: #0d1330        /* 次级背景 */
--accent-cyan: #00b4d8         /* 主强调色 - 青色 */
--accent-purple: #9d4edd       /* 辅助强调色 - 紫色 */
--accent-green: #00ff88        /* 成功色 */
--accent-red: #ff4444          /* 错误色 */
--glow-cyan: rgba(0, 180, 216, 0.3)  /* 光效 */
```

### 浅色主题
```css
--bg-primary: #f5f7fa          /* 主背景 - 浅灰蓝 */
--bg-secondary: #ffffff        /* 次级背景 - 纯白 */
--accent-cyan: #0066cc         /* 主强调色 - 深蓝 */
--accent-purple: #7c3aed       /* 辅助强调色 - 紫色 */
--accent-green: #10b981        /* 成功色 */
--accent-red: #ef4444          /* 错误色 */
--glow-cyan: rgba(0, 102, 204, 0.15)  /* 光效减弱 */
```

## 组件使用

### 1. 主题切换按钮（推荐）

```jsx
import { ThemeToggleButton } from '@/components/ThemeSwitcher/ThemeSwitcher';

function Toolbar() {
    return (
        <div className="toolbar">
            <ThemeToggleButton />
            {/* 其他工具栏按钮 */}
        </div>
    );
}
```

### 2. 完整主题切换器

```jsx
import ThemeSwitcher from '@/components/ThemeSwitcher/ThemeSwitcher';

function SettingsPanel() {
    return (
        <div className="settings">
            <ThemeSwitcher showLabels={true} />
        </div>
    );
}
```

### 3. 使用主题 Hook

```jsx
import { useTheme, THEME_TYPES } from '@/contexts/ThemeContext';

function MyComponent() {
    const { theme, toggleTheme, setTheme } = useTheme();
    
    // 判断当前主题
    const isDark = theme === THEME_TYPES.DARK;
    
    // 切换主题
    const handleToggle = () => {
        toggleTheme();
    };
    
    // 设置特定主题
    const handleSetLight = () => {
        setTheme(THEME_TYPES.LIGHT);
    };
    
    return (
        <div style={{ color: 'var(--text-primary)' }}>
            当前主题: {isDark ? '深色' : '浅色'}
            <button onClick={toggleTheme}>切换主题</button>
        </div>
    );
}
```

## CSS 变量使用

### 文本颜色
```css
.my-text {
    color: var(--text-primary);      /* 主要文本 */
    color: var(--text-secondary);    /* 次要文本 */
    color: var(--text-muted);        /* 弱化文本 */
}
```

### 背景颜色
```css
.my-container {
    background: var(--bg-primary);    /* 主背景 */
    background: var(--bg-secondary);  /* 次级背景 */
    background: var(--bg-card);       /* 卡片背景 */
}
```

### 主题色
```css
.primary-button {
    background: var(--accent-cyan);
    border-color: var(--accent-cyan);
    box-shadow: 0 0 12px var(--glow-cyan);
}

.success-badge {
    color: var(--accent-green);
    background: var(--color-success-bg);
}
```

### 状态色
```css
.status-online {
    color: var(--color-success);
    background: var(--color-success-bg);
}

.status-error {
    color: var(--color-error);
    background: var(--color-error-bg);
}
```

### 边框和阴影
```css
.my-card {
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-md);
}

.my-card:hover {
    border-color: var(--border-active);
    box-shadow: var(--shadow-lg);
}
```

## Dashboard 专用变量

```css
/* 地图背景 */
.site-map-container {
    background: var(--dashboard-bg);
}

/* 面板样式 */
.dashboard-panel {
    background: var(--dashboard-panel-bg);
    border: 1px solid var(--dashboard-panel-border);
}

/* 文本颜色 */
.dashboard-text {
    color: var(--dashboard-text-primary);
}

.dashboard-subtext {
    color: var(--dashboard-text-secondary);
}
```

## 主题过渡动画

所有主题相关样式都包含平滑过渡：

```css
transition: all var(--transition-duration) var(--transition-timing);
```

切换主题时，所有使用 CSS 变量的元素会自动平滑过渡。

## Ant Design 组件适配

Ant Design 组件通过 ConfigProvider 自动适配主题：

```jsx
import { ConfigProvider } from 'antd';
import { getAntdTheme } from '@/contexts/ThemeContext';

<ConfigProvider theme={getAntdTheme(theme)}>
    <App />
</ConfigProvider>
```

### 常用 Ant Design 组件主题

```jsx
// Button
<Button type="primary">主要按钮</Button>
<Button>默认按钮</Button>

// Input
<Input placeholder="输入内容" />

// Table
<Table dataSource={data} columns={columns} />

// Modal
<Modal title="标题" open={visible}>
    内容
</Modal>
```

## 主题持久化

用户选择的主题会自动保存到 localStorage，下次访问时自动应用：

```javascript
localStorage.setItem('sdwan-theme', 'dark');  // 或 'light'
```

## 最佳实践

### 1. 优先使用 CSS 变量
```css
/* ✅ 推荐 */
.button {
    background: var(--accent-cyan);
    color: var(--text-primary);
}

/* ❌ 不推荐 */
.button {
    background: #00b4d8;
    color: #e0e0e0;
}
```

### 2. 为主题切换添加过渡
```css
.interactive-element {
    transition: all 0.2s ease;
}
```

### 3. 处理特殊组件
```jsx
// 对于需要特殊处理的组件，监听主题变更
useEffect(() => {
    const handleThemeChange = (e) => {
        const { theme } = e.detail;
        // 重新渲染图表、地图等
    };
    
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
}, []);
```

### 4. 响应式设计
```css
/* 确保两种主题下都有良好的对比度 */
@media (prefers-color-scheme: dark) {
    /* 可以根据系统主题偏好进行额外调整 */
}
```

## 调试技巧

### 1. 在浏览器控制台测试主题
```javascript
// 切换到浅色主题
document.documentElement.setAttribute('data-theme', 'light');

// 切换到深色主题
document.documentElement.setAttribute('data-theme', 'dark');

// 查看当前主题
console.log(getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'));
```

### 2. 主题可视化调试
```css
/* 临时添加到样式表，查看所有 CSS 变量 */
:root {
    --debug: var(--bg-primary);
}
```

## 迁移现有组件

### 迁移步骤

1. **替换硬编码颜色**
```css
/* 之前 */
color: #e0e0e0;
background: #060b1a;

/* 之后 */
color: var(--text-primary);
background: var(--bg-primary);
```

2. **添加过渡动画**
```css
.component {
    transition: background 0.2s ease, color 0.2s ease;
}
```

3. **测试两种主题**
```jsx
// 在开发时快速测试
<ThemeToggleButton />
```

## 文件结构

```
frontend/src/
├── contexts/
│   └── ThemeContext.jsx          # 主题 Context 和 Hook
├── components/
│   └── ThemeSwitcher/
│       ├── ThemeSwitcher.jsx     # 主题切换组件
│       └── ThemeSwitcher.css     # 主题切换样式
├── index.css                     # 全局主题变量
└── THEME_GUIDE.md               # 本文档
```

## 支持

如有问题或建议，请联系开发团队。
