/**
 * Traceroute 路径追踪组件
 */
import { useState } from 'react';
import { Card, Button, InputNumber, Table, Tag, Space, Divider, Alert, message } from 'antd';
import { NodeIndexOutlined, ApiOutlined } from '@ant-design/icons';
import type { Device } from '../types';
import { tracerouteDevice } from '../../../services/diagnosticsApi';
import '../DeviceManagement.css';

/* ============================================================
 *  类型定义
 * ============================================================ */

interface TracerouteTestProps {
    device: Device;
}

interface TracerouteHop {
    hop_number: number;
    ip: string | null;
    hostname: string | null;
    rtt_list: number[];
    is_timeout: boolean;
    status: string;
}

interface TracerouteResult {
    id: number;
    device_id: string;
    destination: string;
    timestamp: string;
    reached: boolean;
    total_hops: number;
    hops: TracerouteHop[];
    max_hops: number;
    timeout: number;
    has_timeout: boolean;
    timeout_hop: number | null;
}

/* ============================================================
 *  组件
 * ============================================================ */

export default function TracerouteTest({ device }: TracerouteTestProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TracerouteResult | null>(null);
    const [maxHops, setMaxHops] = useState(30);

    // 获取设备IP
    const deviceIp = device.ip_address || device.interfaces?.[0]?.ip_address || '';

    // 执行 Traceroute
    const handleTraceroute = async () => {
        if (!deviceIp) {
            message.error('设备无可用IP地址');
            return;
        }

        setLoading(true);
        try {
            const data = await tracerouteDevice(device.id, {
                destination: deviceIp,
                max_hops: maxHops,
                timeout: 2.0,
            });
            setResult(data);
        } catch (error: any) {
            message.error(`Traceroute 失败: ${error.message || '未知错误'}`);
            console.error('Traceroute error:', error);
        }
        setLoading(false);
    };

    // 表格列定义
    const columns = [
        {
            title: '跳数',
            dataIndex: 'hop_number',
            key: 'hop_number',
            width: 80,
            align: 'center' as const,
        },
        {
            title: 'IP 地址',
            dataIndex: 'ip',
            key: 'ip',
            width: 150,
            render: (ip: string | null) => ip ? <Tag color="blue">{ip}</Tag> : <Tag>-</Tag>,
        },
        {
            title: '主机名',
            dataIndex: 'hostname',
            key: 'hostname',
            width: 150,
            render: (hostname: string | null) => hostname || '-',
        },
        {
            title: '延迟',
            dataIndex: 'rtt_list',
            key: 'rtt_list',
            width: 120,
            render: (rttList: number[]) => {
                if (!rttList || rttList.length === 0) return '*';
                const avgRtt = rttList.reduce((a, b) => a + b, 0) / rttList.length;
                return `${avgRtt.toFixed(1)} ms`;
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string, record: TracerouteHop) => {
                if (record.is_timeout) {
                    return <Tag color="warning">⚠ 超时</Tag>;
                }
                if (status === 'success') {
                    return <Tag color="success">✓ 正常</Tag>;
                }
                if (status === 'filtered') {
                    return <Tag color="error">✕ 阻断</Tag>;
                }
                return <Tag>{status}</Tag>;
            },
        },
    ];

    // 路径可视化数据
    const getPathVisualization = () => {
        if (!result || !result.hops || result.hops.length === 0) return null;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '16px',
                background: '#fafafa',
                borderRadius: '8px',
            }}>
                <Tag color="blue">起点</Tag>
                {result.hops.map((hop, index) => (
                    <div key={hop.hop_number} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#999' }}>──</span>
                        <span style={{ color: '#999' }}>{hop.avg_rtt ? `${hop.avg_rtt.toFixed(1)}ms` : '*'}}</span>
                        <span style={{ color: '#999' }}>──</span>
                        {hop.is_timeout ? (
                            <Tag color="warning">⚠</Tag>
                        ) : (
                            <Tag
                                color={hop.hop_number === result.total_hops && result.reached ? 'success' : 'default'}
                                icon={<ApiOutlined />}
                            >
                                {hop.ip || '*'}
                            </Tag>
                        )}
                    </div>
                ))}
                <span style={{ color: '#999' }}>──</span>
                {result.reached ? (
                    <Tag color="success" icon={<NodeIndexOutlined />}>目标</Tag>
                ) : (
                    <Tag color="error">未到达</Tag>
                )}
            </div>
        );
    };

    // 分析异常
    const getIssues = () => {
        if (!result || !result.hops) return [];

        const issues: { type: string; hop: number; message: string; severity: 'warning' | 'error' }[] = [];

        result.hops.forEach((hop) => {
            // 检查超时
            if (hop.is_timeout) {
                issues.push({
                    type: 'timeout',
                    hop: hop.hop_number,
                    message: `第 ${hop.hop_number} 跳无响应，可能是防火墙阻断`,
                    severity: 'warning',
                });
            }

            // 检查高延迟
            if (hop.rtt_list && hop.rtt_list.length > 0) {
                const avgRtt = hop.rtt_list.reduce((a, b) => a + b, 0) / hop.rtt_list.length;
                if (avgRtt > 100) {
                    issues.push({
                        type: 'high_latency',
                        hop: hop.hop_number,
                        message: `第 ${hop.hop_number} 跳延迟较高: ${avgRtt.toFixed(1)}ms`,
                        severity: 'warning',
                    });
                }
            }
        });

        // 检查是否到达
        if (!result.reached) {
            issues.push({
                type: 'not_reached',
                hop: result.total_hops || 0,
                message: '未能到达目标设备',
                severity: 'error',
            });
        }

        return issues;
    };

    const issues = getIssues();

    return (
        <Card className="traceroute-test-card">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* 控制区 */}
                <div className="traceroute-controls">
                    <Space wrap>
                        <span>目标设备: </span>
                        <Tag color="blue">{device.name}</Tag>
                        <span>IP: </span>
                        <Tag>{deviceIp || '无'}</Tag>
                    </Space>

                    <Divider type="vertical" />

                    <Space>
                        <span>最大跳数:</span>
                        <InputNumber
                            min={5}
                            max={64}
                            value={maxHops}
                            onChange={(val) => setMaxHops(val || 30)}
                            disabled={loading}
                        />
                    </Space>

                    <Divider type="vertical" />

                    <Button
                        type="primary"
                        icon={<NodeIndexOutlined />}
                        loading={loading}
                        onClick={handleTraceroute}
                        disabled={!deviceIp}
                    >
                        开始追踪
                    </Button>
                </div>

                {/* 结果展示 */}
                {result && (
                    <>
                        {/* 概要信息 */}
                        <Space wrap>
                            <Tag
                                color={result.reached ? 'success' : 'error'}
                                icon={result.reached ? <NodeIndexOutlined /> : <ApiOutlined />}
                                style={{ fontSize: 14, padding: '6px 12px' }}
                            >
                                {result.reached ? '✓ 到达目标' : '✕ 未到达'}
                            </Tag>
                            <span>总跳数: <strong>{result.total_hops}</strong></span>
                            <span>目标: <strong>{result.destination}</strong></span>
                            <span style={{ color: '#999' }}>
                                测试时间: {new Date(result.timestamp).toLocaleString('zh-CN')}
                            </span>
                        </Space>

                        {/* 路径可视化 */}
                        {getPathVisualization()}

                        {/* 异常警告 */}
                        {issues.length > 0 && (
                            <>
                                {issues.map((issue, index) => (
                                    <Alert
                                        key={index}
                                        type={issue.severity}
                                        message={issue.message}
                                        showIcon
                                        closable
                                        style={{ marginBottom: 8 }}
                                    />
                                ))}
                            </>
                        )}

                        {/* 详细跳数表格 */}
                        <Table
                            columns={columns}
                            dataSource={result.hops}
                            pagination={false}
                            size="small"
                            bordered
                            rowKey="hop_number"
                        />
                    </>
                )}

                {/* 提示信息 */}
                {!result && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        color: '#999',
                    }}>
                        {deviceIp ? '点击"开始追踪"执行 Traceroute 测试' : '设备无可用IP地址，无法执行测试'}
                        <div style={{ marginTop: 16, fontSize: 12, color: '#bbb' }}>
                            注意: Traceroute 可能需要一定时间，请耐心等待
                        </div>
                    </div>
                )}
            </Space>
        </Card>
    );
}
