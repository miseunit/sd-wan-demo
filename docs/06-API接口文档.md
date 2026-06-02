# SD-WAN 管理平台 — API 接口文档

> **这份文档列出了所有后端 API 接口的详细说明。**
> 前端对接后端时看这份文档。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:8000` |
| API 前缀 | `/api/v1` |
| Content-Type | `application/json` |
| 认证方式 | JWT Bearer Token（放在 Header 的 Authorization 中） |
| 响应格式 | `{ code: 200, message: "成功", data: {...} }` |

---

## 统一响应格式

### 成功响应

```json
{
    "code": 200,
    "message": "获取成功",
    "data": { ... }
}
```

### 错误响应

```json
{
    "code": 404,
    "message": "站点不存在",
    "data": null
}
```

### 分页响应

当接口返回列表时，`data` 的结构为：

```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [...],
        "total": 100,
        "page": 1,
        "pageSize": 10,
        "totalPages": 10
    }
}
```

---

## 一、用户管理 `/api/v1/users`

### 1.1 用户注册

- **POST** `/api/v1/users/`
- **认证**: 不需要

**请求体:**
```json
{
    "username": "admin",
    "email": "admin@example.com",
    "password": "123456",
    "full_name": "管理员"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名，3-50 字符，唯一 |
| email | string | ✅ | 邮箱，唯一 |
| password | string | ✅ | 密码，最少 6 字符 |
| full_name | string | ❌ | 全名，最多 100 字符 |

**成功响应 201:**
```json
{
    "code": 200,
    "message": "创建成功",
    "data": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "管理员",
        "is_active": true,
        "is_superuser": false
    }
}
```

**错误:**
- `400` — 用户名已存在
- `400` — 邮箱已存在
- `422` — 参数校验失败

---

### 1.2 用户登录

- **POST** `/api/v1/users/login`
- **认证**: 不需要

**请求体:**
```json
{
    "username": "admin",
    "password": "123456"
}
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "bearer"
    }
}
```

**错误:**
- `401` — 用户名或密码错误

---

### 1.3 获取当前用户信息

- **GET** `/api/v1/users/me`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "管理员",
        "is_active": true
    }
}
```

---

### 1.4 刷新 Token

- **POST** `/api/v1/users/refresh`
- **认证**: 需要（用 refresh_token）

**Header:**
```
Authorization: Bearer {refresh_token}
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "刷新成功",
    "data": {
        "access_token": "新 token..."
    }
}
```

---

## 二、站点管理 `/api/v1/sites`

### 2.1 获取站点列表

- **GET** `/api/v1/sites/`
- **认证**: 需要

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| pageSize | int | 10 | 每页记录数 |
| region | string | — | 区域筛选：CN/SG/US/EU |
| status | string | — | 状态筛选：online/offline/warning |
| search | string | — | 搜索关键词（按名称） |
| linkType | string | — | 链路类型筛选：MPLS/Internet/5G |

**请求示例:**
```
GET /api/v1/sites/?page=1&pageSize=10&region=CN&status=online
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [
            {
                "id": "site-bj-01",
                "name": "site-bj-01",
                "displayName": "北京总部",
                "region": "CN",
                "status": "online",
                "latency": 12.5,
                "loss": 0.01,
                "bandwidthUsage": 45.2,
                "bandwidthUsed": "45Mbps",
                "bandwidthTotal": "100Mbps",
                "siteType": "hq",
                "deviceModel": "vEdge-1000",
                "deviceVersion": "20.3.1",
                "uptime": "120天",
                "lat": 39.9042,
                "lng": 116.4074,
                "activeTunnels": 8,
                "sla": 99.5
            }
        ],
        "total": 12,
        "page": 1,
        "pageSize": 10,
        "totalPages": 2
    }
}
```

---

### 2.2 获取站点统计

- **GET** `/api/v1/sites/stats`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 12,
        "online": 10,
        "offline": 1,
        "warning": 1,
        "avgLatency": 25.3,
        "avgLoss": 0.05
    }
}
```

---

### 2.3 获取站点详情

- **GET** `/api/v1/sites/{site_id}`
- **认证**: 需要

**路径参数:** `site_id` — 站点 ID

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": "site-bj-01",
        "name": "site-bj-01",
        "displayName": "北京总部",
        "region": "CN",
        "status": "online",
        "latency": 12.5,
        "loss": 0.01,
        "bandwidthUsage": 45.2,
        "siteType": "hq",
        "links": [
            {
                "id": 1,
                "linkType": "MPLS",
                "isp": "中国电信",
                "status": "active",
                "latency": 12.5
            }
        ],
        "alerts": [
            {
                "id": 1,
                "severity": "major",
                "title": "链路延迟升高",
                "timestamp": "2026-06-01 10:30:00"
            }
        ]
    }
}
```

**错误:** `404` — 站点不存在

---

### 2.4 创建站点

- **POST** `/api/v1/sites/`
- **认证**: 需要

**请求体:**
```json
{
    "name": "site-cd-01",
    "displayName": "成都分支",
    "region": "CN",
    "siteType": "branch",
    "lat": 30.5728,
    "lng": 104.0668,
    "address": "成都市高新区"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 站点编码，唯一 |
| displayName | string | ✅ | 显示名称 |
| region | string | ✅ | 区域 |
| siteType | string | ❌ | 类型，默认 branch |
| lat | float | ❌ | 纬度 |
| lng | float | ❌ | 经度 |
| address | string | ❌ | 地址 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "创建成功",
    "data": { "id": "site-cd-01" }
}
```

---

### 2.5 更新站点

- **PUT** `/api/v1/sites/{site_id}`
- **认证**: 需要

**请求体:**（所有字段可选）
```json
{
    "displayName": "成都总部",
    "status": "online"
}
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "更新成功",
    "data": null
}
```

---

### 2.6 删除站点

- **DELETE** `/api/v1/sites/{site_id}`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "删除成功",
    "data": null
}
```

**错误:** `404` — 站点不存在

---

### 2.7 获取站点链路历史

- **GET** `/api/v1/sites/{site_id}/history`
- **认证**: 需要

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| timeRange | string | 5min | 时间范围：5min/1hour/24hour |
| metric | string | latency | 指标：latency/loss/bandwidth/jitter/throughput |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "metric": "latency",
        "timeRange": "1hour",
        "points": [
            { "time": "10:00", "value": 12.5 },
            { "time": "10:05", "value": 13.1 },
            { "time": "10:10", "value": 11.8 }
        ]
    }
}
```

---

### 2.8 站点批量操作

- **POST** `/api/v1/sites/batch`
- **认证**: 需要

**请求体:**
```json
{
    "siteIds": ["site-bj-01", "site-sh-01"],
    "action": "restart"
}
```

| action 值 | 说明 |
|-----------|------|
| restart | 批量重启 |
| upgrade | 批量升级 |
| configSync | 批量同步配置 |
| enable | 批量启用 |
| disable | 批量禁用 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "批量操作已提交",
    "data": {
        "taskId": "batch-123456",
        "status": "running",
        "total": 2,
        "completed": 0
    }
}
```

---

## 三、设备管理 `/api/v1/devices`

### 3.1 获取设备列表

- **GET** `/api/v1/devices/`
- **认证**: 需要

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码 |
| pageSize | int | 每页记录数 |
| siteId | string | 所属站点筛选 |
| deviceType | string | 设备类型：Edge/Gateway/CPE |
| onlineStatus | string | 在线状态：online/offline |
| search | string | 搜索关键词 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [
            {
                "id": "dev-bj-01",
                "name": "vEdge-BJ-01",
                "deviceType": "Edge",
                "siteId": "site-bj-01",
                "siteName": "北京总部",
                "onlineStatus": "online",
                "cpuUsage": 35.2,
                "memoryUsage": 62.8,
                "temperature": 42.5,
                "firmwareVersion": "20.3.1",
                "healthScore": 95,
                "configVersion": "1.2.0",
                "syncStatus": "synced",
                "role": "active",
                "sessionCount": 24
            }
        ],
        "total": 20,
        "page": 1,
        "pageSize": 10
    }
}
```

---

### 3.2 获取设备详情

- **GET** `/api/v1/devices/{device_id}`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": "dev-bj-01",
        "name": "vEdge-BJ-01",
        "deviceType": "Edge",
        "onlineStatus": "online",
        "cpuUsage": 35.2,
        "memoryUsage": 62.8,
        "interfaces": [
            {
                "name": "ge0/0",
                "interfaceType": "WAN",
                "status": "up",
                "speed": "1Gbps",
                "ipAddress": "203.0.113.1"
            }
        ],
        "tunnels": [
            {
                "tunnelName": "to-sh-01",
                "tunnelType": "IPsec",
                "peerIp": "203.0.113.2",
                "status": "up",
                "uptime": "5天12小时"
            }
        ]
    }
}
```

---

### 3.3 创建设备

- **POST** `/api/v1/devices/`
- **认证**: 需要

**请求体:**
```json
{
    "name": "vEdge-CD-01",
    "deviceType": "Edge",
    "siteId": "site-cd-01",
    "firmwareVersion": "20.3.1"
}
```

---

### 3.4 更新设备

- **PUT** `/api/v1/devices/{device_id}`
- **认证**: 需要

---

### 3.5 删除设备

- **DELETE** `/api/v1/devices/{device_id}`
- **认证**: 需要

---

### 3.6 设备诊断 — Ping

- **POST** `/api/v1/devices/{device_id}/ping`
- **认证**: 需要

**请求体:**
```json
{
    "target": "8.8.8.8",
    "count": 5
}
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "Ping 完成",
    "data": {
        "target": "8.8.8.8",
        "sent": 5,
        "received": 5,
        "loss": 0,
        "avgLatency": 12.5,
        "minLatency": 10.2,
        "maxLatency": 15.8
    }
}
```

---

### 3.7 设备诊断 — Traceroute

- **POST** `/api/v1/devices/{device_id}/traceroute`
- **认证**: 需要

**请求体:**
```json
{
    "target": "8.8.8.8"
}
```

**成功响应 200:**
```json
{
    "code": 200,
    "message": "Traceroute 完成",
    "data": {
        "target": "8.8.8.8",
        "hops": [
            { "hop": 1, "ip": "10.0.0.1", "latency": 1.2 },
            { "hop": 2, "ip": "203.0.113.1", "latency": 5.8 },
            { "hop": 3, "ip": "8.8.8.8", "latency": 12.5 }
        ]
    }
}
```

---

### 3.8 设备升级

- **POST** `/api/v1/devices/{device_id}/upgrade`
- **认证**: 需要

**请求体:**
```json
{
    "targetVersion": "21.1.0"
}
```

---

### 3.9 获取设备统计

- **GET** `/api/v1/devices/stats`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 20,
        "online": 18,
        "offline": 2,
        "alertCount": 3,
        "avgHealthScore": 92.5
    }
}
```

---

## 四、链路管理 `/api/v1/links`

### 4.1 获取链路列表

- **GET** `/api/v1/links/`
- **认证**: 需要

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码 |
| pageSize | int | 每页记录数 |
| siteId | string | 所属站点 |
| type | string | 链路类型：MPLS/Internet/5G |
| linkCategory | string | 链路类别：wan/overlay |
| healthStatus | string | 健康状态：healthy/degraded/down |
| activeStatus | string | 使用状态：active/standby/down |
| search | string | 搜索关键词 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [
            {
                "id": "link-bj-mpls-01",
                "name": "MPLS-BJ-1",
                "type": "MPLS",
                "linkCategory": "wan",
                "siteId": "site-bj-01",
                "siteName": "北京总部",
                "deviceName": "vEdge-BJ-01",
                "interfaceName": "ge0/0",
                "isp": "中国电信",
                "healthStatus": "healthy",
                "activeStatus": "active",
                "ip": "203.0.113.1",
                "latency": 12.5,
                "loss": 0.01,
                "jitter": 2.3,
                "bandwidth": 100,
                "usedBandwidth": 45.2,
                "utilization": 45.2,
                "slaScore": 99.5,
                "monthlyCost": 5000
            }
        ],
        "total": 30,
        "page": 1,
        "pageSize": 10
    }
}
```

---

### 4.2 获取链路统计

- **GET** `/api/v1/links/stats`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 30,
        "active": 22,
        "standby": 6,
        "down": 2,
        "avgLatency": 25.3,
        "avgLoss": 0.05,
        "totalBandwidth": 3000,
        "usedBandwidth": 1350
    }
}
```

---

### 4.3 获取链路详情

- **GET** `/api/v1/links/{link_id}`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": "link-bj-mpls-01",
        "name": "MPLS-BJ-1",
        "type": "MPLS",
        "healthStatus": "healthy",
        "switchEvents": [
            {
                "id": "evt-001",
                "time": "2026-06-01 10:30:00",
                "fromLink": "MPLS-BJ-1",
                "toLink": "Internet-BJ-1",
                "reason": "MPLS 链路延迟超过阈值"
            }
        ],
        "alerts": [
            {
                "id": "alert-001",
                "severity": "major",
                "category": "quality-degrade",
                "title": "链路质量下降",
                "timestamp": "2026-06-01 10:25:00"
            }
        ]
    }
}
```

---

### 4.4 创建链路

- **POST** `/api/v1/links/`
- **认证**: 需要

**请求体:**
```json
{
    "name": "MPLS-CD-1",
    "type": "MPLS",
    "siteId": "site-cd-01",
    "isp": "中国电信",
    "bandwidth": 100
}
```

---

### 4.5 更新链路

- **PUT** `/api/v1/links/{link_id}`
- **认证**: 需要

---

### 4.6 删除链路

- **DELETE** `/api/v1/links/{link_id}`
- **认证**: 需要

---

### 4.7 手动切换链路

- **POST** `/api/v1/links/{link_id}/switch`
- **认证**: 需要

**请求体:**
```json
{
    "targetLinkId": "link-bj-internet-01",
    "reason": "手动切换到备用链路"
}
```

---

## 五、告警管理 `/api/v1/alerts`

### 5.1 获取告警列表

- **GET** `/api/v1/alerts/`
- **认证**: 需要

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码 |
| pageSize | int | 每页记录数 |
| severity | string | 严重级别：critical/major/minor |
| status | string | 状态：pending/acknowledged/silenced/resolved |
| siteId | string | 关联站点 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [
            {
                "id": "alert-001",
                "severity": "critical",
                "title": "北京总部 MPLS 链路中断",
                "description": "链路延迟超过 100ms 阈值",
                "siteId": "site-bj-01",
                "siteName": "北京总部",
                "linkId": "link-bj-mpls-01",
                "status": "pending",
                "createdAt": "2026-06-01 10:30:00",
                "acknowledgedBy": null,
                "acknowledgedAt": null
            }
        ],
        "total": 5,
        "page": 1,
        "pageSize": 10
    }
}
```

---

### 5.2 获取告警统计

- **GET** `/api/v1/alerts/stats`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 5,
        "critical": 1,
        "major": 2,
        "minor": 2,
        "pending": 3,
        "acknowledged": 2
    }
}
```

---

### 5.3 确认告警

- **POST** `/api/v1/alerts/{alert_id}/acknowledge`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "已确认",
    "data": null
}
```

---

### 5.4 静默告警

- **POST** `/api/v1/alerts/{alert_id}/silence`
- **认证**: 需要

**请求体:**
```json
{
    "duration": 3600
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| duration | int | 静默时长（秒），3600=1小时 |

**成功响应 200:**
```json
{
    "code": 200,
    "message": "已静默",
    "data": null
}
```

---

### 5.5 批量确认告警

- **POST** `/api/v1/alerts/batch-acknowledge`
- **认证**: 需要

**请求体:**
```json
{
    "alertIds": ["alert-001", "alert-002", "alert-003"]
}
```

---

### 5.6 创建告警

- **POST** `/api/v1/alerts/`
- **认证**: 需要

**请求体:**
```json
{
    "severity": "major",
    "title": "链路延迟升高",
    "description": "MPLS 链路延迟超过 50ms",
    "siteId": "site-bj-01",
    "linkId": "link-bj-mpls-01"
}
```

---

## 六、策略管理 `/api/v1/policies`

### 6.1 获取策略列表

- **GET** `/api/v1/policies/`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "items": [
            {
                "id": "pol-001",
                "name": "MPLS 优先策略",
                "type": "route",
                "description": "优先使用 MPLS 链路",
                "priority": 1,
                "status": "active",
                "rules": [
                    { "condition": "latency < 50ms", "action": "use-mpls" },
                    { "condition": "latency >= 50ms", "action": "switch-internet" }
                ],
                "appliedSites": 8
            }
        ],
        "total": 5,
        "page": 1,
        "pageSize": 10
    }
}
```

---

### 6.2 创建策略

- **POST** `/api/v1/policies/`
- **认证**: 需要

**请求体:**
```json
{
    "name": "负载均衡策略",
    "type": "load-balance",
    "description": "在多条链路之间均衡分配流量",
    "priority": 2,
    "rules": [
        { "condition": "bandwidth > 80%", "action": "overflow-to-backup" }
    ]
}
```

---

### 6.3 更新策略

- **PUT** `/api/v1/policies/{policy_id}`
- **认证**: 需要

---

### 6.4 删除策略

- **DELETE** `/api/v1/policies/{policy_id}`
- **认证**: 需要

---

## 七、仪表盘 `/api/v1/dashboard`

### 7.1 获取仪表盘数据

- **GET** `/api/v1/dashboard/`
- **认证**: 需要

**成功响应 200:**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "healthScore": 99.5,
        "stats": {
            "totalSites": 12,
            "onlineSites": 10,
            "offlineSites": 1,
            "totalLinks": 24,
            "criticalAlerts": 0
        },
        "sites": [...],
        "links": [...],
        "applications": [...],
        "alerts": [...],
        "ispBandwidth": [...]
    }
}
```

---

## 八、错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 无效或过期） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 参数校验失败 |
| 500 | 服务器内部错误 |

---

## 九、认证说明

### 获取 Token

```
POST /api/v1/users/login
Body: { "username": "admin", "password": "123456" }

Response:
{
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 使用 Token

所有需要认证的接口，在 Header 中添加：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token 过期

- `access_token` 有效期 30 分钟
- `refresh_token` 有效期 7 天
- access_token 过期后，用 refresh_token 换新 token
- refresh_token 也过期后，需要重新登录
