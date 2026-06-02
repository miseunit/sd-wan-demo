# SD-WAN Demo Backend

基于 FastAPI + SQLite 的后端 API 服务。

## 技术栈

- **FastAPI 0.115.6** - 现代、快速的 Web 框架
- **SQLAlchemy 2.0.36** - ORM 数据库工具
- **SQLite** - 轻量级数据库
- **Pydantic 2.10** - 数据验证和序列化
- **Uvicorn 0.34.0** - ASGI 服务器

## 快速开始

### 1. 创建虚拟环境

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，按需修改配置。

### 4. 运行服务

```bash
# 开发模式（支持热重载）
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. 访问 API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 项目结构

```
backend/
├── main.py                 # FastAPI 应用入口
├── app/
│   ├── api/
│   │   └── endpoints/
│   │       └── users.py   # 用户管理 API
│   ├── core/
│   │   └── config.py      # 配置管理（Settings）
│   ├── models/
│   │   └── user.py        # 用户数据模型
│   ├── schemas/
│   │   └── user.py        # 用户数据校验
│   └── db.py              # 数据库引擎 & 会话管理
├── data/                   # SQLite 数据库文件存储目录
├── requirements.txt
└── .env.example
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_NAME` | 应用名称 | SD-WAN Demo API |
| `APP_VERSION` | 应用版本 | 1.0.0 |
| `DEBUG` | 调试模式 | True |
| `DATABASE_URL` | 数据库连接 | sqlite:///./data/app.db |
| `API_PREFIX` | API 路由前缀 | /api/v1 |
| `CORS_ORIGINS` | CORS 允许的源 | ["http://localhost:5173"] |

## API 端点

### 基础端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 应用信息 |
| `/health` | GET | 健康检查 |

### 用户管理

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/users/` | POST | 创建用户 |
| `/api/v1/users/` | GET | 获取用户列表 |
| `/api/v1/users/{user_id}` | GET | 获取用户详情 |
| `/api/v1/users/{user_id}` | PUT | 更新用户 |
| `/api/v1/users/{user_id}` | DELETE | 删除用户 |
