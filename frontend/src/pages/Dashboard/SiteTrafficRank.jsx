/**
 * SiteTrafficRank — 站点流量排名 Top N
 * 水平柱状图，按流量降序排列（ECharts bar chart）
 */

import { useMemo } from 'react';
import * as echarts from 'echarts';
import BaseEChart from './BaseEChart';

/**
 * 站点流量排行组件
 * @param {{ data: Array<{name: string, traffic: number}>, theme: string }} props
 */
export default function SiteTrafficRank({ data, theme }) {
    const option = useMemo(() => buildRankOption(data, theme), [data, theme]);
    return <BaseEChart option={option} theme={theme} />;
}

/**
 * 构建 ECharts 水平柱状图配置
 * @param {Array} data - 站点流量数据
 * @param {string} theme - 主题标识
 * @returns {object} ECharts option
 */
function buildRankOption(data, theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#8892b0' : '#475569';
    const splitColor = isDark ? 'rgba(100,120,255,0.08)' : 'rgba(0,0,0,0.06)';

    // 反转数据，使最高值在顶部
    const sorted = [...data].reverse();
    const names = sorted.map((d) => d.name);
    const values = sorted.map((d) => d.traffic);

    // 渐变色：青色系
    const gradFrom = isDark ? 'rgba(0,180,216,0.5)' : 'rgba(2,132,199,0.5)';
    const gradTo = isDark ? '#00b4d8' : '#0284c7';

    return {
        backgroundColor: 'transparent',
        grid: { top: 8, right: 50, bottom: 8, left: 80 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: isDark ? 'rgba(13,19,48,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(100,120,255,0.3)' : 'rgba(0,102,204,0.15)',
            textStyle: { color: textColor, fontSize: 11 },
        },
        xAxis: {
            type: 'value',
            axisLabel: { color: textColor, fontSize: 9, formatter: '{value} G' },
            splitLine: { lineStyle: { color: splitColor } },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'category',
            data: names,
            axisLabel: { color: textColor, fontSize: 10 },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: [{
            type: 'bar',
            data: values.map((val) => ({
                value: val,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: gradFrom },
                        { offset: 1, color: gradTo },
                    ]),
                    borderRadius: [0, 3, 3, 0],
                },
            })),
            barWidth: '60%',
            label: {
                show: true,
                position: 'right',
                color: textColor,
                fontSize: 10,
                formatter: '{c} G',
            },
        }],
    };
}
