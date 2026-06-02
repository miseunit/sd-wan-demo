# SD-WAN Demo 项目

## 项目概览

SD-WAN Demo 是一个前后端分离的 Web 应用项目，用于 SD-WAN 网络管理和可视化。

## 技术栈

### 前端
- **框架**: React 19.2 + Vite 8.0
- **UI 组件库**: Ant Design 6.4
- **样式方案**: Tailwind CSS 4.3
- **图可视化**: AntV G6 5.1（网络拓扑图）
- **语言**: JavaScript（JSX）

### 后端
- **框架**: FastAPI 0.115.6（Python）
- **ASGI 服务器**: Uvicorn 0.34.0
- **ORM**: SQLAlchemy 2.0.36
- **数据库**: SQLite（开发环境）
- **数据校验**: Pydantic 2.10
- **认证**: python-jose（JWT）+ passlib（bcrypt）— 尚未实现

## 项目结构

```
sd-wan-demo/
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── App.jsx         # 主应用组件
│   │   ├── main.jsx        # 入口文件
│   │   ├── index.css       # 全局样式（Tailwind）
│   │   └── assets/         # 静态资源
│   ├── package.json
│   └── vite.config.js
├── backend/                 # 后端项目
│   ├── main.py             # FastAPI 应用入口
│   ├── app/
│   │   ├── api/endpoints/  # API 路由
│   │   ├── core/config.py  # 配置管理
│   │   ├── models/         # SQLAlchemy 数据模型
│   │   ├── schemas/        # Pydantic 数据校验
│   │   └── db.py           # 数据库连接
│   ├── requirements.txt
│   └── .env.example
└── CLAUDE.md               # 本文件
```

## 开发命令

### 前端
```bash
cd frontend
npm install          # 安装依赖
npm run dev          # 启动开发服务器（默认 http://localhost:5173）
npm run build        # 构建生产包
npm run lint         # ESLint 检查
npm run preview      # 预览生产构建
```

### 后端
```bash
cd backend
python -m venv .venv           # 创建虚拟环境（首次）
source .venv/bin/activate      # 激活虚拟环境（Linux/Mac）
.venv\Scripts\activate         # 激活虚拟环境（Windows）
pip install -r requirements.txt  # 安装依赖
uvicorn main:app --reload --host 0.0.0.0 --port 8000  # 启动开发服务器
```

### API 文档（后端启动后访问）
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 开发约定

### 代码风格
- **前端**: 4 空格缩进，行尾分号，中文注释，驼峰命名
- **后端**: 遵循 PEP 8，4 空格缩进，中文注释，snake_case 命名

### API 规范
- 所有 API 路由前缀: `/api/v1`
- 使用 Pydantic Schema 做请求/响应校验
- 数据库操作通过 SQLAlchemy ORM

### 组件拆分规则
只有满足以下任一条件时才拆分组件：
- 组件在 2 个或以上地方被使用
- 单个文件代码量过大，影响可读性
- 某块代码可以独立存在，降低耦合度

### Provide/Inject 跨层级传参规则
- **应该用**: 层级 > 3 层 / 多个平级组件共享数据
- **不该用**: 只有父子两层 / 数据只在单个分支使用 / 简单透传


## 详细文档
- [架构设计](docs/architecture.md)
- [API 接口文档](docs/api.md)
- [数据库模型文档](docs/database.md)
- [前端开发指南](docs/frontend.md)
