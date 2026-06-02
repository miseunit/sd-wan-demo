/**
 * SD-WAN 首页 — NOC 风格总览
 * 展示全网健康度、关键指标、快速操作入口、最近告警
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MonitorOutlined,
    CloudServerOutlined,
    ApartmentOutlined,
    AlertOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { fetchDashboardData } from '../../services/dashboardApi';
import type { DashboardData, AlertData } from '../Dashboard/mockData';
import './index.css';

/* ============================================================
 *  工具函数
 * ============================================================ */

/** 根据健康度返回颜色 */
function getHealthColor(score: number): string {
    if (score >= 98) return 'var(--accent-green)';
    if (score >= 90) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
}

/** 根据健康度返回状态文案 */
function getHealthStatus(score: number): string {
    if (score >= 98) return '运行良好';
    if (score >= 90) return '需要关注';
    return '异常';
}

/** 告警严重度中文映射 */
const SEVERITY_LABELS: Record<string, string> = {
    critical: '严重',
    major: '重要',
    minor: '次要',
};

/** 默认空数据 */
const EMPTY_DATA: DashboardData = {
    healthScore: 0,
    sites: [],
    links: [],
    applications: [],
    alerts: [],
    ispBandwidth: [],
    stats: { totalSites: 0, onlineSites: 0, offlineSites: 0, totalLinks: 0, criticalAlerts: 0 },
};

/* ============================================================
 *  主组件
 * ============================================================ */

export default function Home() {
    const navigate = useNavigate();
    const [clock, setClock] = useState('');
    const [data, setData] = useState<DashboardData>(EMPTY_DATA);
    const timerRef = useRef<ReturnType<typeof setInterval>>(null);

    // 定时获取 Dashboard 数据（每 5 秒）
    useEffect(() => {
        const load = async () => {
            try {
                const result = await fetchDashboardData();
                setData(result);
            } catch (err) {
                console.error('获取 Dashboard 数据失败:', err);
            }
        };

        load();
        timerRef.current = setInterval(load, 5000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // 实时时钟
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock(now.toLocaleTimeString('zh-CN', { hour12: false }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // 汇总统计
    const stats = useMemo(() => {
        const { totalSites, onlineSites, totalLinks, criticalAlerts } = data.stats;
        return {
            totalSites,
            onlineSites,
            offlineSites: totalSites - onlineSites,
            warningSites: data.sites.filter((s) => s.status === 'offline').length,
            totalLinks,
            criticalAlerts,
        };
    }, [data.stats, data.sites]);

    // 健康度 SVG 环参数
    const circumference = 2 * Math.PI * 28;
    const healthOffset = circumference - (data.healthScore / 100) * circumference;
    const healthColor = getHealthColor(data.healthScore);

    /** 跳转到告警页面（暂跳 Dashboard） */
    const handleAlertClick = (_alert: AlertData) => {
        navigate('/dashboard');
    };

    return (
        <div className="home-page">
            {/* ===== 欢迎横幅 ===== */}
            <section className="home-welcome">
                <div className="home-welcome__text">
                    <h1 className="home-welcome__title">SD-WAN 网络管理中心</h1>
                    <p className="home-welcome__subtitle">实时监控全网状态，快速响应异常事件</p>
                </div>
                <div className="home-welcome__health">
                    <div className="home-health-ring">
                        <svg className="home-health-ring__svg" viewBox="0 0 64 64">
                            <circle className="home-health-ring__bg" cx="32" cy="32" r="28" />
                            <circle
                                className="home-health-ring__fg"
                                cx="32" cy="32" r="28"
                                stroke={healthColor}
                                strokeDasharray={circumference}
                                strokeDashoffset={healthOffset}
                            />
                        </svg>
                        <div className="home-health-ring__pulse" style={{ borderColor: healthColor }} />
                        <span className="home-health-ring__value" style={{ color: healthColor }}>
                            {data.healthScore.toFixed(1)}
                        </span>
                    </div>
                    <div className="home-health-info">
                        <span className="home-health-info__label">HEALTH SCORE</span>
                        <span className="home-health-info__status" style={{ color: healthColor }}>
                            <span className="home-health-info__dot" style={{ background: healthColor, boxShadow: `0 0 6px ${healthColor}` }} />
                            {getHealthStatus(data.healthScore)}
                        </span>
                    </div>
                </div>
            </section>

            {/* ===== 关键指标卡片 ===== */}
            <section className="home-metrics">
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">📡</div>
                    <div className="home-metric-card__value home-metric-card__value--cyan">{stats.totalSites}</div>
                    <div className="home-metric-card__label">总站点</div>
                </div>
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">✅</div>
                    <div className="home-metric-card__value home-metric-card__value--green">{stats.onlineSites}</div>
                    <div className="home-metric-card__label">在线</div>
                </div>
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">❌</div>
                    <div className="home-metric-card__value home-metric-card__value--red">{stats.offlineSites}</div>
                    <div className="home-metric-card__label">离线</div>
                </div>
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">⚠️</div>
                    <div className="home-metric-card__value home-metric-card__value--yellow">{stats.warningSites}</div>
                    <div className="home-metric-card__label">告警</div>
                </div>
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">🔗</div>
                    <div className="home-metric-card__value home-metric-card__value--purple">{stats.totalLinks}</div>
                    <div className="home-metric-card__label">活跃链路</div>
                </div>
                <div className="home-metric-card">
                    <div className="home-metric-card__icon">🔔</div>
                    <div className="home-metric-card__value home-metric-card__value--red">{stats.criticalAlerts}</div>
                    <div className="home-metric-card__label">严重告警</div>
                </div>
            </section>

            {/* ===== 双栏布局 ===== */}
            <div className="home-grid">
                {/* --- 左栏：快速操作 + 系统状态 --- */}
                <div>
                    {/* 快速操作 */}
                    <div className="home-section" style={{ marginBottom: 24 }}>
                        <h3 className="home-section__title">
                            <MonitorOutlined className="home-section__title-icon" />
                            快速操作
                        </h3>
                        <div className="home-actions">
                            <div className="home-action-card" onClick={() => navigate('/sites')}>
                                <div className="home-action-card__icon"><CloudServerOutlined /></div>
                                <div className="home-action-card__info">
                                    <span className="home-action-card__name">站点管理</span>
                                    <span className="home-action-card__desc">管理所有 SD-WAN 站点</span>
                                </div>
                            </div>
                            <div className="home-action-card" onClick={() => navigate('/dashboard')}>
                                <div className="home-action-card__icon"><MonitorOutlined /></div>
                                <div className="home-action-card__info">
                                    <span className="home-action-card__name">全网监控</span>
                                    <span className="home-action-card__desc">实时监控网络大屏</span>
                                </div>
                            </div>
                            <div className="home-action-card" onClick={() => navigate('/topology')}>
                                <div className="home-action-card__icon"><ApartmentOutlined /></div>
                                <div className="home-action-card__info">
                                    <span className="home-action-card__name">拓扑视图</span>
                                    <span className="home-action-card__desc">查看网络拓扑结构</span>
                                </div>
                            </div>
                            <div className="home-action-card" onClick={() => navigate('/dashboard')}>
                                <div className="home-action-card__icon"><AlertOutlined /></div>
                                <div className="home-action-card__info">
                                    <span className="home-action-card__name">告警中心</span>
                                    <span className="home-action-card__desc">查看和处理告警事件</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 系统状态 */}
                    <div className="home-section">
                        <h3 className="home-section__title">
                            <CheckCircleOutlined className="home-section__title-icon" />
                            系统状态
                        </h3>
                        <div className="home-status-list">
                            <div className="home-status-item">
                                <span className="home-status-item__label">
                                    <span className="home-status-dot home-status-dot--online" />
                                    控制器状态
                                </span>
                                <span className="home-status-item__value">在线</span>
                            </div>
                            <div className="home-status-item">
                                <span className="home-status-item__label">许可证</span>
                                <span className="home-status-item__value">企业版 · 有效</span>
                            </div>
                            <div className="home-status-item">
                                <span className="home-status-item__label">活跃隧道</span>
                                <span className="home-status-item__value">{data.sites.reduce((sum, s) => sum + s.activeTunnels, 0)}</span>
                            </div>
                            <div className="home-status-item">
                                <span className="home-status-item__label">SLA 达标率</span>
                                <span className="home-status-item__value" style={{ color: 'var(--accent-green)' }}>
                                    {data.applications.length > 0
                                        ? (data.applications.reduce((sum, a) => sum + a.availability, 0) / data.applications.length).toFixed(1)
                                        : '—'}%
                                </span>
                            </div>
                            <div className="home-status-item">
                                <span className="home-status-item__label">
                                    <ClockCircleOutlined />
                                    系统时间
                                </span>
                                <span className="home-status-item__value">{clock || '--:--:--'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 右栏：最近告警 --- */}
                <div className="home-section">
                    <h3 className="home-section__title">
                        <AlertOutlined className="home-section__title-icon" />
                        最近告警
                        <span style={{
                            fontSize: 11,
                            marginLeft: 'auto',
                            color: data.alerts.length > 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                        }}>
                            {data.alerts.length} 条
                        </span>
                    </h3>
                    {data.alerts.length > 0 ? (
                        <div className="home-alert-list">
                            {data.alerts.slice(0, 8).map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`home-alert-item home-alert-item--${alert.severity}`}
                                    onClick={() => handleAlertClick(alert)}
                                >
                                    <span className={`home-alert-item__severity home-alert-item__severity--${alert.severity}`}>
                                        {SEVERITY_LABELS[alert.severity]}
                                    </span>
                                    <div className="home-alert-item__body">
                                        <div className="home-alert-item__title">{alert.title}</div>
                                        <div className="home-alert-item__desc">
                                            {alert.siteName} · {alert.description}
                                        </div>
                                    </div>
                                    <span className="home-alert-item__time">{alert.timestamp}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="home-alert-empty">
                            <CheckCircleOutlined style={{ fontSize: 32, color: 'var(--accent-green)', display: 'block', marginBottom: 8 }} />
                            暂无活跃告警，网络运行正常
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
