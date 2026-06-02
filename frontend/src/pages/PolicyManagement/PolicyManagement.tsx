/**
 * SD-WAN 策略管理 - 主页面
 * 核心功能：概览卡片 / 搜索筛选 / 策略表格 / 创建编辑弹窗 / 详情抽屉
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Input, Select, Button, Tag, Badge, Drawer, Modal, Form,
    InputNumber, Tooltip, Empty, Space, Popconfirm, message, Pagination,
    Table, ConfigProvider,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
    FileTextOutlined, StopOutlined, FileProtectOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import {
    getPolicies, createPolicy, updatePolicy, deletePolicy,
    togglePolicyStatus,
} from './api';
import { getSites } from '../../services/siteApi';
import type {
    Policy, PolicyType, PolicyStatus, FilterState, PolicyFormData,
} from './types';
import {
    POLICY_TYPE_LABELS, POLICY_TYPE_COLORS,
    POLICY_STATUS_LABELS,
} from './types';
import './PolicyManagement.css';

/* ============================================================
 *  常量 & 工具
 * ============================================================ */

const STATUS_CONFIG: Record<PolicyStatus, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: '启用', color: '#52c41a', icon: <CheckCircleOutlined /> },
    inactive: { label: '禁用', color: '#8c8c8c', icon: <StopOutlined /> },
    draft: { label: '草稿', color: '#faad14', icon: <FileTextOutlined /> },
};

/** 策略 JSON 描述文件内容 */
const POLICY_JSON_DESC = {
    title: 'SD-WAN 策略配置说明',
    description: '本文档说明策略管理中「匹配条件」和「动作配置」两个 JSON 字段的格式与用法。',
    match_conditions: {
        说明: '定义流量匹配规则，支持单个对象或数组（多条规则取并集）',
        字段说明: {
            source: '源地址，支持 IP/CIDR（如 "192.168.1.0/24"）或 "any"',
            destination: '目的地址，格式同 source',
            application: '应用协议列表，如 ["http", "https", "dns", "ssh", "rdp"]',
            protocol: '协议类型，"tcp" / "udp" / "icmp" / "any"',
            source_port: '源端口，支持数字或范围（如 "1024-65535"）',
            dport: '目的端口，如 80、443',
        },
        示例_单条规则: {
            source: '192.168.1.0/24',
            destination: '10.0.0.0/8',
            application: ['http', 'https'],
            protocol: 'tcp',
        },
        示例_多条规则: [
            { source: '192.168.1.0/24', destination: 'any', application: ['http', 'https'] },
            { source: '192.168.2.0/24', destination: '10.0.0.0/8', protocol: 'tcp', dport: 3306 },
        ],
    },
    action_config: {
        说明: '定义匹配后的执行动作，支持单个对象或数组（按顺序执行多条动作）',
        字段说明: {
            action: '动作类型：steer（转发到指定链路）/ deny（拒绝）/ allow（放行）/ mark（标记 DSCP）',
            target_link: '当 action=steer 时，指定目标链路名称，如 "MPLS"、"Internet"、"4G"',
            dscp: 'QoS DSCP 标记值（0-63），用于 action=mark',
            bandwidth_limit: '带宽限制，如 "10Mbps"',
        },
        示例_单条动作: {
            action: 'steer',
            target_link: 'MPLS',
            dscp: 46,
        },
        示例_多条动作: [
            { action: 'mark', dscp: 46 },
            { action: 'steer', target_link: 'MPLS' },
        ],
    },
};

/** 下载策略描述文件 */
function downloadPolicyDesc() {
    const blob = new Blob([JSON.stringify(POLICY_JSON_DESC, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '策略JSON配置说明.json';
    a.click();
    URL.revokeObjectURL(url);
}

/** 格式化时间 */
function formatTime(isoStr: string): string {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

/** 根据站点 ID 获取显示名称，找不到则返回原始 ID */
function getSiteName(siteId: string, siteMap: Record<string, string>): string {
    return siteMap[siteId] || siteId;
}

/* ============================================================
 *  策略表单弹窗
 * ============================================================ */

interface PolicyFormModalProps {
    open: boolean;
    editingPolicy: Policy | null;
    onClose: () => void;
    onSubmitted: () => void;
}

/** 创建/编辑策略的表单弹窗 */
function PolicyFormModal({ open, editingPolicy, onClose, onSubmitted }: PolicyFormModalProps) {
    const [form] = Form.useForm<PolicyFormData>();
    const [submitting, setSubmitting] = useState(false);
    const [siteOptions, setSiteOptions] = useState<{ label: string; value: string }[]>([]);
    const [sitesLoading, setSitesLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const isEdit = !!editingPolicy;

    /** 加载站点列表（用于关联站点下拉） */
    const fetchSiteOptions = useCallback(async () => {
        setSitesLoading(true);
        try {
            const data = await getSites({ pageSize: 500 });
            const items = data && typeof data === 'object' && 'items' in data ? data.items : data;
            setSiteOptions(
                items.map((site: { id: string; name: string; displayName: string }) => ({
                    label: `${site.name}（${site.displayName}）`,
                    value: site.id,
                }))
            );
        } catch {
            messageApi.error('加载站点列表失败');
        } finally {
            setSitesLoading(false);
        }
    }, [messageApi]);

    // 打开时加载站点 & 填充表单
    useEffect(() => {
        if (open) {
            fetchSiteOptions();
            if (editingPolicy) {
                form.setFieldsValue({
                    name: editingPolicy.name,
                    type: editingPolicy.type,
                    priority: editingPolicy.priority,
                    description: editingPolicy.description || '',
                    match_conditions: editingPolicy.match_conditions
                        ? JSON.stringify(editingPolicy.match_conditions, null, 2)
                        : '',
                    action_config: editingPolicy.action_config
                        ? JSON.stringify(editingPolicy.action_config, null, 2)
                        : '',
                    applied_sites: editingPolicy.applied_sites,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({ type: 'route', priority: 100 });
            }
        }
    }, [open, editingPolicy, form, fetchSiteOptions]);

    /** 提交表单 */
    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // 将 JSON 字符串解析为对象
            const submitData = {
                ...values,
                match_conditions: values.match_conditions
                    ? JSON.parse(values.match_conditions)
                    : null,
                action_config: values.action_config
                    ? JSON.parse(values.action_config)
                    : null,
            };

            if (isEdit && editingPolicy) {
                await updatePolicy(editingPolicy.id, submitData);
                messageApi.success('策略更新成功');
            } else {
                await createPolicy(submitData);
                messageApi.success('策略创建成功');
            }
            onSubmitted();
            onClose();
        } catch (err) {
            // 表单校验失败或接口错误
            if (err instanceof SyntaxError) {
                messageApi.error('JSON 格式错误，请检查匹配条件和动作配置');
            } else if (err instanceof Error) {
                messageApi.error(`操作失败: ${err.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    }, [form, isEdit, editingPolicy, onSubmitted, onClose, messageApi]);

    return (
        <Modal
            title={isEdit ? '编辑策略' : '创建策略'}
            open={open}
            onOk={handleSubmit}
            onCancel={onClose}
            confirmLoading={submitting}
            okText={isEdit ? '保存' : '创建'}
            cancelText="取消"
            width={640}
            className="policy-modal"
            destroyOnClose
        >
            {contextHolder}
            <Form form={form} layout="vertical" className="policy-form">
                <Form.Item
                    name="name"
                    label="策略名称"
                    rules={[
                        { required: true, message: '请输入策略名称' },
                        { min: 2, max: 100, message: '名称长度 2-100 字符' },
                    ]}
                >
                    <Input placeholder="例如：HQ-集中出口路由策略" />
                </Form.Item>

                <Space size={24} style={{ width: '100%' }}>
                    <Form.Item
                        name="type"
                        label="策略类型"
                        rules={[{ required: true, message: '请选择策略类型' }]}
                    >
                        <Select style={{ width: 200 }}>
                            {Object.entries(POLICY_TYPE_LABELS).map(([key, label]) => (
                                <Select.Option key={key} value={key}>{label}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="优先级"
                        rules={[{ required: true, message: '请输入优先级' }]}
                        tooltip="数字越小优先级越高"
                    >
                        <InputNumber min={1} max={9999} style={{ width: 120 }} />
                    </Form.Item>
                </Space>

                <Form.Item name="description" label="策略描述">
                    <Input.TextArea rows={3} placeholder="描述策略的用途和适用场景" maxLength={500} showCount />
                </Form.Item>

                <Form.Item
                    name="match_conditions"
                    label={
                        <Space>
                            <span>匹配条件（JSON）</span>
                            <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={downloadPolicyDesc}
                                style={{ padding: 0, fontSize: 12 }}
                            >
                                下载配置说明
                            </Button>
                        </Space>
                    }
                    tooltip={'定义流量匹配规则，支持对象或数组。常用字段：source（源地址）、destination（目的地址）、application（应用协议列表）、protocol（协议类型）、source_port/dport（端口）。'}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (value) {
                                    try {
                                        JSON.parse(value);
                                    } catch {
                                        throw new Error('请输入有效的 JSON 格式');
                                    }
                                }
                            },
                        },
                    ]}
                >
                    <Input.TextArea
                        rows={6}
                        placeholder={'/* 单条规则 */\n{\n  "source": "192.168.1.0/24",\n  "destination": "any",\n  "application": ["http", "https"]\n}\n\n/* 或多条规则（数组） */\n[\n  {"source": "192.168.1.0/24", "application": ["http"]},\n  {"source": "192.168.2.0/24", "protocol": "tcp", "dport": 3306}\n]'}
                    />
                </Form.Item>

                <Form.Item
                    name="action_config"
                    label={
                        <Space>
                            <span>动作配置（JSON）</span>
                            <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={downloadPolicyDesc}
                                style={{ padding: 0, fontSize: 12 }}
                            >
                                下载配置说明
                            </Button>
                        </Space>
                    }
                    tooltip="定义匹配后的执行动作，支持对象或数组。常用字段：action（steer 转发 / deny 拒绝 / allow 放行 / mark 标记）、target_link（指定链路）、dscp（QoS 标记）、bandwidth_limit（带宽限制）。"
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (value) {
                                    try {
                                        JSON.parse(value);
                                    } catch {
                                        throw new Error('请输入有效的 JSON 格式');
                                    }
                                }
                            },
                        },
                    ]}
                >
                    <Input.TextArea
                        rows={6}
                        placeholder={'/* 单条动作 */\n{\n  "action": "steer",\n  "target_link": "MPLS",\n  "dscp": 46\n}\n\n/* 或多条动作（按顺序执行） */\n[\n  {"action": "mark", "dscp": 46},\n  {"action": "steer", "target_link": "MPLS"}\n]'}
                    />
                </Form.Item>

                <Form.Item name="applied_sites" label="关联站点">
                    <Select
                        mode="multiple"
                        placeholder="请选择关联站点"
                        loading={sitesLoading}
                        options={siteOptions}
                        showSearch
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}

/* ============================================================
 *  主组件
 * ============================================================ */

export default function PolicyManagement() {
    /* ---------- 状态 ---------- */
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(false);
    const [siteMap, setSiteMap] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState<FilterState>({ type: 'all', status: 'all', search: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [detailPolicy, setDetailPolicy] = useState<Policy | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    /* ---------- 加载数据 ---------- */
    const fetchSiteMap = useCallback(async () => {
        try {
            const data = await getSites({ pageSize: 500 });
            const items = data && typeof data === 'object' && 'items' in data ? data.items : data;
            const map: Record<string, string> = {};
            items.forEach((site: { id: string; displayName: string }) => {
                map[site.id] = site.displayName;
            });
            setSiteMap(map);
        } catch {
            // 站点加载失败不影响策略列表
        }
    }, []);

    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {};
            if (filter.type !== 'all') params.type = filter.type;
            if (filter.status !== 'all') params.status = filter.status;
            if (filter.search.trim()) params.search = filter.search.trim();
            const data = await getPolicies(params);
            setPolicies(data.items);
        } catch (err) {
            messageApi.error('获取策略列表失败');
        } finally {
            setLoading(false);
        }
    }, [filter, messageApi]);

    useEffect(() => {
        fetchSiteMap();
        fetchPolicies();
    }, [fetchPolicies, fetchSiteMap]);

    /* ---------- 筛选变化时重置页码 ---------- */
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    /* ---------- 概览统计 ---------- */
    const stats = useMemo(() => {
        const total = policies.length;
        const active = policies.filter((p) => p.status === 'active').length;
        const inactive = policies.filter((p) => p.status === 'inactive').length;
        const draft = policies.filter((p) => p.status === 'draft').length;
        return { total, active, inactive, draft };
    }, [policies]);

    /* ---------- CRUD 操作 ---------- */
    const handleCreate = useCallback(() => {
        setEditingPolicy(null);
        setModalOpen(true);
    }, []);

    const handleEdit = useCallback((policy: Policy, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingPolicy(policy);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await deletePolicy(id);
            messageApi.success('策略已删除');
            fetchPolicies();
        } catch (err) {
            messageApi.error('删除失败');
        }
    }, [messageApi, fetchPolicies]);

    const handleToggleStatus = useCallback(async (policy: Policy, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newStatus = policy.status === 'active' ? 'inactive' : 'active';
        try {
            await togglePolicyStatus(policy.id, newStatus);
            messageApi.success(`策略已${newStatus === 'active' ? '启用' : '禁用'}`);
            fetchPolicies();
        } catch (err) {
            messageApi.error('状态切换失败');
        }
    }, [messageApi, fetchPolicies]);

    const handleViewDetail = useCallback((policy: Policy) => {
        setDetailPolicy(policy);
        setDrawerOpen(true);
    }, []);

    /** 弹窗提交后刷新 */
    const handleFormSubmitted = useCallback(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    /* ---------- 处理 JSON 字段显示 ---------- */
    const formatJson = useCallback((obj: Record<string, unknown> | Record<string, unknown>[] | null): string => {
        if (!obj || Object.keys(obj).length === 0) return '—';
        return JSON.stringify(obj, null, 2);
    }, []);

    /* ---------- 表格列定义 ---------- */
    const columns = useMemo(() => [
        {
            title: '策略名称',
            width: 200,
            key: 'name',
            render: (_: unknown, policy: Policy) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {policy.name}
                    </span>
                    {policy.description && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }} className="line-clamp-1">
                            {policy.description}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: '类型',
            width: 130,
            key: 'type',
            render: (_: unknown, policy: Policy) => (
                <Tag color={POLICY_TYPE_COLORS[policy.type]} style={{ margin: 0 }}>
                    {POLICY_TYPE_LABELS[policy.type]}
                </Tag>
            ),
        },
        {
            title: '优先级',
            width: 100,
            key: 'priority',
            align: 'center' as const,
            sorter: (a: Policy, b: Policy) => a.priority - b.priority,
            render: (_: unknown, policy: Policy) => (
                <span
                    style={{
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color: policy.priority <= 50 ? '#ff4d4f' : policy.priority <= 200 ? '#faad14' : 'var(--text-muted)',
                    }}
                >
                    {policy.priority}
                </span>
            ),
        },
        {
            title: '状态',
            width: 100,
            key: 'status',
            render: (_: unknown, policy: Policy) => (
                <span className={`status-tag status-tag--${policy.status}`}>
                    {STATUS_CONFIG[policy.status].icon}
                    {STATUS_CONFIG[policy.status].label}
                </span>
            ),
        },
        {
            title: '关联站点',
            key: 'applied_sites',
            render: (_: unknown, policy: Policy) => (
                policy.applied_sites.length > 0 ? (
                    <Tooltip
                        title={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {policy.applied_sites.map((s) => (
                                    <span key={s} style={{ fontSize: 12 }}>{getSiteName(s, siteMap)}</span>
                                ))}
                            </div>
                        }
                    >
                        <Badge count={policy.applied_sites.length} style={{ backgroundColor: '#1890ff' }}>
                            <Tag color="blue" style={{ margin: 0 }}>已绑定</Tag>
                        </Badge>
                    </Tooltip>
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>未绑定</span>
                )
            ),
        },
        {
            title: '创建时间',
            width: 160,
            key: 'created_at',
            render: (_: unknown, policy: Policy) => (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {formatTime(policy.created_at)}
                </span>
            ),
        },
        {
            title: '操作',
            width: 160,
            key: 'action',
            align: 'center' as const,
            render: (_: unknown, policy: Policy) => (
                <Space size={4}>
                    <Tooltip title={policy.status === 'active' ? '禁用' : '启用'}>
                        <Button
                            type="text"
                            size="small"
                            icon={policy.status === 'active' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                            style={{ color: policy.status === 'active' ? '#faad14' : '#52c41a' }}
                            onClick={(e) => handleToggleStatus(policy, e)}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            style={{ color: '#1890ff' }}
                            onClick={(e) => handleEdit(policy, e)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该策略？"
                        description="此操作不可恢复"
                        onConfirm={(e) => handleDelete(policy.id, e as unknown as React.MouseEvent)}
                    >
                        <Tooltip title="删除">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ], [handleToggleStatus, handleEdit, handleDelete]);

    /* ============================================================
     *  渲染
     * ============================================================ */
    return (
        <div className="policy-mgmt">
            {contextHolder}

            {/* ===== 页面标题 ===== */}
            <div className="policy-mgmt__header">
                <div className="policy-mgmt__header-left">
                    <h1 className="policy-mgmt__title">
                        <FileProtectOutlined /> 策略管理
                    </h1>
                    <span className="policy-mgmt__subtitle">SD-WAN 流量策略与安全规则管理</span>
                </div>
                <div className="policy-mgmt__header-right">
                    <Button icon={<ReloadOutlined />} onClick={fetchPolicies} loading={loading}>
                        刷新数据
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        创建策略
                    </Button>
                </div>
            </div>

            {/* ===== 概览卡片 ===== */}
            <div className="overview-cards">
                <div className="overview-card overview-card--total">
                    <div className="overview-card__icon">📋</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value">{stats.total}</span>
                        <span className="overview-card__label">总策略数</span>
                    </div>
                </div>
                <div className="overview-card overview-card--online">
                    <div className="overview-card__icon" style={{ color: '#52c41a' }}>✅</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#52c41a' }}>{stats.active}</span>
                        <span className="overview-card__label">启用中</span>
                    </div>
                </div>
                <div className="overview-card overview-card--offline">
                    <div className="overview-card__icon" style={{ color: '#8c8c8c' }}>⏸️</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#8c8c8c' }}>{stats.inactive}</span>
                        <span className="overview-card__label">已禁用</span>
                    </div>
                </div>
                <div className="overview-card overview-card--warning">
                    <div className="overview-card__icon" style={{ color: '#faad14' }}>📝</div>
                    <div className="overview-card__info">
                        <span className="overview-card__value" style={{ color: '#faad14' }}>{stats.draft}</span>
                        <span className="overview-card__label">草稿中</span>
                    </div>
                </div>
            </div>

            {/* ===== 筛选栏 ===== */}
            <div className="filter-bar">
                <div className="filter-bar__left">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="搜索策略名称..."
                        allowClear
                        value={filter.search}
                        onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                        style={{ width: 240 }}
                    />
                    <Select
                        placeholder="类型筛选"
                        allowClear
                        value={filter.type === 'all' ? undefined : filter.type}
                        onChange={(v) => setFilter((f) => ({ ...f, type: v || 'all' }))}
                        style={{ width: 170 }}
                        options={Object.entries(POLICY_TYPE_LABELS).map(([key, label]) => ({
                            label, value: key,
                        }))}
                    />
                    <Select
                        placeholder="状态筛选"
                        allowClear
                        value={filter.status === 'all' ? undefined : filter.status}
                        onChange={(v) => setFilter((f) => ({ ...f, status: v || 'all' }))}
                        style={{ width: 130 }}
                        options={Object.entries(POLICY_STATUS_LABELS).map(([key, label]) => ({
                            label, value: key,
                        }))}
                    />
                    <span className="filter-bar__count">
                        共 <strong>{policies.length}</strong> 条策略
                    </span>
                </div>
            </div>

            {/* ===== 策略表格 ===== */}
            <ConfigProvider
                theme={{
                    token: {
                        colorBgContainer: 'var(--bg-card)',
                        colorBorderSecondary: 'var(--border-secondary)',
                        colorText: 'var(--text-primary)',
                        colorTextSecondary: 'var(--text-secondary)',
                        colorTextTertiary: 'var(--text-muted)',
                        headerBg: 'var(--bg-tertiary)',
                        controlInteractiveBg: 'var(--bg-tertiary)',
                    },
                }}
            >
                <Table
                    columns={columns}
                    dataSource={policies}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    onRow={(policy) => ({
                        onClick: () => handleViewDetail(policy),
                        style: { cursor: 'pointer' },
                    })}
                    locale={{
                        emptyText: <Empty description="暂无策略数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                    }}
                />
                {policies.length > 0 && (
                    <Pagination
                        align="center"
                        current={currentPage}
                        pageSize={pageSize}
                        total={policies.length}
                        onChange={(page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        }}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条策略`}
                        pageSizeOptions={['10', '20', '50', '100']}
                        style={{ marginTop: 16 }}
                    />
                )}
            </ConfigProvider>

            {/* ===== 创建/编辑弹窗 ===== */}
            <PolicyFormModal
                open={modalOpen}
                editingPolicy={editingPolicy}
                onClose={() => setModalOpen(false)}
                onSubmitted={handleFormSubmitted}
            />

            {/* ===== 策略详情抽屉 ===== */}
            <Drawer
                title={null}
                placement="right"
                width={560}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className="policy-drawer"
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                {detailPolicy && (
                    <div className="detail-drawer">
                        {/* 头部 */}
                        <div className={`detail-drawer__header detail-drawer__header--${detailPolicy.status}`}>
                            <div className="detail-drawer__header-top">
                                <h2>{detailPolicy.name}</h2>
                                <Tag color={POLICY_TYPE_COLORS[detailPolicy.type]} style={{ margin: 0 }}>
                                    {POLICY_TYPE_LABELS[detailPolicy.type]}
                                </Tag>
                                <span className={`detail-drawer__status detail-drawer__status--${detailPolicy.status}`}>
                                    {STATUS_CONFIG[detailPolicy.status].icon}
                                    {STATUS_CONFIG[detailPolicy.status].label}
                                </span>
                            </div>
                            <div className="detail-drawer__meta">
                                <span>优先级: {detailPolicy.priority}</span>
                                <span>·</span>
                                <span>创建: {formatTime(detailPolicy.created_at)}</span>
                                <span>·</span>
                                <span>更新: {formatTime(detailPolicy.updated_at)}</span>
                            </div>
                        </div>

                        <div className="detail-drawer__body">
                            {/* 描述 */}
                            {detailPolicy.description && (
                                <section className="detail-section">
                                    <h4 className="detail-section__title"><FileTextOutlined /> 策略描述</h4>
                                    <div className="detail-desc">{detailPolicy.description}</div>
                                </section>
                            )}

                            {/* 匹配条件 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><SearchOutlined /> 匹配条件</h4>
                                <pre className="detail-json">{formatJson(detailPolicy.match_conditions)}</pre>
                            </section>

                            {/* 动作配置 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title"><FileProtectOutlined /> 动作配置</h4>
                                <pre className="detail-json">{formatJson(detailPolicy.action_config)}</pre>
                            </section>

                            {/* 关联站点 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">关联站点</h4>
                                {detailPolicy.applied_sites.length > 0 ? (
                                    <div className="detail-sites">
                                        {detailPolicy.applied_sites.map((site) => (
                                            <Tag key={site} color="blue" style={{ margin: '2px 4px 2px 0' }}>
                                                {getSiteName(site, siteMap)}
                                            </Tag>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty description="未关联站点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </section>

                            {/* 快捷操作 */}
                            <section className="detail-section">
                                <h4 className="detail-section__title">快捷操作</h4>
                                <div className="quick-actions">
                                    <Button
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setDrawerOpen(false);
                                            handleEdit(detailPolicy);
                                        }}
                                    >
                                        编辑策略
                                    </Button>
                                    <Button
                                        icon={detailPolicy.status === 'active' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                                        onClick={() => {
                                            handleToggleStatus(detailPolicy);
                                            fetchPolicies();
                                        }}
                                    >
                                        {detailPolicy.status === 'active' ? '禁用策略' : '启用策略'}
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
