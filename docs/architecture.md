# 架构设计文档

## 整体架构

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────┐
│   前端 (React)   │ ◄──────────────► │  后端 (FastAPI)  │
│   Port: 5173    │                  │  Port: 8000     │
└─────────────────┘                  └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │   SQLite 数据库   │
                                     │  (data/app.db)   │
                                     └──────────────────┘
```

## 前端架构

### 技术选型
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架 |
| Vite | 8.0 | 构建工具 |
| Ant Design | 6.4 | UI 组件库 |
| Tailwind CSS | 4.3 | 原子化 CSS |
| AntV G6 | 5.1 | 图可视化（网络拓扑） |

### 分层设计（待实现）
```
src/
├── pages/          # 页面组件
├── components/     # 通用组件
├── layouts/        # 布局组件
├── hooks/          # 自定义 Hooks
├── services/       # API 请求封装
├── stores/         # 全局状态
├── utils/          # 工具函数
├── router/         # 路由配置
└── assets/         # 静态资源
```

### 设计决策
- **Tailwind CSS v4**: 使用 `@import "tailwindcss"` 方式引入，不使用传统 tailwind.config.js
- **Ant Design**: 用于后台管理类页面的复杂组件（表格、表单、弹窗等）
- **AntV G6**: 专门用于 SD-WAN 网络拓扑可视化

## 后端架构

### 技术选型
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.115.6 | Web 框架 |
| Uvicorn | 0.34.0 | ASGI 服务器 |
| SQLAlchemy | 2.0.36 | ORM |
| Pydantic | 2.10 | 数据校验 |
| SQLite | - | 开发数据库 |

### 分层设计
```
main.py                 # 应用入口，中间件配置，路由注册
app/
├── api/
│   └── endpoints/      # 路由处理层（Controller）
├── core/
│   ├── config.py        # 配置管理
│   └── security.py      # 安全相关（待实现：JWT、密码加密）
├── models/              # 数据模型层（Model）
├── schemas/             # 数据校验层（Schema）
├── services/            # 业务逻辑层（待实现）
└── db.py                # 数据库基础设施
```

### 数据流
```
Request → Endpoint → Service（待实现） → Model → Database
                ↓
             Schema 校验
                ↓
Response ← Schema 序列化
```

### 设计决策
- **API 前缀 `/api/v1`**: 便于后续版本迭代
- **SQLite 开发**: 轻量级，无需额外安装数据库服务；生产环境可切换为 PostgreSQL/MySQL
- **Pydantic Settings**: 统一管理环境变量和配置
- **CORS**: 默认允许前端开发服务器（5173/3000）跨域

## 待实现的架构改进

1. **认证系统**: JWT Token 认证 + 中间件
2. **业务层抽离**: 从 Endpoint 中抽离 Service 层
3. **数据库迁移**: 引入 Alembic 管理 schema 变更
4. **异常处理**: 统一异常处理中间件
5. **日志系统**: 结构化日志
6. **缓存层**: Redis 缓存（如需要）
