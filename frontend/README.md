# SD-WAN Demo 前端

SD-WAN 网络管理和可视化系统的前端应用。

## 技术栈

- **React 19.2** - UI 框架
- **Vite 8.0** - 构建工具
- **Ant Design 6.4** - UI 组件库
- **Tailwind CSS 4.3** - 样式方案
- **AntV G6 5.1** - 图可视化（网络拓扑）
- **JavaScript (JSX)** - 开发语言

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
frontend/src/
├── App.jsx       # 主应用组件
├── App.css       # 应用样式
├── main.jsx      # 入口文件
├── index.css     # 全局样式（Tailwind）
└── assets/       # 静态资源
```

## 环境变量

如需配置后端 API 地址，可创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run preview` | 预览生产构建 |

## 技术文档

- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [Ant Design 文档](https://ant.design/)
- [AntV G6 文档](https://g6.antv.antgroup.com/)
