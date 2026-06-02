/**
 * 数据导出配置弹窗
 */
import { useState } from 'react';
import { Modal, Form, Select, Switch, Button, Space, message, Radio } from 'antd';
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';
import { exportSites } from '../../services/siteApi';

const { Option } = Select;

/**
 * 导出格式选项
 */
const FORMAT_OPTIONS = [
    { label: 'CSV (表格)', value: 'csv', icon: <FileExcelOutlined /> },
    { label: 'JSON (数据)', value: 'json', icon: <FileTextOutlined /> },
];

/**
 * 区域选项
 */
const REGION_OPTIONS = [
    { label: '🇨🇳 中国', value: 'CN' },
    { label: '🇸🇬 新加坡', value: 'SG' },
    { label: '🇺🇸 美国', value: 'US' },
    { label: '🇪🇺 欧洲', value: 'EU' },
];

/**
 * 状态选项
 */
const STATUS_OPTIONS = [
    { label: '✅ 在线', value: 'online' },
    { label: '❌ 离线', value: 'offline' },
    { label: '⚠️ 告警', value: 'warning' },
];

/**
 * 链路类型选项
 */
const LINK_TYPE_OPTIONS = [
    { label: '🔵 MPLS', value: 'MPLS' },
    { label: '🟢 Internet', value: 'Internet' },
    { label: '🟣 5G', value: '5G' },
];

export default function ExportModal({ open, currentFilter, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    /**
     * 处理导出
     */
    const handleExport = async (values) => {
        setLoading(true);
        try {
            const params = {
                ...currentFilter,
                ...values,
                region: values.region && values.region !== 'all' ? values.region : undefined,
                status: values.status && values.status !== 'all' ? values.status : undefined,
                linkType: values.linkType && values.linkType !== 'all' ? values.linkType : undefined,
                search: currentFilter?.search || undefined,
            };

            const response = await exportSites(params);

            // 处理 CSV 下载
            if (params.format === 'csv') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // 从响应头获取文件名
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `sites_export_${Date.now()}.csv`;
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }

                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                message.success('导出成功');
            } else {
                // JSON 导出，直接下载
                const blob = new Blob([JSON.stringify(response, null, 2)], {
                    type: 'application/json',
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sites_export_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                message.success('导出成功');
            }

            onClose();
        } catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 重置表单
     */
    const handleReset = () => {
        form.resetFields();
    };

    return (
        <Modal
            title={
                <Space>
                    <DownloadOutlined />
                    导出站点数据
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={500}
            destroyOnHidden
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleExport}
                initialValues={{
                    format: 'csv',
                    includeAlerts: false,
                    includeLinks: true,
                    region: currentFilter?.region && currentFilter?.region !== 'all' ? currentFilter.region : undefined,
                    status: currentFilter?.status && currentFilter?.status !== 'all' ? currentFilter.status : undefined,
                    linkType: currentFilter?.linkType && currentFilter?.linkType !== 'all' ? currentFilter.linkType : undefined,
                }}
            >
                {/* 导出格式 */}
                <Form.Item
                    label="导出格式"
                    name="format"
                >
                    <Radio.Group>
                        <Space>
                            {FORMAT_OPTIONS.map((option) => (
                                <Radio key={option.value} value={option.value}>
                                    <Space>
                                        {option.icon}
                                        {option.label}
                                    </Space>
                                </Radio>
                            ))}
                        </Space>
                    </Radio.Group>
                </Form.Item>

                {/* 筛选条件 */}
                <Form.Item label="筛选条件">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Form.Item name="region" noStyle>
                            <Select placeholder="区域筛选" allowClear style={{ width: '100%' }}>
                                {REGION_OPTIONS.map((option) => (
                                    <Option key={option.value} value={option.value}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="status" noStyle>
                            <Select placeholder="状态筛选" allowClear style={{ width: '100%' }}>
                                {STATUS_OPTIONS.map((option) => (
                                    <Option key={option.value} value={option.value}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="linkType" noStyle>
                            <Select placeholder="链路类型筛选" allowClear style={{ width: '100%' }}>
                                {LINK_TYPE_OPTIONS.map((option) => (
                                    <Option key={option.value} value={option.value}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Space>
                </Form.Item>

                {/* 包含内容 */}
                <Form.Item label="包含内容">
                    <Space direction="vertical">
                        <Form.Item name="includeLinks" valuePropName="checked" noStyle>
                            <Switch /> 包含链路信息
                        </Form.Item>
                        <Form.Item name="includeAlerts" valuePropName="checked" noStyle>
                            <Switch /> 包含告警信息
                        </Form.Item>
                    </Space>
                </Form.Item>

                {/* 操作按钮 */}
                <Form.Item style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={handleReset}>
                            重置
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<DownloadOutlined />}>
                            导出
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
}
