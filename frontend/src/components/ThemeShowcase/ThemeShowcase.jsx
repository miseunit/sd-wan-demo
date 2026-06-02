/**
 * 主题系统展示组件
 * 展示所有主题变量和组件在不同主题下的效果
 */

import React, { useState } from 'react';
import { Button, Input, Table, Modal, Badge, Card, Progress, Tag, Switch } from 'antd';
import { ThemeToggleButton, ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import './ThemeShowcase.css';

/**
 * 模拟数据
 */
const mockData = [
    { key: '1', name: '北京总部', status: 'online', users: 1234, bandwidth: '1Gbps' },
    { key: '2', name: '上海分公司', status: 'online', users: 567, bandwidth: '500Mbps' },
    { key: '3', name: '广州分公司', status: 'warning', users: 890, bandwidth: '1Gbps' },
    { key: '4', name: '深圳分公司', status: 'offline', users: 432, bandwidth: '200Mbps' },
];

const columns = [
    { title: '站点名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '在线用户', dataIndex: 'users', key: 'users' },
    { title: '带宽', dataIndex: 'bandwidth', key: 'bandwidth' },
];

/**
 * 主题展示组件
 */
export default function ThemeShowcase() {
    const [modalVisible, setModalVisible] = useState(false);
    const [switchValue, setSwitchValue] = useState(true);

    const getStatusTag = (status) => {
        const statusMap = {
            online: { color: 'success', text: '在线' },
            warning: { color: 'warning', text: '警告' },
            offline: { color: 'error', text: '离线' },
        };
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
    };

    return (
        <div className="theme-showcase">
            {/* 头部 */}
            <header className="theme-showcase__header">
                <h1 className="theme-showcase__title">SD-WAN 主题系统展示</h1>
                <p className="theme-showcase__subtitle">深色/浅色主题专业配色方案</p>
                <div className="theme-showcase__controls">
                    <ThemeSwitcher showLabels={true} size="default" />
                </div>
            </header>

            {/* 颜色系统展示 */}
            <section className="theme-showcase__section">
                <h2 className="theme-showcase__section-title">颜色系统</h2>
                <div className="color-grid">
                    {/* 文本颜色 */}
                    <div className="color-card">
                        <h3 className="color-card__title">文本颜色</h3>
                        <div className="color-swatch-group">
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--text-primary)' }} />
                                <span className="color-swatch__name">主要文本</span>
                                <span className="color-swatch__value">--text-primary</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--text-secondary)' }} />
                                <span className="color-swatch__name">次要文本</span>
                                <span className="color-swatch__value">--text-secondary</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--text-muted)' }} />
                                <span className="color-swatch__name">弱化文本</span>
                                <span className="color-swatch__value">--text-muted</span>
                            </div>
                        </div>
                    </div>

                    {/* 主题色 */}
                    <div className="color-card">
                        <h3 className="color-card__title">主题色</h3>
                        <div className="color-swatch-group">
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 12px var(--glow-cyan)' }} />
                                <span className="color-swatch__name">主色调</span>
                                <span className="color-swatch__value">--accent-cyan</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--accent-purple)', boxShadow: '0 0 12px var(--glow-purple)' }} />
                                <span className="color-swatch__name">辅助色</span>
                                <span className="color-swatch__value">--accent-purple</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--accent-green)', boxShadow: '0 0 12px var(--glow-green)' }} />
                                <span className="color-swatch__name">成功色</span>
                                <span className="color-swatch__value">--accent-green</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--accent-red)', boxShadow: '0 0 12px var(--glow-red)' }} />
                                <span className="color-swatch__name">错误色</span>
                                <span className="color-swatch__value">--accent-red</span>
                            </div>
                        </div>
                    </div>

                    {/* 背景色 */}
                    <div className="color-card">
                        <h3 className="color-card__title">背景色</h3>
                        <div className="color-swatch-group">
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--bg-primary)' }} />
                                <span className="color-swatch__name">主背景</span>
                                <span className="color-swatch__value">--bg-primary</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--bg-secondary)' }} />
                                <span className="color-swatch__name">次级背景</span>
                                <span className="color-swatch__value">--bg-secondary</span>
                            </div>
                            <div className="color-swatch">
                                <span className="color-swatch__preview" style={{ background: 'var(--bg-card)' }} />
                                <span className="color-swatch__name">卡片背景</span>
                                <span className="color-swatch__value">--bg-card</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ant Design 组件展示 */}
            <section className="theme-showcase__section">
                <h2 className="theme-showcase__section-title">Ant Design 组件</h2>
                <div className="antd-showcase">
                    {/* 按钮组 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">按钮</h3>
                        <div className="button-group">
                            <Button type="primary">主要按钮</Button>
                            <Button>默认按钮</Button>
                            <Button type="dashed">虚线按钮</Button>
                            <Button type="link">链接按钮</Button>
                        </div>
                    </div>

                    {/* 输入框 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">输入框</h3>
                        <Input placeholder="请输入内容" style={{ maxWidth: 300 }} />
                    </div>

                    {/* 标签和徽章 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">标签和徽章</h3>
                        <div className="tag-badge-group">
                            <Tag color="success">成功</Tag>
                            <Tag color="warning">警告</Tag>
                            <Tag color="error">错误</Tag>
                            <Tag color="processing">处理中</Tag>
                            <Tag color="default">默认</Tag>
                            <Badge count={5} />
                            <Badge count={0} showZero />
                        </div>
                    </div>

                    {/* 开关 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">开关</h3>
                        <Switch checked={switchValue} onChange={setSwitchValue} />
                    </div>

                    {/* 进度条 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">进度条</h3>
                        <Progress percent={75} />
                        <Progress percent={90} status="success" />
                        <Progress percent={45} status="warning" />
                        <Progress percent={25} status="exception" />
                    </div>

                    {/* 卡片 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">卡片</h3>
                        <Card title="站点信息" style={{ width: 300 }}>
                            <p>站点名称：北京总部</p>
                            <p>状态：在线</p>
                            <p>用户数：1,234</p>
                        </Card>
                    </div>

                    {/* 模态框触发 */}
                    <div className="antd-showcase__group">
                        <h3 className="antd-showcase__group-title">对话框</h3>
                        <Button onClick={() => setModalVisible(true)}>
                            打开对话框
                        </Button>
                    </div>
                </div>
            </section>

            {/* 数据表格 */}
            <section className="theme-showcase__section">
                <h2 className="theme-showcase__section-title">数据表格</h2>
                <Table
                    dataSource={mockData}
                    columns={columns.map(col => ({
                        ...col,
                        render: (text, record) => {
                            if (col.key === 'status') {
                                return getStatusTag(text);
                            }
                            return text;
                        }
                    }))}
                />
            </section>

            {/* Dashboard 风格展示 */}
            <section className="theme-showcase__section">
                <h2 className="theme-showcase__section-title">Dashboard 风格组件</h2>
                <div className="dashboard-showcase">
                    <div className="dashboard-card">
                        <div className="dashboard-card__header">
                            <h3 className="dashboard-card__title">系统健康度</h3>
                            <Badge status="processing" text="实时" />
                        </div>
                        <div className="dashboard-card__content">
                            <div className="health-score-large">
                                <span className="health-score-large__value">98.5</span>
                                <span className="health-score-large__label">HEALTH SCORE</span>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-card__header">
                            <h3 className="dashboard-card__title">流量统计</h3>
                            <Badge status="success" text="正常" />
                        </div>
                        <div className="dashboard-card__content">
                            <div className="stat-group">
                                <div className="stat-item">
                                    <span className="stat-item__label">总流量</span>
                                    <span className="stat-item__value">12.5 GB</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-item__label">峰值</span>
                                    <span className="stat-item__value">1.2 Gbps</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-card__header">
                            <h3 className="dashboard-card__title">告警信息</h3>
                            <Badge count={3} />
                        </div>
                        <div className="dashboard-card__content">
                            <div className="alert-list-compact">
                                <div className="alert-item alert-item--critical">
                                    <span className="alert-item__level">严重</span>
                                    <span className="alert-item__text">北京总部连接超时</span>
                                </div>
                                <div className="alert-item alert-item--major">
                                    <span className="alert-item__level">主要</span>
                                    <span className="alert-item__text">上海分公司带宽不足</span>
                                </div>
                                <div className="alert-item alert-item--minor">
                                    <span className="alert-item__level">次要</span>
                                    <span className="alert-item__text">广州分公司延迟较高</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 主题切换按钮展示 */}
            <section className="theme-showcase__section">
                <h2 className="theme-showcase__section-title">主题切换组件</h2>
                <div className="theme-switcher-showcase">
                    <div className="theme-switcher-showcase__item">
                        <h4>图标按钮</h4>
                        <ThemeToggleButton />
                    </div>
                    <div className="theme-switcher-showcase__item">
                        <h4>带标签</h4>
                        <ThemeToggleButton iconOnly={false} />
                    </div>
                    <div className="theme-switcher-showcase__item">
                        <h4>完整切换器</h4>
                        <ThemeSwitcher showLabels={true} />
                    </div>
                </div>
            </section>

            {/* 模态框 */}
            <Modal
                title="主题演示对话框"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalVisible(false)}>
                        取消
                    </Button>,
                    <Button key="ok" type="primary" onClick={() => setModalVisible(false)}>
                        确定
                    </Button>,
                ]}
            >
                <p>这是一个演示对话框，展示了在当前主题下的模态框样式。</p>
                <p>深色/浅色主题会自动影响对话框的背景、文字和边框颜色。</p>
            </Modal>
        </div>
    );
}
