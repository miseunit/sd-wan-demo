/**
 * TrafficCurve — 实时流量曲线图
 * 展示全网入站/出站流量趋势（ECharts 双折线 + 面积渐变）
 */

import { useMemo } from 'react';
import * as echarts from 'echarts';
import BaseEChart from './BaseEChart';

/**
 * 实时流量曲线组件
 * @param {{ data: Array<{time: string, inbound: number, outbound: number}>, theme: string }} props
 */
export default function TrafficCurve({ data, theme }) {
    const option = useMemo(() => buildTrafficOption(data, theme), [data, theme]);
    return <BaseEChart option={option} theme={theme} />;
}

/**
 * 构建 ECharts 折线图配置
 * @param {Array} data - 时间序列数据
 * @param {string} theme - 主题标识
 * @returns {object} ECharts option
 */
function buildTrafficOption(data, theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#8892b0' : '#475569';
    const borderColor = isDark ? 'rgba(100,120,255,0.15)' : 'rgba(0,0,0,0.08)';
    const splitColor = isDark ? 'rgba(100,120,255,0.08)' : 'rgba(0,0,0,0.06)';

    // 入站（青色）/ 出站（绿色）线条颜色
    const inboundColor = isDark ? '#00b4d8' : '#0284c7';
    const outboundColor = isDark ? '#00e88f' : '#10b981';

    return {
        backgroundColor: 'transparent',
        grid: { top: 30, right: 16, bottom: 24, left: 44 },
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? 'rgba(13,19,48,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(100,120,255,0.3)' : 'rgba(0,102,204,0.15)',
            textStyle: { color: textColor, fontSize: 11 },
            formatter: (params) => {
                let s = params[0].axisValue + '<br/>';
                params.forEach((p) => {
                    s += `${p.marker} ${p.seriesName}: <b>${p.value} Gbps</b><br/>`;
                });
                return s;
            },
        },
        xAxis: {
            type: 'category',
            data: data.map((d) => d.time),
            axisLine: { lineStyle: { color: borderColor } },
            axisLabel: { color: textColor, fontSize: 9, interval: 4 },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            name: 'Gbps',
            nameTextStyle: { color: textColor, fontSize: 9 },
            splitLine: { lineStyle: { color: splitColor } },
            axisLabel: { color: textColor, fontSize: 9 },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: [
            {
                name: '入站',
                type: 'line',
                data: data.map((d) => d.inbound),
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: inboundColor },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: isDark ? 'rgba(0,180,216,0.3)' : 'rgba(2,132,199,0.2)' },
                        { offset: 1, color: 'rgba(0,180,216,0)' },
                    ]),
                },
            },
            {
                name: '出站',
                type: 'line',
                data: data.map((d) => d.outbound),
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: outboundColor },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: isDark ? 'rgba(0,232,143,0.3)' : 'rgba(16,185,129,0.2)' },
                        { offset: 1, color: 'rgba(0,232,143,0)' },
                    ]),
                },
            },
        ],
        animation: true,
        animationDuration: 500,
    };
}
