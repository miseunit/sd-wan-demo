# SD-WAN Demo 后端开发规范

## 技术栈

- Python + FastAPI 0.115.6
- Uvicorn 0.34.0（ASGI 服务器）
- SQLAlchemy 2.0.36（ORM）
- SQLite（开发数据库）
- Pydantic 2.10（数据校验）

## 常用命令

```bash
# 首次环境搭建
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 启动开发服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 生产部署
uvicorn main:app --host 0.0.0.0 --port 8000
```

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

## API 路由规范

所有路由前缀: `/api/v1`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 根路径（返回应用信息） |
| GET | `/health` | 健康检查 |
| POST | `/api/v1/users/` | 创建用户 |
| GET | `/api/v1/users/` | 获取用户列表（分页） |
| GET | `/api/v1/users/{id}` | 获取用户详情 |
| PUT | `/api/v1/users/{id}` | 更新用户 |
| DELETE | `/api/v1/users/{id}` | 删除用户 |

## 代码风格

- 遵循 PEP 8
- 4 个空格缩进
- 中文注释和文档字符串
- snake_case 命名

## 注释规范

- 函数必须写文档注释
- 复杂逻辑添加行内注释
- TODO 注释格式: `# TODO(用户名): 需要完成的功能`
