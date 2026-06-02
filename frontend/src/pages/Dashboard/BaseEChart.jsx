/**
 * BaseEChart — 通用 ECharts 封装组件
 * 处理 init / resize / dispose 生命周期，支持主题切换
 * 复用 GeoMap 的生命周期模式，供 TrafficCurve / SiteTrafficRank / AppTrafficPie 使用
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * 通用 ECharts 容器组件
 * @param {{ option: object, theme: string, className?: string }} props
 *   - option: ECharts 配置项
 *   - theme: 当前主题（dark / light），变化时触发重绘
 *   - className: 额外 CSS 类名
 */
export default function BaseEChart({ option, theme, className = '' }) {
    const domRef = useRef(null);
    const chartRef = useRef(null);

    // 初始化 ECharts 实例（只执行一次）
    useEffect(() => {
        if (!domRef.current) return;
        const chart = echarts.init(domRef.current);
        chartRef.current = chart;

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    // option 或 theme 变化时更新图表
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !option) return;
        chart.setOption(option, true);
    }, [option, theme]);

    return <div ref={domRef} className={`base-echart ${className}`} />;
}
