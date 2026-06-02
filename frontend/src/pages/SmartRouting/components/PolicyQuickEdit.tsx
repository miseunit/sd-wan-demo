/**
 * 策略快捷编辑弹窗
 * 用于快速创建/编辑选路策略和应用流量策略
 */
import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { createPolicy, updatePolicy } from '../../PolicyManagement/api';
import type { CurrentPolicy } from '../types';

interface PolicyQuickEditProps {
    /** 弹窗可见 */
    open: boolean;
    /** 当前策略（编辑模式） */
    currentPolicy: CurrentPolicy | null;
    /** 源站点ID */
    sourceSiteId: string;
    /** 目的站点ID */
    destSiteId: string;
    /** 源站点名称 */
    sourceName: string;
    /** 目的站点名称 */
    destName: string;
    /** 关闭回调 */
    onClose: () => void;
    /** 保存成功回调 */
    onSaved: () => void;
}

/** 策略类型选项及描述 */
const POLICY_TYPE_OPTIONS = [
    {
        value: 'route',
        label: '路由策略',
        description: '基于源/目的站点匹配流量，控制数据包的传输路径选择',
    },
    {
        value: 'qos',
        label: 'QoS 策略',
        description: '服务质量策略，对匹配流量进行优先级调度和带宽保障，确保关键业务性能',
    },
    {
        value: 'app_aware',
        label: '应用感知策略',
        description: '识别应用类型（如视频会议、ERP等），针对不同应用进行精细化流量管理',
    },
];

/** 策略类型描述映射表 */
const POLICY_TYPE_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
    POLICY_TYPE_OPTIONS.map((option) => [option.value, option.description])
);

/** 选路模式选项及描述 */
const ROUTING_MODE_OPTIONS = [
    {
        value: 'primary-backup',
        label: '主备模式',
        description: '优先使用主链路，主链路故障时自动切换到备用链路，确保业务连续性',
    },
    {
        value: 'load-balance',
        label: '负载均衡',
        description: '根据链路带宽利用率动态分配流量，最大化利用多条链路资源，提升整体吞吐',
    },
    {
        value: 'smart',
        label: '智能选路',
        description: '基于实时延迟、丢包率、抖动等指标综合评分，自动选择最优路径，保障关键业务体验',
    },
];

/** 选路模式描述映射表 */
const ROUTING_MODE_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
    ROUTING_MODE_OPTIONS.map((option) => [option.value, option.description])
);

/**
 * 策略快捷编辑弹窗组件
 */
export default function PolicyQuickEdit({
    open,
    currentPolicy,
    sourceSiteId,
    destSiteId,
    sourceName,
    destName,
    onClose,
    onSaved,
}: PolicyQuickEditProps) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const isEdit = !!currentPolicy;

    /** 打开时填充表单 */
    useEffect(() => {
        if (open) {
            if (currentPolicy) {
                form.setFieldsValue({
                    name: currentPolicy.name,
                    type: currentPolicy.type,
                    priority: currentPolicy.priority,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    name: `${sourceName}→${destName} 选路策略`,
                    type: 'route',
                    priority: 100,
                    routing_mode: 'smart',
                });
            }
        }
    }, [open, currentPolicy, form, sourceName, destName]);

    /** 提交表单 */
    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const submitData = {
                name: values.name,
                type: values.type,
                priority: values.priority,
                description: `智能选路策略：${sourceName} → ${destName}`,
                match_conditions: {
                    source_sites: [sourceSiteId],
                    dest_sites: [destSiteId],
                },
                action_config: {
                    routing_mode: values.routing_mode || 'smart',
                },
                applied_sites: [sourceSiteId, destSiteId],
            };

            if (isEdit && currentPolicy) {
                await updatePolicy(currentPolicy.id, submitData);
                messageApi.success('策略更新成功');
            } else {
                await createPolicy(submitData);
                messageApi.success('策略创建成功');
            }
            onSaved();
            onClose();
        } catch (err) {
            if (err instanceof Error) {
                messageApi.error(`操作失败: ${err.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    }, [form, isEdit, currentPolicy, sourceSiteId, destSiteId, sourceName, destName, onSaved, onClose, messageApi]);

    return (
        <Modal
            title={isEdit ? '编辑选路策略' : '创建选路策略'}
            open={open}
            onOk={handleSubmit}
            onCancel={onClose}
            confirmLoading={submitting}
            okText={isEdit ? '保存' : '创建'}
            cancelText="取消"
            width={520}
            destroyOnClose
        >
            {contextHolder}
            <Form form={form} layout="vertical">
                <Form.Item
                    name="name"
                    label="策略名称"
                    rules={[
                        { required: true, message: '请输入策略名称' },
                        { min: 2, max: 100, message: '名称长度 2-100 字符' },
                    ]}
                >
                    <Input placeholder="例如：总部MPLS优先策略" />
                </Form.Item>

                <Form.Item
                    name="type"
                    label="策略类型"
                    rules={[{ required: true, message: '请选择策略类型' }]}
                >
                    <Select options={POLICY_TYPE_OPTIONS} />
                </Form.Item>

                {/* 策略类型描述 */}
                <Form.Item noStyle>
                    <Form.Item shouldUpdate>
                        {() => {
                            const policyType = form.getFieldValue('type') || 'route';
                            const description = POLICY_TYPE_DESCRIPTIONS[policyType];
                            return (
                                <div
                                    style={{
                                        background: 'var(--bg-tertiary, #f5f5f5)',
                                        borderRadius: 8,
                                        padding: '12px 16px',
                                        marginTop: -8,
                                        marginBottom: 12,
                                        fontSize: 13,
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color, #e8e8e8)',
                                    }}
                                >
                                    <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        💡 类型说明
                                    </div>
                                    <div>{description}</div>
                                </div>
                            );
                        }}
                    </Form.Item>
                </Form.Item>

                <Form.Item
                    name="priority"
                    label="优先级"
                    rules={[{ required: true, message: '请输入优先级' }]}
                    tooltip="数字越小优先级越高"
                >
                    <InputNumber min={1} max={9999} style={{ width: 120 }} />
                </Form.Item>

                <Form.Item
                    name="routing_mode"
                    label="选路模式"
                    rules={[{ required: true, message: '请选择选路模式' }]}
                >
                    <Select options={ROUTING_MODE_OPTIONS} />
                </Form.Item>

                {/* 选路模式描述 */}
                <Form.Item noStyle>
                    <Form.Item shouldUpdate>
                        {() => {
                            const routingMode = form.getFieldValue('routing_mode') || 'smart';
                            const description = ROUTING_MODE_DESCRIPTIONS[routingMode];
                            return (
                                <div
                                    style={{
                                        background: 'var(--bg-tertiary, #f5f5f5)',
                                        borderRadius: 8,
                                        padding: '12px 16px',
                                        marginTop: -8,
                                        marginBottom: 16,
                                        fontSize: 13,
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color, #e8e8e8)',
                                    }}
                                >
                                    <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        💡 模式说明
                                    </div>
                                    <div>{description}</div>
                                </div>
                            );
                        }}
                    </Form.Item>
                </Form.Item>

                <div style={{
                    background: 'var(--bg-tertiary, #f5f5f5)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginTop: 8,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                }}>
                    <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                        策略关联
                    </div>
                    <div>源站点：<strong>{sourceName}</strong></div>
                    <div>目的站点：<strong>{destName}</strong></div>
                </div>
            </Form>
        </Modal>
    );
}
