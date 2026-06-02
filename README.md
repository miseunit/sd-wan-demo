# SD-WAN Demo

SD-WAN 网络管理和可视化 Web 应用，用于演示 SD-WAN 网络拓扑的管理与监控。

## 技术栈

### 前端
- React 19.2 + Vite 8.0
- Ant Design 6.4
- Tailwind CSS 4.3
- AntV G6 5.1（网络拓扑可视化）

### 后端
- FastAPI 0.115.6（Python）
- SQLAlchemy 2.0.36 + SQLite
- Pydantic 2.10

## 快速开始

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后访问：
- API 文档：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc

**默认登录信息**
- 用户名：`admin`
- 密码：`secret`

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器：http://localhost:5173

## 测试

### 前端测试（Vitest）

```bash
cd frontend

# 监听模式（开发时推荐，文件修改自动重跑）
npm test

# 运行一次
npm run test:run

# 带覆盖率报告
npm run test:coverage
```

测试文件命名：`组件名.test.tsx`，与组件同目录。

```
src/pages/DeviceManagement/components/
├── DeviceFormModal.tsx
└── DeviceFormModal.test.tsx
```

### 后端测试（pytest）

```bash
cd backend
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # Linux/Mac

# 运行所有测试
pytest

# 运行指定文件
pytest test_devices.py

# 详细输出 + 显示打印
pytest -v -s
```

测试文件命名：`test_模块名.py`，放在 backend 根目录。

```
backend/
├── app/api/endpoints/devices.py   # API 路由
├── test_devices.py                # 测试用例
└── conftest.py                    # 测试配置（数据库 fixtures）
```

### 测试覆盖

| 模块 | 测试内容 |
|------|----------|
| 前端组件 | 渲染、模式切换、表单回显 |
| 后端 API | CRUD、参数校验、分页、错误处理 |

## 项目结构

```
sd-wan-demo/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── services/           # API 服务
│   │   └── test/               # 测试配置
│   ├── vitest.config.ts        # Vitest 配置
│   └── package.json
├── backend/                     # 后端项目
│   ├── app/
│   │   ├── api/endpoints/      # API 路由
│   │   ├── models/             # 数据模型
│   │   └── schemas/            # 数据校验
│   ├── conftest.py             # 测试配置
│   ├── test_*.py               # 测试用例
│   └── requirements.txt
└── docs/                        # 项目文档
```

## 常用命令速查

| 场景 | 命令 |
|------|------|
| 启动前端 | `cd frontend && npm run dev` |
| 启动后端 | `cd backend && uvicorn main:app --reload` |
| 前端测试 | `cd frontend && npm test` |
| 后端测试 | `cd backend && pytest -v` |
| 构建前端 | `cd frontend && npm run build` |
| 代码检查 | `cd frontend && npm run lint` |

## 文档

- [架构设计](docs/architecture.md)
- [API 接口文档](docs/api.md)
- [数据库模型文档](docs/database.md)
- [前端开发指南](docs/frontend.md)