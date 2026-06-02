# 数据库模型文档

## 数据库配置
- **引擎**: SQLite
- **连接地址**: `sqlite:///./data/app.db`
- **ORM**: SQLAlchemy 2.0（声明式映射）
- **数据库文件位置**: `backend/data/app.db`

## 数据表

### users 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY, INDEX | 用户 ID，自增主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | 用户名 |
| email | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | 邮箱 |
| hashed_password | VARCHAR(200) | NOT NULL | 加密密码（当前明文） |
| full_name | VARCHAR(100) | NULLABLE | 全名 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否激活 |
| is_superuser | BOOLEAN | DEFAULT FALSE | 是否超级用户 |
| created_at | DATETIME | DEFAULT utcnow | 创建时间 |
| updated_at | DATETIME | DEFAULT utcnow, ON UPDATE | 更新时间 |

### 索引
- `users.id` — 主键索引
- `users.username` — 唯一索引
- `users.email` — 唯一索引

## SQLAlchemy Base
所有模型继承自 `app.db.Base`，通过 `init_db()` 在应用启动时自动创建表。

## 待实现模型（SD-WAN 业务）
- `devices` — 网络设备（CPE、路由器、交换机等）
- `links` — 网络链路（设备之间的连接）
- `sites` — 站点信息
- `policies` — SD-WAN 策略（路由策略、流量策略等）
- `vpn_tunnels` — VPN 隧道信息

## 注意事项
1. 当前无数据库迁移方案，表结构变更需手动处理
2. 建议后续引入 Alembic 管理 schema 版本
3. 生产环境建议切换为 PostgreSQL 或 MySQL
