/**
 * SD-WAN 全网监控大屏 — 主页面
 * 深色科技风三栏布局，支持国内/全球地图切换，支持深色/浅色主题
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import GeoMap from './GeoMap';
import TrafficCurve from './TrafficCurve';
import SiteTrafficRank from './SiteTrafficRank';
import AppTrafficPie from './AppTrafficPie';
import { MAP_CONFIG, MODE_LABELS, getMonitorData } from './monitorData';
import { useTheme } from '../../contexts/ThemeContext';
import useFullscreen from '../../hooks/useFullscreen';
import './Dashboard.css';

/**
 * 从 CSS 变量读取颜色值
 * @param {string} name - CSS 变量名（含 --）
 * @param {string} fallback - 默认值
 * @returns {string}
 */
function getCSSVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * 大屏主页面组件
 */
export default function Dashboard() {
    const [mode, setMode] = useState('china');
    const [timeText, setTimeText] = useState('');
    const [ringKey, setRingKey] = useState(0); // 触发环形图重绘
    const [trafficKey, setTrafficKey] = useState(0); // 触发流量曲线重绘
    const [expandedAlert, setExpandedAlert] = useState(null); // 当前展开的告警详情
    const [confirmedAlerts, setConfirmedAlerts] = useState(new Set()); // 已确认的告警
    const [clearedAlerts, setClearedAlerts] = useState(new Set()); // 已清除的告警
    const pageRef = useRef(null);
    const ringCanvasRef = useRef(null);
    const trafficDataRef = useRef(null); // 实时流量数据引用
    const { theme } = useTheme();
    const { isFullscreen, toggleFullscreen } = useFullscreen(pageRef);

    // 获取当前模式的数据
    const data = useMemo(() => getMonitorData(mode), [mode]);

    // 初始化流量数据引用
    useEffect(() => {
        trafficDataRef.current = [...data.trafficCurve];
    }, [data.trafficCurve]);

    // 获取当前模式需要的 coords（供 GeoMap 使用）
    const coords = useMemo(() => {
        const isChina = mode === 'china';
        return isChina
            ? {
                '北京': [116.46, 39.92], '上海': [121.48, 31.22], '广州': [113.23, 23.16],
                '成都': [104.06, 30.67], '武汉': [114.31, 30.52], '西安': [108.95, 34.27],
                '沈阳': [123.38, 41.80], '南京': [118.78, 32.04], '杭州': [120.19, 30.26],
                '深圳': [114.07, 22.62], '重庆': [106.54, 29.59], '哈尔滨': [126.63, 45.75],
                '昆明': [102.73, 25.04], '乌鲁木齐': [87.68, 43.77], '拉萨': [91.11, 29.97],
                '海口': [110.33, 20.02],
            }
            : {
                '纽约': [-74.0, 40.7], '洛杉矶': [-118.2, 34.0], '芝加哥': [-87.6, 41.9],
                '多伦多': [-79.4, 43.7], '墨西哥城': [-99.1, 19.4], '圣保罗': [-46.6, -23.5],
                '伦敦': [-0.1, 51.5], '法兰克福': [8.7, 50.1], '巴黎': [2.3, 48.9],
                '莫斯科': [37.6, 55.8], '约翰内斯堡': [28.0, -26.2], '迪拜': [55.3, 25.3],
                '孟买': [72.8, 19.1], '新加坡': [103.8, 1.3], '东京': [139.8, 35.7],
                '悉尼': [151.2, -33.9], '北京': [116.4, 39.9], '上海': [121.5, 31.2],
                '香港': [114.2, 22.3],
            };
    }, [mode]);

    const config = MAP_CONFIG[mode];

    // 实时时钟
    useEffect(() => {
        function updateTime() {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            setTimeText(
                `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
                `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
            );
        }
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // 实时流量模拟更新（每 3 秒追加新数据点）
    useEffect(() => {
        const timer = setInterval(() => {
            const prev = trafficDataRef.current;
            if (!prev || prev.length === 0) return;
            const lastIn = prev[prev.length - 1].inbound;
            const lastOut = prev[prev.length - 1].outbound;
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const newPoint = {
                time: timeStr,
                inbound: +(Math.max(2, lastIn + (Math.random() - 0.5) * 1.5)).toFixed(1),
                outbound: +(Math.max(1, lastOut + (Math.random() - 0.5) * 1.2)).toFixed(1),
            };
            trafficDataRef.current = [...prev.slice(1), newPoint];
            setTrafficKey((k) => k + 1);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    /** 处理告警操作 */
    const handleAlertAction = useCallback((action, event) => {
        if (action === 'confirm') {
            setConfirmedAlerts((prev) => new Set([...prev, event.id]));
        } else if (action === 'clear') {
            setClearedAlerts((prev) => new Set([...prev, event.id]));
        } else if (action === 'detail') {
            setExpandedAlert((prev) => (prev === event ? null : event));
        }
    }, []);

    // 过滤掉已清除的告警
    const visibleAlerts = data.alerts.filter((a) => !clearedAlerts.has(a.id));

    // 环形图绘制（主题或数据变化时重绘）
    useEffect(() => {
        const canvas = ringCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 100, 100);

        // 从 CSS 变量读取主题色
        const ringCenterBg = getCSSVar('--dashboard-panel-bg', 'rgba(8,20,40,0.9)');

        let startAngle = -Math.PI / 2;
        data.ringChart.forEach((seg) => {
            const sweep = seg.percent * Math.PI * 2;
            // 主弧线
            ctx.beginPath();
            ctx.arc(50, 50, 40, startAngle, startAngle + sweep);
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            ctx.stroke();
            // 光晕
            ctx.beginPath();
            ctx.arc(50, 50, 40, startAngle, startAngle + sweep);
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = 13;
            ctx.globalAlpha = 0.2;
            ctx.stroke();
            ctx.globalAlpha = 1;
            startAngle += sweep;
        });
        // 中心遮罩（使用主题色）
        ctx.beginPath();
        ctx.arc(50, 50, 31, 0, Math.PI * 2);
        ctx.fillStyle = ringCenterBg;
        ctx.fill();
    }, [data.ringChart, theme]);

    /** 切换模式 */
    const handleModeChange = useCallback((newMode) => {
        if (newMode !== mode) setMode(newMode);
    }, [mode]);

    return (
        <div className="monitor-page" ref={pageRef}>
            {/* 粒子背景 */}
            <canvas id="particles-canvas" className="particles-canvas" />
            <div className="grid-bg" />

            <div className="monitor-container">
                {/* ====== 顶部标题栏 ====== */}
                <header className="monitor-header">
                    {/* 左侧：时钟 */}
                    <div className="monitor-header__time">
                        <span className="live-dot" />
                        <span>{timeText}</span>
                    </div>

                    {/* 中间：标题 */}
                    <div className="monitor-header__inner">
                        <div className="monitor-header__line" />
                        <div className="monitor-header__diamond" />
                        <span className="monitor-header__title">{config.title}</span>
                        <div className="monitor-header__diamond" />
                        <div className="monitor-header__line" />
                    </div>
                    <div className="monitor-header__subtitle">{config.titleEn}</div>

                    {/* 右侧：切换按钮 + 全屏 */}
                    <div className="mode-switcher">
                        <button
                            className={`mode-switcher__btn ${mode === 'china' ? 'mode-switcher__btn--active' : ''}`}
                            onClick={() => handleModeChange('china')}
                        >
                            {MODE_LABELS.china}
                        </button>
                        <button
                            className={`mode-switcher__btn ${mode === 'global' ? 'mode-switcher__btn--active' : ''}`}
                            onClick={() => handleModeChange('global')}
                        >
                            {MODE_LABELS.global}
                        </button>
                            <button
                        className="fullscreen-btn ml-2"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? '退出全屏' : '全屏显示'}
                    >
                        {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                    </button>
                    </div>

                
                </header>

                {/* ====== 内容区三栏布局 ====== */}
                <div className="monitor-content">
                    {/* 左侧面板 */}
                    <div className="col-left">
                        {/* 核心指标 */}
                        <div className="panel">
                            <div className="panel-header">
                                <span className="icon-bar" />核心指标
                            </div>
                            <div className="panel-body">
                                <div className="stat-cards">
                                    <div className="stat-card">
                                        <span className="card-label">站点总数</span>
                                        <span className="card-value card-value--cyan">{data.stats.totalSites}</span>
                                        <span className="card-sub">
                                            <span className="dot-indicator dot-green" />在线 {data.stats.online}
                                        </span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">活跃告警</span>
                                        <span className="card-value card-value--red">{data.stats.alertCount}</span>
                                        <span className="card-sub">
                                            <span className="dot-indicator dot-red" />严重 {data.stats.alertCritical}
                                        </span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">活跃隧道</span>
                                        <span className="card-value card-value--green">{data.stats.tunnels}</span>
                                        <span className="card-sub">
                                            <span className="dot-indicator dot-green" />健康率 98.4%
                                        </span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">当前流量(Gbps)</span>
                                        <span className="card-value card-value--cyan">{trafficDataRef.current ? trafficDataRef.current[trafficDataRef.current.length - 1].inbound : data.stats.currentTraffic}</span>
                                        <span className="card-sub">实时更新</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">总带宽(Gbps)</span>
                                        <span className="card-value card-value--orange">{data.stats.bandwidth}</span>
                                        <span className="card-sub">利用率 72.1%</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">流量峰值(Gbps)</span>
                                        <span className="card-value card-value--green">{data.stats.trafficPeak}</span>
                                        <span className="card-sub">今日峰值</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">平均延迟(ms)</span>
                                        <span className="card-value card-value--purple">{data.stats.avgLatency}</span>
                                        <span className="card-sub">较昨日 -5.2%</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="card-label">正常隧道</span>
                                        <span className="card-value card-value--cyan">{data.stats.normalTunnels}<span style={{ fontSize: 14, opacity: 0.6 }}> / {data.stats.totalTunnels}</span></span>
                                        <span className="card-sub">
                                            <span className="dot-indicator dot-green" />健康率 {(data.stats.normalTunnels / data.stats.totalTunnels * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 关键节点状态 */}
                        <div className="panel panel--flex">
                            <div className="panel-header">
                                <span className="icon-bar" />关键站点状态
                            </div>
                            <div className="panel-body">
                                <div className="site-list">
                                    {data.siteList.map((site) => (
                                        <div key={site.name} className={`site-item site-item--${site.status}`}>
                                            <span className="site-name">{site.name}</span>
                                            <span className="site-latency">{site.latency}</span>
                                            <span className="site-loss">丢包 {site.loss}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 中央地图 */}
                    <div className="col-center">
                        <div className="panel panel--flex">
                            <div className="panel-header">
                                <span className="icon-bar" />
                                {mode === 'china' ? '中国' : '全球'}SD-WAN网络拓扑
                                <span className="panel-header__legend">
                                    <span className="dot-indicator dot-green" />正常
                                    <span className="dot-indicator dot-yellow" />警告
                                    <span className="dot-indicator dot-red" />故障
                                </span>
                            </div>
                            <div className="panel-body panel-body--map">
                                <GeoMap
                                    mode={mode}
                                    nodeList={data.nodeList}
                                    linksData={data.linksData}
                                    coords={coords}
                                    theme={theme}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 右侧面板 */}
                    <div className="col-right">
                        {/* 链路质量分布 */}
                        <div className="panel">
                            <div className="panel-header">
                                <span className="icon-bar" />链路质量分布
                            </div>
                            <div className="panel-body">
                                <div className="ring-chart-wrap">
                                    <canvas ref={ringCanvasRef} className="ring-canvas" width={100} height={100} />
                                    <div className="ring-legend">
                                        {data.ringChart.map((item) => (
                                            <div key={item.label} className="ring-legend-item">
                                                <span className="ring-legend-dot" style={{ background: item.color }} />
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 带宽利用率 TOP5 */}
                        <div className="panel panel--flex">
                            <div className="panel-header">
                                <span className="icon-bar" />带宽利用率 TOP5
                            </div>
                            <div className="panel-body">
                                <div className="progress-list">
                                    {data.bandwidthTop5.map((item) => (
                                        <div key={item.name} className="progress-item">
                                            <div className="progress-label">
                                                <span>{item.name}</span>
                                                <span className="val">{item.val}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className={`progress-fill ${item.color}`}
                                                    style={{ width: `${item.val}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 实时告警事件 */}
                        <div className="panel panel--flex">
                            <div className="panel-header">
                                <span className="icon-bar" />实时告警事件
                            </div>
                            <div className="panel-body">
                                <div className="event-list">
                                    {visibleAlerts.map((event) => (
                                        <div key={event.id} className={`event-item ${event.cls} ${confirmedAlerts.has(event.id) ? 'event-item--confirmed' : ''}`}>
                                            <span className="event-time">{event.time}</span>
                                            <span className="event-msg">{event.msg}</span>
                                            {event.cls && (
                                                <span className="event-actions">
                                                    <button className="event-btn event-btn--confirm" title="确认"
                                                        onClick={() => handleAlertAction('confirm', event)}
                                                    >确认</button>
                                                    <button className="event-btn event-btn--clear" title="清除"
                                                        onClick={() => handleAlertAction('clear', event)}
                                                    >清除</button>
                                                    <button className="event-btn event-btn--detail" title="查看详情"
                                                        onClick={() => handleAlertAction('detail', event)}
                                                    >详情</button>
                                                </span>
                                            )}
                                            {expandedAlert === event && (
                                                <div className="event-detail">
                                                    <div className="event-detail__row">来源: {event.source}</div>
                                                    <div className="event-detail__row">级别: {event.cls === 'critical' ? '严重' : event.cls === 'warn' ? '警告' : '信息'}</div>
                                                    <div className="event-detail__row">详情: {event.detail}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== 底部图表区 ====== */}
                <div className="monitor-bottom-row">
                    <div className="panel">
                        <div className="panel-header">
                            <span className="icon-bar" />站点流量排名
                        </div>
                        <div className="panel-body">
                            <SiteTrafficRank data={data.siteTrafficRank} theme={theme} />
                        </div>
                    </div>
                    <div className="panel">
                        <div className="panel-header">
                            <span className="icon-bar" />实时流量趋势
                            <span className="panel-header__legend">
                                <span className="dot-indicator dot-cyan" />入站
                                <span className="dot-indicator dot-green" />出站
                            </span>
                        </div>
                        <div className="panel-body">
                            <TrafficCurve data={trafficDataRef.current || data.trafficCurve} theme={theme} />
                        </div>
                    </div>
                    <div className="panel">
                        <div className="panel-header">
                            <span className="icon-bar" />应用流量分布
                        </div>
                        <div className="panel-body">
                            <AppTrafficPie data={data.appTrafficPie} theme={theme} />
                        </div>
                    </div>
                </div>

                {/* ====== 底部滚动播报 ====== */}
                <div className="ticker-bar">
                    <div className="ticker-label">📡 实时播报</div>
                    <div className="ticker-content">
                        <div className="ticker-scroll">
                            {data.tickerMessages.map((msg, idx) => (
                                <span key={idx}>
                                    {msg.text}
                                    <span className={msg.status === 'ok' ? 'ticker-ok' : 'ticker-warn'}>{msg.value}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
