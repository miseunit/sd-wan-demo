/**
 * 网络诊断面板组件
 * 集成 Ping、Traceroute 等诊断工具
 */
import { Tabs } from 'antd';
import { WifiOutlined, NodeIndexOutlined, RiseOutlined } from '@ant-design/icons';
import type { Device } from '../types';
import PingTest from './PingTest';
import TracerouteTest from './TracerouteTest';

/* ============================================================
 *  类型定义
 * ============================================================ */

interface DiagnosticsPanelProps {
    device: Device;
}

/* ============================================================
 *  组件
 * ============================================================ */

export default function DiagnosticsPanel({ device }: DiagnosticsPanelProps) {
    const tabItems = [
        {
            key: 'ping',
            label: (
                <span>
                    <WifiOutlined />
                    Ping 连通性
                </span>
            ),
            children: <PingTest device={device} />,
        },
        {
            key: 'traceroute',
            label: (
                <span>
                    <NodeIndexOutlined />
                    Traceroute 路径追踪
                </span>
            ),
            children: <TracerouteTest device={device} />,
        },
    ];

    return (
        <div className="diagnostics-panel">
            <Tabs
                defaultActiveKey="ping"
                items={tabItems}
                size="large"
                tabBarStyle={{
                    marginBottom: 24,
                    paddingLeft: 16,
                    paddingRight: 16,
                }}
            />
        </div>
    );
}
