/**
 * GeoMap — ECharts 地图组件
 * 支持 china / world 地图动态切换
 * 支持深色/浅色主题自适应（颜色由 theme prop 驱动，不依赖 CSS 变量）
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { MAP_CONFIG } from './monitorData';

/** 地图 GeoJSON 文件路径 */
const MAP_GEO_URLS = {
    china: '/maps/china.json',
    global: '/maps/world.json',
};

/** 已注册的地图缓存，避免重复 fetch */
const registeredMaps = new Set();

/**
 * 根据 theme prop 返回地图配色
 * 直接在 JS 中定义，不读取 CSS 变量，避免 React effect 时序问题
 * @param {'dark' | 'light'} theme
 * @returns {object}
 */
function getThemeColors(theme) {
    if (theme === 'light') {
        return {
            mapArea: 'rgba(215, 228, 245, 0.55)',
            mapBorder: 'rgba(100, 150, 200, 0.3)',
            mapShadow: 'rgba(60, 120, 200, 0.06)',
            lineNormal: 'rgba(0, 151, 167, 0.35)',
            lineWarn: 'rgba(230, 126, 34, 0.55)',
            lineDown: 'rgba(211, 47, 47, 0.5)',
            flightColor: 'rgba(255, 255, 255, 0.9)',
            labelColor: 'rgba(20, 35, 65, 0.85)',
            labelShadow: 'rgba(255, 255, 255, 0.7)',
            nodeBorder: 'rgba(255, 255, 255, 0.9)',
        };
    }
    // dark（默认）
    return {
        mapArea: 'rgba(12, 28, 58, 0.85)',
        mapBorder: 'rgba(60, 120, 190, 0.35)',
        mapShadow: 'rgba(0, 80, 180, 0.15)',
        lineNormal: 'rgba(38, 198, 218, 0.45)',
        lineWarn: 'rgba(255, 183, 77, 0.65)',
        lineDown: 'rgba(229, 115, 115, 0.6)',
        flightColor: 'rgba(255, 255, 255, 0.9)',
        labelColor: 'rgba(220, 235, 255, 0.95)',
        labelShadow: 'rgba(0, 0, 0, 0.8)',
        nodeBorder: 'rgba(255, 255, 255, 0.9)',
    };
}

/**
 * ECharts 地图组件
 * @param {{ mode: 'china' | 'global', nodeList: Array, linksData: Array, coords: object, theme: string }} props
 */
export default function GeoMap({ mode, nodeList, linksData, coords, theme }) {
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

    // mode、数据或主题变化时更新地图
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const config = MAP_CONFIG[mode];
        const geoUrl = MAP_GEO_URLS[mode];
        const mapName = config.mapName;
        const colors = getThemeColors(theme);

        // 如果地图已注册，直接 setOption
        if (registeredMaps.has(mapName)) {
            chart.setOption(buildOption(mapName, config, nodeList, linksData, coords, colors), true);
            return;
        }

        // 异步加载并注册地图
        chart.showLoading({ text: '地图加载中...', color: '#26c6da', textColor: '#e0f0ff', maskColor: 'transparent' });

        fetch(geoUrl)
            .then((res) => res.json())
            .then((geoJson) => {
                echarts.registerMap(mapName, geoJson);
                registeredMaps.add(mapName);
                chart.hideLoading();
                chart.setOption(buildOption(mapName, config, nodeList, linksData, coords, colors), true);
            })
            .catch((err) => {
                console.error(`加载 ${mapName} 地图失败:`, err);
                chart.hideLoading();
            });
    }, [mode, nodeList, linksData, coords, theme]);

    return <div ref={domRef} className="geo-map-container" />;
}

/**
 * 构建 ECharts option
 */
function buildOption(mapName, config, nodeList, linksData, coords, colors) {
    const isChina = mapName === 'china';

    // 构建飞线数据
    const linesSeriesData = linksData.map((link) => ({
        coords: [coords[link.from], coords[link.to]],
        lineStyle: {
            color: link.status === 'down'
                ? colors.lineDown
                : (link.status === 'warn' ? colors.lineWarn : colors.lineNormal),
            width: link.status === 'down' ? 1 : 1.5,
            opacity: link.status === 'down' ? 0.5 : 0.8,
            curveness: isChina ? 0.2 : 0.3,
        },
    }));

    return {
        backgroundColor: 'transparent',
        geo: {
            map: mapName,
            roam: false,
            zoom: config.zoom,
            center: config.center,
            aspectScale: config.aspectScale,
            itemStyle: {
                areaColor: colors.mapArea,
                borderColor: colors.mapBorder,
                borderWidth: isChina ? 1.2 : 0.8,
                shadowColor: colors.mapShadow,
                shadowBlur: 10,
            },
            emphasis: { disabled: true },
            label: { show: false },
        },
        series: [
            {
                type: 'lines',
                coordinateSystem: 'geo',
                data: linesSeriesData,
                polyline: false,
                effect: {
                    show: true,
                    period: 8,
                    trailLength: 0.25,
                    symbol: 'circle',
                    symbolSize: 4,
                    color: colors.flightColor,
                },
                lineStyle: {
                    width: 1.2,
                    opacity: 0.55,
                    curveness: isChina ? 0.2 : 0.3,
                },
                zlevel: 1,
            },
            {
                type: 'scatter',
                coordinateSystem: 'geo',
                data: nodeList,
                symbolSize: (val) => val[2] || 8,
                itemStyle: {
                    borderColor: colors.nodeBorder,
                    borderWidth: 1.5,
                },
                label: {
                    show: true,
                    formatter: '{b}',
                    position: 'right',
                    color: colors.labelColor,
                    fontSize: 11,
                    distance: 8,
                    textShadowBlur: 4,
                    textShadowColor: colors.labelShadow,
                },
                zlevel: 2,
            },
        ],
    };
}
