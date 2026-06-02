/**
 * 监控大屏 Mock 数据
 * 包含中国版和全球版两套完整数据，供 Dashboard 页面切换使用
 */

/** 地图配置 */
export const MAP_CONFIG = {
    china: {
        mapName: 'china',
        center: [104.0, 35.0],
        zoom: 1.2,
        aspectScale: 0.85,
        title: 'SD-WAN 中国网络监控中心',
        titleEn: 'CHINA OPS CENTER',
    },
    global: {
        mapName: 'world',
        center: [15, 20],
        zoom: 1.25,
        aspectScale: 0.75,
        title: 'SD-WAN 全球网络监控中心',
        titleEn: 'GLOBAL OPS CENTER',
    },
};

/** 模式标签 */
export const MODE_LABELS = { china: '国内', global: '全球' };

// ======================== 中国版数据 ========================

const CHINA_NODES = {
    /* Hub 节点 */
    hubs: ['北京', '上海', '广州', '成都'],
    /* Spoke 节点 */
    spokes: ['武汉', '西安', '沈阳', '南京', '杭州', '深圳', '重庆', '哈尔滨', '昆明', '乌鲁木齐', '拉萨', '海口'],
    /* 经纬度 */
    coords: {
        '北京': [116.46, 39.92],
        '上海': [121.48, 31.22],
        '广州': [113.23, 23.16],
        '成都': [104.06, 30.67],
        '武汉': [114.31, 30.52],
        '西安': [108.95, 34.27],
        '沈阳': [123.38, 41.80],
        '南京': [118.78, 32.04],
        '杭州': [120.19, 30.26],
        '深圳': [114.07, 22.62],
        '重庆': [106.54, 29.59],
        '哈尔滨': [126.63, 45.75],
        '昆明': [102.73, 25.04],
        '乌鲁木齐': [87.68, 43.77],
        '拉萨': [91.11, 29.97],
        '海口': [110.33, 20.02],
    },
    /* 警告节点 */
    warnNodes: ['沈阳', '哈尔滨'],
};

// ======================== 全球版数据 ========================

const GLOBAL_NODES = {
    hubs: ['纽约', '伦敦', '法兰克福', '新加坡', '圣保罗', '东京'],
    spokes: ['洛杉矶', '芝加哥', '多伦多', '墨西哥城', '巴黎', '莫斯科', '约翰内斯堡', '迪拜', '孟买', '悉尼', '北京', '上海', '香港'],
    coords: {
        '纽约': [-74.0, 40.7],
        '洛杉矶': [-118.2, 34.0],
        '芝加哥': [-87.6, 41.9],
        '多伦多': [-79.4, 43.7],
        '墨西哥城': [-99.1, 19.4],
        '圣保罗': [-46.6, -23.5],
        '伦敦': [-0.1, 51.5],
        '法兰克福': [8.7, 50.1],
        '巴黎': [2.3, 48.9],
        '莫斯科': [37.6, 55.8],
        '约翰内斯堡': [28.0, -26.2],
        '迪拜': [55.3, 25.3],
        '孟买': [72.8, 19.1],
        '新加坡': [103.8, 1.3],
        '东京': [139.8, 35.7],
        '悉尼': [151.2, -33.9],
        '北京': [116.4, 39.9],
        '上海': [121.5, 31.2],
        '香港': [114.2, 22.3],
    },
    warnNodes: ['圣保罗', '孟买', '约翰内斯堡'],
};

/**
 * 根据节点配置构建 ECharts scatter 数据和 links 数据
 * @param {object} nodeConfig - 节点配置 { hubs, spokes, coords, warnNodes }
 * @param {number} hubSize - Hub 节点散点大小
 * @param {number} spokeSize - Spoke 节点散点大小
 * @param {number} maxDist - Spoke 连接 Hub 的最大距离阈值
 * @param {number[]} warnLinkIndices - 模拟警告的链路索引
 * @param {number[]} downLinkIndices - 模拟故障的链路索引
 * @returns {{ nodeList: Array, linksData: Array }}
 */
function buildMapData(nodeConfig, hubSize, spokeSize, maxDist, warnLinkIndices, downLinkIndices) {
    const { hubs, spokes, coords, warnNodes } = nodeConfig;
    const allNodes = [...hubs, ...spokes];

    // 构建散点数据（标签颜色不硬编码，由 GeoMap 组件根据主题动态设置）
    const nodeList = allNodes.map((name) => {
        const isHub = hubs.includes(name);
        const isWarn = warnNodes.includes(name);
        return {
            name,
            value: [...coords[name], isHub ? hubSize : spokeSize],
            symbolSize: isHub ? hubSize : spokeSize,
            itemStyle: {
                color: isWarn ? '#ffb74d' : (isHub ? '#26c6da' : '#80deea'),
                shadowBlur: isHub ? 14 : 8,
                shadowColor: isWarn ? 'rgba(255,183,77,0.5)' : (isHub ? 'rgba(38,198,218,0.4)' : 'rgba(128,222,234,0.3)'),
            },
            label: {
                show: true,
                position: 'right',
                fontSize: isHub ? 11 : 10,
                distance: 8,
            },
        };
    });

    // 构建链路数据
    const linksData = [];
    // Hub 间全互联
    for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
            linksData.push({ from: hubs[i], to: hubs[j], status: 'up' });
        }
    }
    // Spoke 连接最近的 1~2 个 Hub
    spokes.forEach((spoke) => {
        const [sx, sy] = coords[spoke];
        const dists = hubs.map((hub) => {
            const [hx, hy] = coords[hub];
            return { hub, dist: Math.sqrt((sx - hx) ** 2 + (sy - hy) ** 2) };
        }).sort((a, b) => a.dist - b.dist);

        linksData.push({ from: spoke, to: dists[0].hub, status: 'up' });
        if (dists.length > 1 && dists[1].dist < maxDist) {
            linksData.push({ from: spoke, to: dists[1].hub, status: 'up' });
        }
    });

    // 模拟链路状态
    linksData.forEach((link, idx) => {
        if (downLinkIndices.includes(idx)) link.status = 'down';
        else if (warnLinkIndices.includes(idx)) link.status = 'warn';
    });

    return { nodeList, linksData };
}

// ======================== 完整数据集 ========================

/** 中国版站点列表 */
const CHINA_SITE_LIST = [
    { name: '北京 Hub', latency: '4ms', loss: '0.01%', status: 'up' },
    { name: '上海 Hub', latency: '6ms', loss: '0.02%', status: 'up' },
    { name: '广州 Hub', latency: '8ms', loss: '0.03%', status: 'up' },
    { name: '成都 Hub', latency: '12ms', loss: '0.05%', status: 'up' },
    { name: '武汉 Spoke', latency: '10ms', loss: '0.04%', status: 'up' },
    { name: '西安 Spoke', latency: '14ms', loss: '0.08%', status: 'up' },
    { name: '沈阳 Spoke', latency: '18ms', loss: '0.12%', status: 'warn' },
    { name: '南京 Spoke', latency: '7ms', loss: '0.02%', status: 'up' },
    { name: '杭州 Spoke', latency: '8ms', loss: '0.03%', status: 'up' },
    { name: '深圳 Spoke', latency: '9ms', loss: '0.04%', status: 'up' },
];

/** 全球版站点列表 */
const GLOBAL_SITE_LIST = [
    { name: '纽约 Hub', latency: '14ms', loss: '0.01%', status: 'up' },
    { name: '伦敦 Hub', latency: '22ms', loss: '0.04%', status: 'up' },
    { name: '法兰克福 Hub', latency: '18ms', loss: '0.02%', status: 'up' },
    { name: '新加坡 Hub', latency: '28ms', loss: '0.06%', status: 'up' },
    { name: '圣保罗 Hub', latency: '48ms', loss: '0.18%', status: 'warn' },
    { name: '东京 Spoke', latency: '32ms', loss: '0.05%', status: 'up' },
    { name: '孟买 Spoke', latency: '55ms', loss: '0.22%', status: 'warn' },
    { name: '悉尼 Spoke', latency: '62ms', loss: '0.14%', status: 'up' },
    { name: '迪拜 Spoke', latency: '44ms', loss: '0.11%', status: 'up' },
    { name: '约翰内斯堡 Spoke', latency: '78ms', loss: '0.29%', status: 'warn' },
];

/** 中国版带宽 TOP5 */
const CHINA_BANDWIDTH_TOP5 = [
    { name: '北京-上海隧道', val: 78, color: 'fill-orange' },
    { name: '广州-深圳隧道', val: 72, color: 'fill-cyan' },
    { name: '上海-杭州隧道', val: 65, color: 'fill-cyan' },
    { name: '北京-广州隧道', val: 61, color: 'fill-green' },
    { name: '成都-武汉隧道', val: 55, color: 'fill-green' },
];

/** 全球版带宽 TOP5 */
const GLOBAL_BANDWIDTH_TOP5 = [
    { name: '纽约-伦敦隧道', val: 81, color: 'fill-orange' },
    { name: '新加坡-东京隧道', val: 74, color: 'fill-cyan' },
    { name: '法兰克福-伦敦隧道', val: 67, color: 'fill-cyan' },
    { name: '纽约-法兰克福隧道', val: 62, color: 'fill-green' },
    { name: '圣保罗-纽约隧道', val: 58, color: 'fill-green' },
];

/** 中国版告警事件（含 source / id / detail，支持大屏告警交互） */
const CHINA_ALERTS = [
    {
        time: '14:32:10', msg: '沈阳节点延迟超过阈值(28ms)', cls: 'warn',
        source: '沈阳 Spoke', id: 'ALERT-CN-001',
        detail: '沈阳Spoke到北京Hub的MPLS链路延迟持续超过25ms阈值，已持续15分钟。建议检查沈阳本地网络质量或切换至Internet备份链路。',
    },
    {
        time: '14:25:18', msg: '北京-上海主隧道切换完成', cls: '',
        source: '北京-上海隧道', id: 'ALERT-CN-002',
        detail: '北京至上海主隧道检测到链路质量下降，已自动切换至备份隧道，当前业务无影响。',
    },
    {
        time: '14:18:45', msg: '广州Hub检测到短暂流量突发', cls: 'warn',
        source: '广州 Hub', id: 'ALERT-CN-003',
        detail: '广州Hub出站流量在5分钟内从4.2Gbps突增至8.6Gbps，疑似大文件同步任务触发。建议关注带宽利用率。',
    },
    {
        time: '14:10:22', msg: '成都节点固件升级成功', cls: '',
        source: '成都 Hub', id: 'ALERT-CN-004',
        detail: '成都Hub已完成v3.2.1固件升级，设备运行正常，隧道全部恢复。',
    },
    {
        time: '14:02:55', msg: '武汉Spoke丢包率恢复正常', cls: '',
        source: '武汉 Spoke', id: 'ALERT-CN-005',
        detail: '武汉Spoke至北京Hub丢包率从0.12%降至0.02%，告警自动恢复。',
    },
];

/** 全球版告警事件（含 source / id / detail，支持大屏告警交互） */
const GLOBAL_ALERTS = [
    {
        time: '14:38:05', msg: '圣保罗-纽约隧道延迟超过阈值(138ms)', cls: 'warn',
        source: '圣保罗-纽约隧道', id: 'ALERT-GL-001',
        detail: '圣保罗至纽约的主隧道延迟达到138ms，超过120ms阈值。已自动启用Miami中继路径。',
    },
    {
        time: '14:25:44', msg: '孟买Spoke丢包率升至0.25%', cls: 'warn',
        source: '孟买 Spoke', id: 'ALERT-GL-002',
        detail: '孟买Spoke到新加坡Hub的丢包率持续上升至0.25%，可能与当地ISP网络波动有关。',
    },
    {
        time: '14:18:32', msg: '新加坡Hub自动切换备用路由', cls: '',
        source: '新加坡 Hub', id: 'ALERT-GL-003',
        detail: '新加坡Hub检测到主链路质量波动，已自动切换至备用BGP路由，业务连续性正常。',
    },
    {
        time: '14:10:17', msg: '约翰内斯堡节点离线超过2分钟', cls: 'critical',
        source: '约翰内斯堡 Spoke', id: 'ALERT-GL-004',
        detail: '约翰内斯堡Spoke节点已失联超过2分钟，所有关联隧道断开。请立即检查当地网络和设备状态。',
    },
    {
        time: '14:02:59', msg: '伦敦Hub完成配置同步', cls: '',
        source: '伦敦 Hub', id: 'ALERT-GL-005',
        detail: '伦敦Hub已完成全网策略配置同步，所有隧道策略已更新至最新版本。',
    },
];

/** 中国版实时流量曲线（30个时间点） */
const CHINA_TRAFFIC_CURVE = [
    { time: '13:35', inbound: 6.2, outbound: 4.1 },
    { time: '13:40', inbound: 6.5, outbound: 4.3 },
    { time: '13:45', inbound: 7.1, outbound: 4.8 },
    { time: '13:50', inbound: 7.8, outbound: 5.2 },
    { time: '13:55', inbound: 8.2, outbound: 5.6 },
    { time: '14:00', inbound: 8.8, outbound: 5.9 },
    { time: '14:05', inbound: 9.1, outbound: 6.2 },
    { time: '14:10', inbound: 8.6, outbound: 5.8 },
    { time: '14:15', inbound: 8.3, outbound: 5.5 },
    { time: '14:20', inbound: 7.9, outbound: 5.1 },
    { time: '14:25', inbound: 8.5, outbound: 5.7 },
    { time: '14:30', inbound: 9.2, outbound: 6.4 },
    { time: '14:35', inbound: 9.8, outbound: 6.8 },
    { time: '14:40', inbound: 10.1, outbound: 7.2 },
    { time: '14:45', inbound: 9.6, outbound: 6.5 },
    { time: '14:50', inbound: 9.3, outbound: 6.1 },
    { time: '14:55', inbound: 8.9, outbound: 5.9 },
    { time: '15:00', inbound: 9.4, outbound: 6.6 },
    { time: '15:05', inbound: 10.2, outbound: 7.1 },
    { time: '15:10', inbound: 10.8, outbound: 7.5 },
    { time: '15:15', inbound: 10.3, outbound: 6.9 },
    { time: '15:20', inbound: 9.7, outbound: 6.3 },
    { time: '15:25', inbound: 9.1, outbound: 5.8 },
    { time: '15:30', inbound: 8.6, outbound: 5.4 },
    { time: '15:35', inbound: 8.2, outbound: 5.2 },
    { time: '15:40', inbound: 8.8, outbound: 6.0 },
    { time: '15:45', inbound: 9.5, outbound: 6.7 },
    { time: '15:50', inbound: 10.1, outbound: 7.3 },
    { time: '15:55', inbound: 9.8, outbound: 6.8 },
    { time: '16:00', inbound: 9.2, outbound: 6.2 },
];

/** 全球版实时流量曲线（30个时间点） */
const GLOBAL_TRAFFIC_CURVE = [
    { time: '13:35', inbound: 32.5, outbound: 28.1 },
    { time: '13:40', inbound: 33.8, outbound: 29.4 },
    { time: '13:45', inbound: 35.2, outbound: 30.8 },
    { time: '13:50', inbound: 36.1, outbound: 31.5 },
    { time: '13:55', inbound: 37.8, outbound: 32.6 },
    { time: '14:00', inbound: 39.2, outbound: 34.1 },
    { time: '14:05', inbound: 40.5, outbound: 35.8 },
    { time: '14:10', inbound: 38.9, outbound: 33.5 },
    { time: '14:15', inbound: 37.2, outbound: 32.1 },
    { time: '14:20', inbound: 38.5, outbound: 33.8 },
    { time: '14:25', inbound: 41.2, outbound: 36.2 },
    { time: '14:30', inbound: 42.8, outbound: 37.9 },
    { time: '14:35', inbound: 44.1, outbound: 38.5 },
    { time: '14:40', inbound: 43.5, outbound: 37.2 },
    { time: '14:45', inbound: 41.8, outbound: 35.6 },
    { time: '14:50', inbound: 40.2, outbound: 34.8 },
    { time: '14:55', inbound: 39.5, outbound: 33.2 },
    { time: '15:00', inbound: 41.1, outbound: 35.9 },
    { time: '15:05', inbound: 43.6, outbound: 38.2 },
    { time: '15:10', inbound: 45.2, outbound: 39.8 },
    { time: '15:15', inbound: 44.8, outbound: 38.5 },
    { time: '15:20', inbound: 42.1, outbound: 36.1 },
    { time: '15:25', inbound: 40.5, outbound: 34.2 },
    { time: '15:30', inbound: 39.8, outbound: 33.5 },
    { time: '15:35', inbound: 38.2, outbound: 32.8 },
    { time: '15:40', inbound: 40.1, outbound: 35.1 },
    { time: '15:45', inbound: 42.8, outbound: 37.5 },
    { time: '15:50', inbound: 44.5, outbound: 38.9 },
    { time: '15:55', inbound: 43.2, outbound: 37.1 },
    { time: '16:00', inbound: 41.5, outbound: 35.8 },
];

/** 中国版站点流量排行 Top 8 */
const CHINA_SITE_TRAFFIC_RANK = [
    { name: '北京 Hub', traffic: 3.8 },
    { name: '上海 Hub', traffic: 3.2 },
    { name: '广州 Hub', traffic: 2.9 },
    { name: '深圳 Spoke', traffic: 1.8 },
    { name: '杭州 Spoke', traffic: 1.5 },
    { name: '成都 Hub', traffic: 1.3 },
    { name: '武汉 Spoke', traffic: 1.1 },
    { name: '南京 Spoke', traffic: 0.9 },
];

/** 全球版站点流量排行 Top 8 */
const GLOBAL_SITE_TRAFFIC_RANK = [
    { name: '纽约 Hub', traffic: 12.5 },
    { name: '伦敦 Hub', traffic: 9.8 },
    { name: '新加坡 Hub', traffic: 8.6 },
    { name: '法兰克福 Hub', traffic: 7.2 },
    { name: '东京 Spoke', traffic: 5.4 },
    { name: '香港', traffic: 4.8 },
    { name: '圣保罗 Hub', traffic: 4.2 },
    { name: '悉尼 Spoke', traffic: 3.6 },
];

/** 应用流量分布（中国/全球共享） */
const APP_TRAFFIC_PIE = [
    { name: '视频会议', value: 35, color: '#00d4ff' },
    { name: 'ERP/CRM', value: 22, color: '#00e88f' },
    { name: '文件传输', value: 18, color: '#ffdd00' },
    { name: 'Web 浏览', value: 13, color: '#9d4edd' },
    { name: '邮件', value: 8, color: '#ff9f43' },
    { name: '其他', value: 4, color: '#555e7a' },
];

/** 中国版环形图数据 */
const CHINA_RING_CHART = [
    { percent: 0.78, color: '#00e88f', label: '优秀 78%' },
    { percent: 0.16, color: '#00d4ff', label: '良好 16%' },
    { percent: 0.04, color: '#ff9f43', label: '警告 4%' },
    { percent: 0.02, color: '#ff4757', label: '故障 2%' },
];

/** 全球版环形图数据 */
const GLOBAL_RING_CHART = [
    { percent: 0.74, color: '#00e88f', label: '优秀 74%' },
    { percent: 0.19, color: '#00d4ff', label: '良好 19%' },
    { percent: 0.05, color: '#ff9f43', label: '警告 5%' },
    { percent: 0.02, color: '#ff4757', label: '故障 2%' },
];

/** 中国版滚动播报 */
const CHINA_TICKER = [
    { text: '全网状态：', status: 'ok', value: '运行正常' },
    { text: '北京Hub：', status: 'ok', value: '健康' },
    { text: '上海Hub：', status: 'ok', value: '健康' },
    { text: '广州Hub：', status: 'ok', value: '健康' },
    { text: '成都节点：', status: 'warn', value: '延迟偏高(38ms)' },
    { text: '全网流量：', status: 'ok', value: '12.8 Gbps' },
];

/** 全球版滚动播报 */
const GLOBAL_TICKER = [
    { text: '全网状态：', status: 'ok', value: '运行正常' },
    { text: '纽约Hub：', status: 'ok', value: '健康' },
    { text: '伦敦Hub：', status: 'ok', value: '健康' },
    { text: '新加坡Hub：', status: 'ok', value: '健康' },
    { text: '圣保罗链路：', status: 'warn', value: '延迟偏高(128ms)' },
    { text: '全网流量：', status: 'ok', value: '58.2 Gbps' },
];

/**
 * 获取指定模式的监控数据
 * @param {'china' | 'global'} mode - 监控模式
 * @returns {object} 该模式的完整监控数据
 */
export function getMonitorData(mode) {
    // 构建地图节点和链路
    const isChina = mode === 'china';
    const nodeConfig = isChina ? CHINA_NODES : GLOBAL_NODES;
    const { nodeList, linksData } = buildMapData(
        nodeConfig,
        isChina ? 15 : 14,
        isChina ? 8 : 8,
        isChina ? 18 : 85,
        isChina ? [4, 7] : [4, 7, 15, 22, 28],
        isChina ? [12] : [12, 31],
    );

    return {
        nodeList,
        linksData,
        stats: isChina
            ? {
                totalSites: 24, online: 23, tunnels: 186, bandwidth: '12.8', avgLatency: '12.3',
                alertCount: 7, alertCritical: 2, alertWarning: 5,
                currentTraffic: '9.2', trafficPeak: '15.6',
                normalTunnels: 182, totalTunnels: 186,
            }
            : {
                totalSites: 28, online: 26, tunnels: 312, bandwidth: '58.2', avgLatency: '38.4',
                alertCount: 12, alertCritical: 4, alertWarning: 8,
                currentTraffic: '41.5', trafficPeak: '72.8',
                normalTunnels: 304, totalTunnels: 312,
            },
        siteList: isChina ? CHINA_SITE_LIST : GLOBAL_SITE_LIST,
        bandwidthTop5: isChina ? CHINA_BANDWIDTH_TOP5 : GLOBAL_BANDWIDTH_TOP5,
        alerts: isChina ? CHINA_ALERTS : GLOBAL_ALERTS,
        ringChart: isChina ? CHINA_RING_CHART : GLOBAL_RING_CHART,
        tickerMessages: isChina ? CHINA_TICKER : GLOBAL_TICKER,
        trafficCurve: isChina ? CHINA_TRAFFIC_CURVE : GLOBAL_TRAFFIC_CURVE,
        siteTrafficRank: isChina ? CHINA_SITE_TRAFFIC_RANK : GLOBAL_SITE_TRAFFIC_RANK,
        appTrafficPie: APP_TRAFFIC_PIE,
    };
}
