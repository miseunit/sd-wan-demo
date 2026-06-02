# SD-WAN Demo 前端开发规范

## 技术栈

- React 19.2 + Vite 8.0
- Ant Design 6.4（UI 组件库）
- Tailwind CSS 4.3（样式方案）
- AntV G6 5.1（图可视化 / 网络拓扑）
- JavaScript (JSX)

## 常用命令

```bash
npm run dev      # 启动开发服务器 http://localhost:5173
npm run build    # 生产构建
npm run lint     # ESLint 检查
npm run preview  # 预览生产构建
```

## 项目结构

```
frontend/src/
├── App.jsx       # 主应用组件
├── App.css       # 应用样式
├── main.jsx      # 入口文件
├── index.css     # 全局样式（Tailwind v4 @import 方式引入）
└── assets/       # 静态资源（图片等）
```

## Tailwind CSS v4 说明

- 使用 `@import "tailwindcss"` 方式引入，无需 tailwind.config.js
- 在 index.css 中通过 CSS 自定义属性配置主题
- 支持 dark mode（通过 CSS 变量切换）

## 代码风格

- 4 个空格缩进，不使用制表符
- 行尾使用分号
- 注释使用中文
- 函数名使用驼峰命名
- 常量使用大写字母加下划线

## 注释规范

- 函数必须写文档注释
- 复杂逻辑添加行内注释
- TODO 注释格式: `// TODO(用户名): 需要完成的功能`

## 组件拆分规则

只有当满足以下任一条件时才拆分组件：
- 组件在 2 个或以上地方被使用
- 单个文件代码量过大，影响可读性
- 某块代码可以独立存在，降低耦合度

## Provide/Inject 跨层级传参规则

- **应该用**：组件层级 > 3 层 / 多个平级组件共享数据
- **不该用**：只有父子两层 / 数据只在单个分支使用 / 简单透传
