# 链路与设备绑定关系实现计划

## 需求概述

实现链路管理（WanLink）与设备管理（Device）的绑定关系，支持站点跨设备配置主备链路。

## 数据关系

```
站点 (Site)
├── 设备 1 (Device)
│   ├── 链路 A: MPLS      ← 可设为站点主链路
│   ├── 链路 B: Internet
│   └── 链路 C: 5G
│
├── 设备 2 (Device)
│   ├── 链路 D: MPLS
│   └── 链路 E: Internet  ← 可设为站点备用链路
│
└── 站点配置
    ├── 主链路: 链路 A（设备1）
    └── 备用链路: [链路 E（设备2）, 链路 C（设备1）]
```

## 实现步骤

### 第一步：数据库模型修改

**文件**: `backend/app/models/link.py`

在 `WanLink` 表添加字段：
```python
device_id = Column(String(50), ForeignKey("devices.id"), nullable=True, index=True, comment="所属设备ID")
device_name = Column(String(100), comment="所属设备名称（冗余）")
```

**文件**: `backend/app/models/site.py`

在 `Site` 表添加字段：
```python
backup_link_ids = Column(Text, comment="备用链路ID列表（JSON数组）")
```

### 第二步：更新种子数据

**文件**: `backend/app/seed.py`

1. 修改 `_seed_wan_links` 函数，为每条链路分配 `device_id`
2. 关联逻辑：根据站点找到该站点的设备，将链路挂到设备下面
3. 为每个站点配置主链路和备用链路

### 第三步：更新 Pydantic Schema

**文件**: `backend/app/schemas/link.py`

- WanLink 响应添加 `device_id`、`device_name` 字段

**文件**: `backend/app/schemas/site.py`

- Site 响应添加 `backup_link_ids` 字段
- 添加站点链路配置的更新接口

### 第四步：更新 API 接口

**文件**: `backend/app/api/endpoints/links.py`

- 列表接口支持按 `device_id` 筛选

**文件**: `backend/app/api/endpoints/sites.py`

- 添加站点链路配置接口 `PUT /api/v1/sites/{id}/link-config`
- 响应中包含主链路和备用链路详情

### 第五步：更新前端类型

**文件**: `frontend/src/pages/LinkManagement/types.ts`

- WanLink 添加 `device_id`、`device_name`

**文件**: `frontend/src/pages/SiteManagement/types.ts`

- Site 添加 `backup_link_ids`

### 第六步：更新前端展示

**文件**: `frontend/src/pages/DeviceManagement/DeviceManagement.tsx`

- 接口/隧道 Tab 显示所属链路名称

**文件**: `frontend/src/pages/LinkManagement/LinkManagement.tsx`

- 链路列表显示所属设备名称

**文件**: `frontend/src/pages/SiteManagement/SiteManagement.tsx`

- 站点详情显示主链路、备用链路配置
- 支持跨设备选择主备链路

---

## 执行顺序

1. ✅ 修改 WanLink 模型（加 device_id）
2. ✅ 修改 Site 模型（加 backup_link_ids）
3. ✅ 更新种子数据
4. ✅ 更新 Schema
5. ✅ 更新 API 接口
6. ✅ 更新前端类型
7. ✅ 更新前端展示

## 验证标准

- [x] 链路列表能显示所属设备
- [x] 设备详情能显示该设备的链路
- [x] 站点能跨设备配置主备链路
- [x] API 返回正确的关联数据

## 实现总结

### 后端修改

1. **WanLink 模型** (`backend/app/models/link.py`)
   - 新增 `device_id` 字段（外键关联 devices.id）
   - 新增 `device_name` 字段（冗余，便于查询）

2. **Site 模型** (`backend/app/models/site.py`)
   - 新增 `active_wan_link_id` 字段（主 WAN 链路 ID）
   - 新增 `backup_link_ids` 字段（备用链路 ID 列表，JSON 格式）

3. **种子数据** (`backend/app/seed.py`)
   - 为每条链路分配设备（按站点轮流分配）
   - 为每个站点配置主链路和备用链路

4. **Schema** (`backend/app/schemas/link.py`, `backend/app/schemas/site.py`)
   - WanLink 响应添加 `deviceId`、`deviceName` 字段
   - Site 响应添加 `activeWanLinkId`、`backupLinkIds` 字段

5. **API 接口**
   - `GET /api/v1/links/` 支持按 `deviceId` 筛选
   - `GET /api/v1/sites/{id}/link-config` 获取站点链路配置
   - `PUT /api/v1/sites/{id}/link-config` 更新站点链路配置

### 前端修改

1. **类型定义**
   - `LinkManagement/types.ts`: WanLink 添加 `deviceId`、`deviceName`
   - `SiteManagement/types.ts`: SiteFromAPI 添加 `activeWanLinkId`、`backupLinkIds`
   - `DeviceManagement/types.ts`: 接口和隧道添加 `link_id`、`link_name`

2. **页面展示**
   - `LinkManagement.tsx`: 链路列表新增"所属设备"列
   - `DeviceManagement.tsx`: 接口/隧道卡片显示关联链路名称
