# 表格层次感增强优化

## 🎯 优化目标

解决表格"层次感不强"的问题，通过多维度增强表格的视觉层次和可读性。

## ✅ 主要优化

### 1. 表头与表体的明显区分

**深色主题**：
```css
/* 表头 - 深色背景 + 明显边框 */
background: #0f1735;
border-bottom: 2px solid #1e2a5c;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
```

**浅色主题**：
```css
/* 表头 - 浅灰背景 + 清晰边框 */
background: #f8fafc;
border-bottom: 2px solid #d1d5db;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
```

### 2. 斑马纹效果

```css
/* 偶数行背景色差异 */
.ant-table-tbody > tr:nth-child(even) > td {
    background: var(--bg-tertiary);
}
```

**效果对比**：
- **深色主题**：透明背景 vs `rgba(15, 23, 53, 0.5)`
- **浅色主题**：透明背景 vs `#f8fafc`

### 3. 行悬浮效果

```css
/* 悬浮时背景变化 + 边框高亮 */
.ant-table-tbody > tr:hover > td {
    background: var(--bg-elevated) !important;
    box-shadow: inset 0 0 0 1px var(--border-active);
}
```

**交互反馈**：
- **深色主题**：悬浮到 `#121840` + 青色边框
- **浅色主题**：悬浮到白色 + 蓝色边框

### 4. 列分隔线

```css
/* 表头列之间的竖线 */
.ant-table-thead > tr > th::after {
    content: '';
    width: 1px;
    background: var(--border-secondary);
}
```

**视觉分隔**：
- **深色主题**：`#253270` (中等对比度)
- **浅色主题**：`#e5e7eb` (清晰可见)

### 5. 表格容器阴影

**深色主题**：
```css
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
```

**浅色主题**：
```css
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
```

### 6. 表尾和汇总

```css
/* 表尾 */
.ant-table-footer {
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border-primary);
}

/* 汇总行 */
.ant-table-summary {
    background: var(--bg-tertiary);
    border-top: 2px solid var(--border-primary);
}
```

## 📊 优化效果对比

### 之前（层次感不强）
- ❌ 表头和表体区分不明显
- ❌ 行与行之间缺乏视觉分隔
- ❌ 悬浮效果微弱
- ❌ 整体缺乏深度感

### 之后（层次分明）
- ✅ 表头明显突出（背景色 + 阴影）
- ✅ 斑马纹增强可读性
- ✅ 悬浮效果强烈（背景变化 + 边框高亮）
- ✅ 整体具有3D深度感

## 🎨 视觉层次结构

```
┌─────────────────────────────────┐
│ 表头（突出显示）               │ ← 背景 + 阴影 + 粗边框
├─────────────────────────────────┤
│ 第1行（透明背景）              │
├─────────────────────────────────┤
│ 第2行（斑马纹背景）            │ ← 背景色差异
├─────────────────────────────────┤
│ 第3行（透明背景）              │
├─────────────────────────────────┤
│ 第4行（斑马纹背景）            │
└─────────────────────────────────┘
```

## 🔧 特殊功能类

### 紧凑型表格
```jsx
<Table className="table-compact" />
```

### 无边框表格
```jsx
<Table className="table-borderless" />
```

### 高亮行
```jsx
<Table className="table-highlight" />
```

### 状态行样式
```jsx
<Table className="table-row-success" />  /* 成功状态 */
<Table className="table-row-warning" />  /* 警告状态 */
<Table className="table-row-error" />    /* 错误状态 */
```

## 🚀 使用方法

### 1. 全局引入（已完成）
样式已在 `main.tsx` 中全局引入，所有 Ant Design 表格自动应用。

### 2. 自定义样式
```jsx
// 使用特殊功能类
<Table 
    className="table-compact table-highlight"
    dataSource={data}
    columns={columns}
/>
```

### 3. 主题自适应
所有样式会根据当前主题自动切换：
- 深色主题：科技感、高对比度
- 浅色主题：清爽易读、层次分明

## 📱 响应式适配

移动端自动优化：
- 减小内边距
- 缩小字体
- 优化选择列宽度

## 💡 设计原则

### 1. 视觉层次
- **表头** → 最突出（背景 + 阴影）
- **当前行** → 次突出（悬浮高亮）
- **其他行** → 基础显示（斑马纹区分）

### 2. 可读性
- **斑马纹** → 增强行与行之间的区分
- **列分隔线** → 清晰的列边界
- **字体层次** → 表头加粗、表体常规

### 3. 交互反馈
- **悬浮** → 明显的视觉变化
- **边框高亮** → 主题色的强调效果
- **阴影深度** → 3D立体感

## 🎯 适用场景

- ✅ 站点管理表格
- ✅ 设备管理表格
- ✅ 告警列表表格
- ✅ 链路管理表格
- ✅ 所有 Ant Design Table 组件

---

**立即体验**：启动项目，查看任何包含表格的页面，切换主题即可看到增强的层次感效果。
