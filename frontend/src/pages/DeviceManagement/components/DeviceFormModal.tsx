/**
 * 设备表单弹窗 - 新增/编辑设备
 * 支持绑定站点
 */
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Divider, message } from 'antd';
import type { Device, DeviceType } from '../types';
import { createDevice, updateDevice, type DeviceCreateRequest, type DeviceUpdateRequest } from '../api';
import { getSites } from '../../../services/siteApi';

/** 组件属性 */
interface DeviceFormModalProps {
    visible: boolean;
    device?: Device | null; // 编辑时传入设备信息
    onClose: () => void;
    onSuccess: () => void;
}

/** 站点选项 */
interface SiteOption {
    label: string;
    value: string;
}

/**
 * 设备表单弹窗组件
 */
export default function DeviceFormModal({ visible, device, onClose, onSuccess }: DeviceFormModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
    const [siteLoading, setSiteLoading] = useState(false);

    const isEdit = !!device;

    /** 加载站点列表 */
    useEffect(() => {
        if (visible) {
            loadSites();
        }
    }, [visible]);

    /** 设置表单初始值 */
    useEffect(() => {
        if (visible) {
            if (device) {
                form.setFieldsValue({
                    name: device.name,
                    device_type: device.device_type,
                    site_id: device.site_id,
                    serial_number: device.serial_number,
                    management_ip: device.management_ip,
                    mac_address: device.mac_address,
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, device, form]);

    /** 加载站点选项 */
    const loadSites = async () => {
        setSiteLoading(true);
        try {
            const res = await getSites({ page: 1, pageSize: 100 });
            const items = res.items || res || [];
            const options = items.map((site: any) => ({
                label: `${site.displayName || site.display_name} (${site.name})`,
                value: site.id,
            }));
            setSiteOptions(options);
        } catch (err) {
            console.error('加载站点列表失败', err);
        } finally {
            setSiteLoading(false);
        }
    };

    /** 提交表单 */
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (isEdit && device) {
                // 编辑设备
                const updateData: DeviceUpdateRequest = {
                    name: values.name,
                    device_type: values.device_type,
                    site_id: values.site_id,
                };
                await updateDevice(device.id, updateData);
                message.success('设备更新成功');
            } else {
                // 新增设备
                const createData: DeviceCreateRequest = {
                    name: values.name,
                    device_type: values.device_type,
                    site_id: values.site_id,
                    serial_number: values.serial_number || undefined,
                    management_ip: values.management_ip || undefined,
                    mac_address: values.mac_address || undefined,
                };
                await createDevice(createData);
                message.success('设备创建成功');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            if (err.errorFields) {
                // 表单校验失败
                return;
            }
            message.error(err.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={isEdit ? '编辑设备' : '新增设备'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            confirmLoading={loading}
            destroyOnClose
            width={480}
        >
            <Form
                form={form}
                layout="vertical"
                autoComplete="off"
            >
                <Form.Item
                    name="name"
                    label="设备名称"
                    rules={[
                        { required: true, message: '请输入设备名称' },
                        { max: 50, message: '设备名称不能超过50个字符' },
                    ]}
                >
                    <Input placeholder="请输入设备名称" />
                </Form.Item>

                <Form.Item
                    name="device_type"
                    label="设备类型"
                    rules={[{ required: true, message: '请选择设备类型' }]}
                >
                    <Select
                        placeholder="请选择设备类型"
                        options={[
                            { label: '🖥️ Edge', value: 'Edge' },
                            { label: '🌐 Gateway', value: 'Gateway' },
                            { label: '📡 CPE', value: 'CPE' },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    name="site_id"
                    label="绑定站点"
                    rules={[{ required: true, message: '请选择绑定站点' }]}
                >
                    <Select
                        placeholder="请选择站点"
                        showSearch
                        loading={siteLoading}
                        options={siteOptions}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>

                <Divider plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
                    设备绑定（选填）
                </Divider>

                <Form.Item
                    name="serial_number"
                    label="设备序列号"
                    extra="填写后设备将自动标记为已绑定状态"
                >
                    <Input placeholder="请输入线下设备序列号" />
                </Form.Item>

                <Form.Item
                    name="management_ip"
                    label="管理IP"
                >
                    <Input placeholder="如 192.168.1.1" />
                </Form.Item>

                <Form.Item
                    name="mac_address"
                    label="MAC地址"
                >
                    <Input placeholder="如 AA:BB:CC:DD:EE:FF" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
