# SD-WAN 主题系统快速入门

## 1. 启动项目

```bash
cd frontend
npm run dev
```

访问 http://localhost:5173

## 2. 查看主题效果

### 方式一：Dashboard 页面
Dashboard 页面已集成主题切换按钮，在顶部 HUD 栏右侧。

### 方式二：添加展示页面路由
在 `src/App.tsx` 中添加路由：

```jsx
import ThemeShowcase from './components/ThemeShowcase/ThemeShowcase';

// 在路由配置中添加
<Route path="/theme-showcase" element={<ThemeShowcase />} />
```

然后访问 http://localhost:5173/theme-showcase

## 3. 在新组件中使用主题

### 添加主题切换按钮
```jsx
import { ThemeToggleButton } from '@/components/ThemeSwitcher/ThemeSwitcher';

function MyPage() {
    return (
        <div>
            <div className="toolbar">
                <ThemeToggleButton />
            </div>
            {/* 页面内容 */}
        </div>
    );
}
```

### 使用主题变量
```css
/* MyPage.css */
.my-page {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    transition: all 0.2s ease;
}

.my-page:hover {
    border-color: var(--border-active);
    box-shadow: 0 0 12px var(--glow-cyan);
}
```

## 4. 主题变量速查表

### 常用颜色
```css
/* 文本 */
var(--text-primary)    /* 主要文本 */
var(--text-secondary)  /* 次要文本 */

/* 背景 */
var(--bg-primary)      /* 主背景 */
var(--bg-secondary)    /* 次级背景 */
var(--bg-card)         /* 卡片背景 */

/* 主题色 */
var(--accent-cyan)     /* 主色调 */
var(--accent-green)    /* 成功色 */
var(--accent-red)      /* 错误色 */
var(--accent-yellow)   /* 警告色 */

/* 边框 */
var(--border-primary)  /* 主边框 */
var(--border-active)  /* 激活边框 */

/* 光效 */
var(--glow-cyan)       /* 青色光效 */
var(--shadow-md)       /* 中等阴影 */
```

## 5. 常见模式

### 按钮
```css
.button {
    background: var(--accent-cyan);
    color: var(--text-primary);
    border: 1px solid var(--accent-cyan);
    border-radius: 6px;
    padding: 8px 16px;
    transition: all 0.2s ease;
}

.button:hover {
    background: var(--accent-cyan-light);
    box-shadow: 0 0 12px var(--glow-cyan);
}
```

### 卡片
```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 16px;
    box-shadow: var(--shadow-md);
    transition: all 0.2s ease;
}

.card:hover {
    border-color: var(--border-active);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}
```

### 状态标签
```css
.status-success {
    color: var(--accent-green);
    background: var(--color-success-bg);
    border: 1px solid var(--accent-green);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12px;
}

.status-error {
    color: var(--accent-red);
    background: var(--color-error-bg);
    border: 1px solid var(--accent-red);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12px;
}
```

## 6. 主题测试清单

切换主题时检查：
- [ ] 文本可读性良好
- [ ] 边框和阴影显示正确
- [ ] 按钮悬停效果正常
- [ ] 图标颜色适配
- [ ] 表格可读性良好
- [ ] 对话框样式正确
- [ ] 动画平滑过渡

## 7. 故障排除

### 颜色没有切换
确保使用 CSS 变量而不是硬编码颜色：
```css
/* ❌ 错误 */
color: #e0e0e0;

/* ✅ 正确 */
color: var(--text-primary);
```

### Ant Design 组件颜色不对
确保组件在 `ConfigProvider` 内部：
```jsx
<ConfigProvider theme={getAntdTheme(theme)}>
    {/* 你的组件 */}
</ConfigProvider>
```

### 主题没有持久化
检查 localStorage：
```javascript
// 应该看到 'dark' 或 'light'
console.log(localStorage.getItem('sdwan-theme'));
```

## 8. 键盘快捷键（可选）

可以添加键盘快捷键切换主题：

```jsx
useEffect(() => {
    const handleKeyPress = (e) => {
        // Ctrl/Cmd + Shift + T
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
            toggleTheme();
        }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
}, [toggleTheme]);
```

## 9. 下一步

1. **迁移现有组件** - 使用 CSS 变量替换硬编码颜色
2. **图表适配** - 确保图表颜色随主题变化
3. **测试** - 在两个主题下测试所有页面
4. **文档** - 为团队分享主题使用指南

---

需要帮助？查看完整文档：[THEME_GUIDE.md](./THEME_GUIDE.md)
