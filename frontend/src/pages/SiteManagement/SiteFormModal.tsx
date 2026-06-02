/**
 * 站点添加/编辑表单弹窗
 * 支持创建和编辑两种模式，复用同一表单组件
 * 支持绑定在线设备
 */
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Divider, Tag, Spin } from 'antd';
import { PlusOutlined, MinusCircleOutlined, DesktopOutlined } from '@ant-design/icons';
import { createSite, updateSite, getOnlineDevices, getSiteDevices } from '../../services/siteApi';

const REGION_OPTIONS = [
    { label: '🇨🇳 中国', value: 'CN' },
    { label: '🇸🇬 新加坡', value: 'SG' },
    { label: '🇺🇸 美国', value: 'US' },
    { label: '🇪🇺 欧洲', value: 'EU' },
];

const SITE_TYPE_OPTIONS = [
    { label: '🏢 总部', value: 'hq' },
    { label: '🏪 分支', value: 'branch' },
    { label: '☁️ 云端', value: 'cloud' },
];

/** 设备选项 */
interface DeviceOption {
    id: string;
    name: string;
    device_type: string;
    online_status: string;
    site_id: string | null;
    site_name: string | null;
}

/** 站点表单弹窗 */
interface SiteFormModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    initialValues?: Record<string, any> | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SiteFormModal({ open, mode, initialValues, onClose, onSuccess }: SiteFormModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    // 设备相关状态
    const [deviceOptions, setDeviceOptions] = useState<DeviceOption[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

    /** 加载在线设备列表 */
    const fetchOnlineDevices = async () => {
        setDevicesLoading(true);
        try {
            const data = await getOnlineDevices({ page: 1, pageSize: 100, online_status: 'online' });
            const items = data?.items || data || [];
            setDeviceOptions(items);
        } catch (error) {
            console.error('加载设备列表失败:', error);
        } finally {
            setDevicesLoading(false);
        }
    };

    /** 加载站点已绑定的设备 */
    const fetchSiteDevices = async (siteId: string) => {
        try {
            const data = await getSiteDevices(siteId);
            const devices = data?.devices || [];
            const deviceIds = devices.map((d: any) => d.id);
            setSelectedDeviceIds(deviceIds);
            form.setFieldValue('deviceIds', deviceIds);
        } catch (error) {
            console.error('加载站点设备失败:', error);
        }
    };

    // 弹窗打开时初始化表单和加载设备
    useEffect(() => {
        if (open) {
            // 加载在线设备列表
            fetchOnlineDevices();

            if (mode === 'edit' && initialValues) {
                form.setFieldsValue({
                    name: initialValues.name,
                    displayName: initialValues.displayName,
                    region: initialValues.region,
                    siteType: initialValues.siteType || 'branch',
                    address: initialValues.address,
                    lat: initialValues.lat != null ? String(initialValues.lat) : undefined,
                    lng: initialValues.lng != null ? String(initialValues.lng) : undefined,
                    manager: initialValues.manager,
                    serialNumber: initialValues.serialNumber,
                    managementIp: initialValues.managementIp,
                });
                // 加载站点已绑定设备
                fetchSiteDevices(initialValues.id);
            } else {
                form.resetFields();
                form.setFieldsValue({ region: 'CN', siteType: 'branch' });
                setSelectedDeviceIds([]);
            }
        }
    }, [open, mode, initialValues, form]);

    /**
     * 提交表单
     */
    const handleSubmit = async (values: Record<string, any>) => {
        setLoading(true);
        try {
            // 处理提交数据
            const submitData = {
                ...values,
                deviceIds: selectedDeviceIds,
            };

            if (mode === 'create') {
                await createSite(submitData);
                messageApi.success('站点创建成功');
            } else {
                await updateSite(initialValues!.id, submitData);
                messageApi.success('站点更新成功');
            }
            onSuccess?.();
            onClose();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || '操作失败';
            messageApi.error(msg);
        } finally {
            setLoading(false);
        }
    };

    /** 设备选择变化 */
    const handleDeviceChange = (value: string[]) => {
        setSelectedDeviceIds(value);
    };

    /** 获取可用设备列表（显示所有在线设备，已绑定的显示站点名） */
    const getAvailableDevices = () => {
        return deviceOptions;
    };

    return (
        <>
            {contextHolder}
            <Modal
                title={mode === 'create' ? '添加站点' : '编辑站点'}
                open={open}
                onCancel={onClose}
                width={640}
                destroyOnHidden
                mask={{ closable: false }}
                footer={null}
            >
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh' }}>
                    {/* 可滚动表单区域 */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        {/* 基础信息 */}
                        <Form.Item
                            label="站点编码"
                            name="name"
                            rules={[
                                { required: true, message: '请输入站点编码' },
                                { min: 2, max: 50, message: '编码长度 2-50 字符' },
                                { pattern: /^[a-zA-Z0-9-]+$/, message: '仅允许字母、数字和中划线' },
                            ]}
                        >
                            <Input placeholder="如 BJ-DC" disabled={mode === 'edit'} />
                        </Form.Item>

                        <Form.Item
                            label="显示名称"
                            name="displayName"
                            rules={[{ required: true, message: '请输入显示名称' }, { max: 100 }]}
                        >
                            <Input placeholder="如 北京总部" />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Form.Item
                                label="区域"
                                name="region"
                                rules={[{ required: true, message: '请选择区域' }]}
                                style={{ flex: 1 }}
                            >
                                <Select options={REGION_OPTIONS} placeholder="选择区域" />
                            </Form.Item>
                            <Form.Item label="站点类型" name="siteType" style={{ flex: 1 }}>
                                <Select options={SITE_TYPE_OPTIONS} placeholder="选择类型" />
                            </Form.Item>
                        </div>

                        <Divider style={{ margin: '16px 0 12px' }}>详细信息</Divider>

                        <Form.Item label="地址" name="address">
                            <Input placeholder="如 北京市朝阳区望京SOHO T1" />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Form.Item
                                label="纬度"
                                name="lat"
                                rules={[{ pattern: /^-?\d+(\.\d+)?$/, message: '请输入有效数字' }]}
                                style={{ flex: 1 }}
                            >
                                <Input placeholder="如 39.9042" />
                            </Form.Item>
                            <Form.Item
                                label="经度"
                                name="lng"
                                rules={[{ pattern: /^-?\d+(\.\d+)?$/, message: '请输入有效数字' }]}
                                style={{ flex: 1 }}
                            >
                                <Input placeholder="如 116.4074" />
                            </Form.Item>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Form.Item label="负责人" name="manager" style={{ flex: 1 }}>
                                <Input placeholder="负责人姓名" />
                            </Form.Item>
                            <Form.Item label="CPE 序列号" name="serialNumber" style={{ flex: 1 }}>
                                <Input placeholder="如 CPE-BJ-001" />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label="管理 IP"
                            name="managementIp"
                            rules={[{ pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效 IP 地址' }]}
                        >
                            <Input placeholder="如 10.0.1.1" />
                        </Form.Item>

                        {/* 设备绑定 */}
                        <Divider style={{ margin: '16px 0 12px' }}>
                            <DesktopOutlined /> 设备绑定
                        </Divider>

                        <Form.Item
                            label="绑定设备"
                            extra="选择要绑定到此站点的在线设备（可多选）"
                        >
                            <Select
                                mode="multiple"
                                value={selectedDeviceIds}
                                onChange={handleDeviceChange}
                                placeholder="选择要绑定的设备"
                                loading={devicesLoading}
                                notFoundContent={devicesLoading ? <Spin size="small" /> : '暂无可用设备'}
                                optionFilterProp="label"
                                options={getAvailableDevices().map((d) => ({
                                    value: d.id,
                                    label: d.site_name
                                        ? `${d.name} (${d.device_type}) - 已绑定: ${d.site_name}`
                                        : `${d.name} (${d.device_type})`,
                                }))}
                                tagRender={(props) => {
                                    const device = deviceOptions.find((d) => d.id === props.value);
                                    return (
                                        <Tag
                                            color="blue"
                                            closable={props.closable}
                                            onClose={props.onClose}
                                            style={{ marginRight: 3, marginBottom: 3 }}
                                        >
                                            {device?.name || props.value}
                                        </Tag>
                                    );
                                }}
                            />
                        </Form.Item>

                        {/* 已选设备预览 */}
                        {selectedDeviceIds.length > 0 && (
                            <div style={{
                                background: 'var(--bg-tertiary, #f5f5f5)',
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginBottom: 16,
                                fontSize: 13,
                            }}>
                                <span style={{ color: 'var(--text-secondary, #666)' }}>
                                    已选择 <strong>{selectedDeviceIds.length}</strong> 个设备
                                </span>
                            </div>
                        )}

                        {/* WAN 接口配置（仅创建模式） */}
                        {mode === 'create' && (
                            <>
                                <Divider style={{ margin: '16px 0 12px' }}>WAN 接口配置（可选）</Divider>
                                <Form.List name="wanInterfaces">
                                    {(fields, { add, remove }) => (
                                        <div>
                                            {fields.map(({ key, name, ...restField }) => (
                                                <div
                                                    key={key}
                                                    style={{
                                                        border: '1px solid var(--border-primary, #d9d9d9)',
                                                        borderRadius: 8,
                                                        padding: 12,
                                                        marginBottom: 12,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span style={{ fontWeight: 500, fontSize: 13 }}>接口 #{name + 1}</span>
                                                        {fields.length > 0 && (
                                                            <MinusCircleOutlined
                                                                onClick={() => remove(name)}
                                                                style={{ color: '#ff4d4f', fontSize: 14, cursor: 'pointer' }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <Form.Item {...restField} name={[name, 'name']} label="接口名称" style={{ flex: 1 }}>
                                                            <Input placeholder="WAN1" />
                                                        </Form.Item>
                                                        <Form.Item {...restField} name={[name, 'interfaceType']} label="类型" initialValue="WAN" style={{ flex: 1 }}>
                                                            <Select options={[
                                                                { label: 'WAN', value: 'WAN' },
                                                                { label: 'MPLS', value: 'MPLS' },
                                                                { label: 'Internet', value: 'Internet' },
                                                            ]} />
                                                        </Form.Item>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <Form.Item {...restField} name={[name, 'ipAddress']} label="IP 地址" style={{ flex: 1 }}>
                                                            <Input placeholder="172.16.10.1" />
                                                        </Form.Item>
                                                        <Form.Item {...restField} name={[name, 'gateway']} label="网关" style={{ flex: 1 }}>
                                                            <Input placeholder="172.16.10.254" />
                                                        </Form.Item>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'bandwidth']}
                                                            label="带宽"
                                                            style={{ flex: 1 }}
                                                            rules={[{ pattern: /^\d+$/, message: '请输入有效数字' }]}
                                                        >
                                                            <Input placeholder="100" suffix="Mbps" />
                                                        </Form.Item>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="dashed"
                                                onClick={() => add({ name: `WAN${fields.length + 1}` })}
                                                block
                                                icon={<PlusOutlined />}
                                                style={{ marginBottom: 16 }}
                                            >
                                                添加 WAN 接口
                                            </Button>
                                        </div>
                                    )}
                                </Form.List>
                            </>
                        )}

                    </Form>
                    </div>
                    {/* 固定在底部的按钮 */}
                    <div style={{ borderTop: '1px solid var(--border-secondary, #f0f0f0)', paddingTop: 12, marginTop: 12, textAlign: 'right', flexShrink: 0 }}>
                        <Space>
                            <Button onClick={onClose}>取消</Button>
                            <Button type="primary" htmlType="submit" loading={loading}
                                onClick={() => form.submit()}
                            >
                                {mode === 'create' ? '创建站点' : '保存修改'}
                            </Button>
                        </Space>
                    </div>
                </div>
            </Modal>
        </>
    );
}
