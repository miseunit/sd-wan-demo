/**
 * Ping 连通性测试组件
 */
import { useState, useEffect } from 'react';
import { Card, Button, Radio, InputNumber, Statistic, Table, Tag, Space, Divider, message } from 'antd';
import { PlayCircleOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Device } from '../types';
import { pingDevice } from '../../../services/diagnosticsApi';
import '../DeviceManagement.css';

/* ============================================================
 *  类型定义
 * ============================================================ */

interface PingTestProps {
    device: Device;
}

interface PingResult {
    id: number;
    device_id: string;
    target: string;
    timestamp: string;
    is_alive: boolean;
    packets_sent: number;
    packets_received: number;
    packet_loss: number;
    min_rtt: number | null;
    max_rtt: number | null;
    avg_rtt: number | null;
    jitter: number | null;
}

/* ============================================================
 *  组件
 * ============================================================ */

export default function PingTest({ device }: PingTestProps) {
    const [mode, setMode] = useState<'single' | 'continuous'>('single');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PingResult | null>(null);
    const [continuousActive, setContinuousActive] = useState(false);
    const [interval, setInterval] = useState(2); // 持续Ping间隔（秒）

    // 获取设备IP
    const deviceIp = device.ip_address || device.interfaces?.[0]?.ip_address || '';

    // 执行 Ping 测试
    const handlePing = async () => {
        if (!deviceIp) {
            message.error('设备无可用IP地址');
            return;
        }

        setLoading(true);
        try {
            const data = await pingDevice(device.id, {
                target: deviceIp,
                count: mode === 'single' ? 5 : 1,
                interval: 1.0,
                timeout: 2.0,
            });
            setResult(data);
        } catch (error: any) {
            message.error(`Ping 测试失败: ${error.message || '未知错误'}`);
            console.error('Ping error:', error);
        }
        setLoading(false);
    };

    // 持续 Ping
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (mode === 'continuous' && continuousActive) {
            // 立即执行一次
            handlePing();

            // 设置定时器
            timer = setInterval(() => {
                handlePing();
            }, interval * 1000);
        }

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [mode, continuousActive, interval, device.id]);

    // 停止持续 Ping
    const handleStopContinuous = () => {
        setContinuousActive(false);
        setMode('single');
        setResult(null);
    };

    // 判断状态颜色
    const getStatusColor = () => {
        if (!result) return 'default';
        if (!result.is_alive) return 'error';
        if (result.packet_loss > 5) return 'warning';
        return 'success';
    };

    // 判断状态文本
    const getStatusText = () => {
        if (!result) return '未测试';
        if (!result.is_alive) return '✕ 离线';
        if (result.packet_loss > 5) return '⚠ 丢包';
        return '✓ 在线';
    };

    // 判断延迟状态
    const getLatencyStatus = (latency: number | null) => {
        if (!latency) return { color: 'default', text: '-' };
        if (latency < 30) return { color: 'success', text: '正常' };
        if (latency < 100) return { color: 'warning', text: '偏高' };
        return { color: 'error', text: '严重' };
    };

    // 表格列定义
    const columns = [
        {
            title: '指标',
            dataIndex: 'label',
            key: 'label',
            width: 120,
        },
        {
            title: '值',
            dataIndex: 'value',
            key: 'value',
        },
    ];

    // 表格数据
    const tableData = result ? [
        {
            key: 'packets',
            label: '数据包',
            value: `${result.packets_received} / ${result.packets_sent}`,
        },
        {
            key: 'loss',
            label: '丢包率',
            value: `${result.packet_loss.toFixed(2)}%`,
        },
        {
            key: 'min',
            label: '最小延迟',
            value: result.min_rtt ? `${result.min_rtt.toFixed(2)} ms` : '-',
        },
        {
            key: 'max',
            label: '最大延迟',
            value: result.max_rtt ? `${result.max_rtt.toFixed(2)} ms` : '-',
        },
        {
            key: 'avg',
            label: '平均延迟',
            value: result.avg_rtt ? (
                <Space>
                    <span>{result.avg_rtt.toFixed(2)} ms</span>
                    <Tag color={getLatencyStatus(result.avg_rtt).color}>
                        {getLatencyStatus(result.avg_rtt).text}
                    </Tag>
                </Space>
            ) : '-',
        },
        {
            key: 'jitter',
            label: '抖动',
            value: result.jitter ? `${result.jitter.toFixed(2)} ms` : '-',
        },
    ] : [];

    return (
        <Card className="ping-test-card">
            {/* 控制区 */}
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="ping-controls">
                    <Space wrap>
                        <span>目标设备: </span>
                        <Tag color="blue">{device.name}</Tag>
                        <span>IP: </span>
                        <Tag>{deviceIp || '无'}</Tag>
                    </Space>

                    <Divider type="vertical" />

                    <Radio.Group
                        value={mode}
                        onChange={(e) => {
                            setMode(e.target.value);
                            if (e.target.value === 'single') {
                                setContinuousActive(false);
                            }
                        }}
                        disabled={loading}
                    >
                        <Radio value="single">单次测试</Radio>
                        <Radio value="continuous">持续测试</Radio>
                    </Radio.Group>

                    {mode === 'continuous' && (
                        <Space>
                            <span>间隔:</span>
                            <InputNumber
                                min={1}
                                max={60}
                                value={interval}
                                onChange={(val) => setInterval(val || 2)}
                                disabled={continuousActive}
                                addonAfter="秒"
                            />
                        </Space>
                    )}

                    <Divider type="vertical" />

                    {mode === 'single' ? (
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            loading={loading}
                            onClick={handlePing}
                            disabled={!deviceIp}
                        >
                            开始测试
                        </Button>
                    ) : (
                        <Space>
                            {!continuousActive ? (
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    loading={loading}
                                    onClick={() => setContinuousActive(true)}
                                    disabled={!deviceIp}
                                >
                                    开始持续测试
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        onClick={handleStopContinuous}
                                    >
                                        停止测试
                                    </Button>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={handlePing}
                                        loading={loading}
                                    >
                                        立即测试
                                    </Button>
                                </>
                            )}
                        </Space>
                    )}
                </div>

                {/* 结果展示 */}
                {result && (
                    <div className="ping-result">
                        {/* 状态横幅 */}
                        <div className="status-banner">
                            <Tag color={getStatusColor()} style={{ fontSize: 16, padding: '8px 16px' }}>
                                {getStatusText()}
                            </Tag>
                            <span style={{ marginLeft: 16, color: '#666' }}>
                                测试时间: {new Date(result.timestamp).toLocaleString('zh-CN')}
                            </span>
                        </div>

                        {/* 统计指标 */}
                        <div className="statistics-row">
                            <Statistic
                                title="丢包率"
                                value={result.packet_loss}
                                suffix="%"
                                precision={2}
                                valueStyle={{
                                    color: result.packet_loss > 5 ? '#ff4d4f' : '#52c41a',
                                }}
                            />
                            <Statistic
                                title="平均延迟"
                                value={result.avg_rtt}
                                suffix="ms"
                                precision={2}
                                valueStyle={{
                                    color: getLatencyStatus(result.avg_rtt).color === 'error' ? '#ff4d4f' :
                                           getLatencyStatus(result.avg_rtt).color === 'warning' ? '#faad14' : '#52c41a',
                                }}
                            />
                            <Statistic
                                title="抖动"
                                value={result.jitter}
                                suffix="ms"
                                precision={2}
                            />
                        </div>

                        {/* 详细数据表格 */}
                        <Table
                            columns={columns}
                            dataSource={tableData}
                            pagination={false}
                            size="small"
                            bordered
                        />
                    </div>
                )}

                {/* 提示信息 */}
                {!result && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        color: '#999',
                    }}>
                        {deviceIp ? '点击"开始测试"执行 Ping 测试' : '设备无可用IP地址，无法执行测试'}
                    </div>
                )}
            </Space>
        </Card>
    );
}
