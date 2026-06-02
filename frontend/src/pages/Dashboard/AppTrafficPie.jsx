/**
 * AppTrafficPie — 应用流量分布
 * 环形饼图展示各应用类型流量占比（ECharts pie chart）
 */

import { useMemo } from 'react';
import BaseEChart from './BaseEChart';

/**
 * 应用流量分布组件
 * @param {{ data: Array<{name: string, value: number, color: string}>, theme: string }} props
 */
export default function AppTrafficPie({ data, theme }) {
    const option = useMemo(() => buildPieOption(data, theme), [data, theme]);
    return <BaseEChart option={option} theme={theme} />;
}

/**
 * 构建 ECharts 环形饼图配置
 * @param {Array} data - 应用流量数据
 * @param {string} theme - 主题标识
 * @returns {object} ECharts option
 */
function buildPieOption(data, theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#a0b8d0' : '#475569';
    const total = data.reduce((s, d) => s + d.value, 0);

    return {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: isDark ? 'rgba(13,19,48,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(100,120,255,0.3)' : 'rgba(0,102,204,0.15)',
            textStyle: { color: textColor, fontSize: 11 },
            formatter: '{b}: {d}%',
        },
        legend: {
            orient: 'vertical',
            right: 8,
            top: 'center',
            textStyle: { color: textColor, fontSize: 10 },
            itemWidth: 8,
            itemHeight: 8,
            itemGap: 8,
        },
        series: [{
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: {
                label: { show: true, fontSize: 12, fontWeight: 'bold' },
            },
            labelLine: { show: false },
            data: data.map((d) => ({
                name: d.name,
                value: d.value,
                itemStyle: { color: d.color },
            })),
        }],
        // 中心文字
        graphic: [{
            type: 'text',
            left: '30%',
            top: '45%',
            style: {
                text: `${total}%`,
                fill: textColor,
                fontSize: 16,
                fontWeight: 'bold',
                fontFamily: 'SF Mono, Cascadia Code, Consolas, monospace',
                textAlign: 'center',
            },
        }],
    };
}
