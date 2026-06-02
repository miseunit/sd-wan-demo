# 前端开发指南

## 技术栈
- React 19.2（JSX）
- Vite 8.0（构建工具）
- Ant Design 6.4（UI 组件库）
- Tailwind CSS 4.3（样式方案）
- AntV G6 5.1（图可视化）

## 开发环境搭建

```bash
cd frontend
npm install       # 安装依赖
npm run dev       # 启动开发服务器
```

开发服务器默认运行在 http://localhost:5173

## 构建与部署

```bash
npm run build     # 构建到 dist/ 目录
npm run preview   # 本地预览构建结果
```

## 代码风格
- 4 空格缩进
- 行尾使用分号
- 中文注释
- 驼峰命名（函数、变量）
- 组件文件使用 PascalCase（如 UserProfile.jsx）

## Tailwind CSS v4 使用说明

Tailwind CSS v4 使用全新的配置方式，不再需要 `tailwind.config.js`：

```css
/* index.css */
@import "tailwindcss";

/* 自定义主题变量通过 CSS 自定义属性定义 */
:root {
    --color-primary: #1890ff;
}
```

直接在 HTML 元素上使用 Tailwind 类名：
```jsx
<div className="flex items-center gap-4 p-4 bg-blue-500 text-white">
    内容
</div>
```

## Ant Design 使用说明

引入组件：
```jsx
import { Button, Table, Form, Input } from 'antd';

function MyPage() {
    return (
        <Button type="primary" onClick={() => {}}>
            操作
        </Button>
    );
}
```

## AntV G6 使用说明

G6 用于 SD-WAN 网络拓扑图的可视化渲染：

```jsx
import { Graph } from '@antv/g6';

// 创建图实例
const graph = new Graph({
    container: 'container',
    /* 配置项 */
});

graph.data(nodes, edges);
graph.render();
```

## 项目状态与待办

当前前端为 Vite + React 初始模板，尚未进行业务开发。待实现的模块：

1. **路由系统** — 安装并配置 React Router
2. **API 服务层** — 封装 Axios 请求，统一拦截器和错误处理
3. **布局组件** — 侧边栏 + 顶栏 + 内容区域的后台布局
4. **登录页面** — 用户认证入口
5. **网络拓扑页面** — 使用 G6 渲染 SD-WAN 设备拓扑图
6. **设备管理页面** — 网络设备的 CRUD 管理表格
7. **用户管理页面** — 用户列表与管理

## ESLint
使用 ESLint + React Hooks 插件 + React Refresh 插件，配置文件：`eslint.config.js`
