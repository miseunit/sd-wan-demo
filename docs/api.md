# API 接口文档

## 基础信息
- **Base URL**: `http://localhost:8000`
- **API 前缀**: `/api/v1`
- **认证方式**: 暂无（待实现 JWT）
- **Content-Type**: `application/json`

## 接口列表

### 系统接口

#### 应用信息
- **GET** `/`
- **说明**: 获取应用基本信息
- **响应**:
```json
{
    "app_name": "SD-WAN Demo API",
    "version": "1.0.0",
    "status": "running"
}
```

#### 健康检查
- **GET** `/health`
- **说明**: 服务健康检查
- **响应**:
```json
{
    "status": "healthy"
}
```

---

### 用户管理 `/api/v1/users`

#### 创建用户
- **POST** `/api/v1/users/`
- **说明**: 创建新用户
- **请求体**:
```json
{
    "username": "string（3-50字符）",
    "email": "string（邮箱格式）",
    "password": "string（最少6字符）",
    "full_name": "string（可选，最多100字符）"
}
```
- **响应** `201`:
```json
{
    "id": 1,
    "username": "string",
    "email": "string",
    "full_name": "string | null",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-01T00:00:00"
}
```
- **错误**: `400`（校验失败）、`400`（用户名/邮箱已存在）

#### 获取用户列表
- **GET** `/api/v1/users/`
- **说明**: 分页获取用户列表
- **查询参数**:
  - `skip` (int, 默认 0): 跳过记录数
  - `limit` (int, 默认 100): 返回记录数
- **响应** `200`: User 数组

#### 获取用户详情
- **GET** `/api/v1/users/{user_id}`
- **路径参数**: `user_id` (int)
- **响应** `200`: User 对象
- **错误**: `404`（用户不存在）

#### 更新用户
- **PUT** `/api/v1/users/{user_id}`
- **路径参数**: `user_id` (int)
- **请求体**（所有字段可选）:
```json
{
    "email": "string（可选）",
    "full_name": "string（可选）",
    "password": "string（可选，最少6字符）",
    "is_active": "boolean（可选）"
}
```
- **响应** `200`: 更新后的 User 对象
- **错误**: `404`（用户不存在）

#### 删除用户
- **DELETE** `/api/v1/users/{user_id}`
- **路径参数**: `user_id` (int)
- **响应** `204`: 无内容
- **错误**: `404`（用户不存在）

---

## 数据模型定义

### User 对象
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 用户 ID |
| username | string | 用户名（3-50字符，唯一） |
| email | string | 邮箱（唯一） |
| full_name | string\|null | 全名 |
| is_active | boolean | 是否激活 |
| is_superuser | boolean | 是否超级用户 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

> **注意**: `password` 字段仅出现在创建/更新请求中，不出现在响应中。
> 当前密码为明文存储（TODO: 实现 bcrypt 加密）。
