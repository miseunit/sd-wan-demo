/**
 * 路径探索选择器
 * 选择源站点、目的站点、应用类型，触发路径推荐
 */
import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, message } from 'antd';
import { SwapOutlined, AimOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { getSiteOptions, getAppTypes } from '../api';
import type { SiteOption, AppTypeOption } from '../types';

interface PathExplorerProps {
    /** 加载中 */
    loading: boolean;
    /** 开始选路回调 */
    onExplore: (sourceSiteId: string, destSiteId: string, appType?: string) => void;
}

/**
 * 路径探索选择器组件
 */
export default function PathExplorer({ loading, onExplore }: PathExplorerProps) {
    const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
    const [appTypes, setAppTypes] = useState<AppTypeOption[]>([]);
    const [sourceSiteId, setSourceSiteId] = useState<string | undefined>();
    const [destSiteId, setDestSiteId] = useState<string | undefined>();
    const [appType, setAppType] = useState<string | undefined>();
    const [sitesLoading, setSitesLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    /** 加载站点列表 */
    const fetchSites = useCallback(async () => {
        setSitesLoading(true);
        try {
            const data = await getSiteOptions();
            setSiteOptions(data);
        } catch {
            messageApi.error('加载站点列表失败');
        } finally {
            setSitesLoading(false);
        }
    }, [messageApi]);

    /** 加载应用类型 */
    const fetchAppTypes = useCallback(async () => {
        try {
            const data = await getAppTypes();
            setAppTypes(data);
        } catch {
            // 应用类型加载失败不影响主流程
        }
    }, []);

    useEffect(() => {
        fetchSites();
        fetchAppTypes();
    }, [fetchSites, fetchAppTypes]);

    /** 交换源/目的站点 */
    const handleSwap = useCallback(() => {
        setSourceSiteId(destSiteId);
        setDestSiteId(sourceSiteId);
    }, [sourceSiteId, destSiteId]);

    /** 开始选路 */
    const handleExplore = useCallback(() => {
        if (!sourceSiteId) {
            messageApi.warning('请选择源站点');
            return;
        }
        if (!destSiteId) {
            messageApi.warning('请选择目的站点');
            return;
        }
        onExplore(sourceSiteId, destSiteId, appType);
    }, [sourceSiteId, destSiteId, appType, onExplore, messageApi]);

    /** 站点下拉渲染（带区域标签） */
    const siteLabelRender = (option: SiteOption) => (
        <span>
            <Tag color="blue" style={{ margin: '0 6px 0 0', fontSize: 11 }}>
                {option.region}
            </Tag>
            {option.label}
        </span>
    );

    return (
        <div className="path-explorer">
            {contextHolder}

            <div className="path-explorer__selector">
                {/* 源站点 */}
                <div className="path-explorer__field">
                    <label className="path-explorer__label">
                        <AimOutlined /> 源站点
                    </label>
                    <Select
                        showSearch
                        placeholder="选择源站点"
                        loading={sitesLoading}
                        value={sourceSiteId}
                        onChange={setSourceSiteId}
                        style={{ width: 220 }}
                        options={siteOptions.map((s) => ({
                            ...s,
                            label: siteLabelRender(s),
                            searchText: `${s.label} ${s.region}`,
                        }))}
                        filterOption={(input, option) => {
                            const site = siteOptions.find((s) => s.value === option?.value);
                            return site
                                ? site.label.toLowerCase().includes(input.toLowerCase()) ||
                                      site.region.toLowerCase().includes(input.toLowerCase())
                                : false;
                        }}
                    />
                </div>

                {/* 交换按钮 */}
                <Button
                    type="text"
                    icon={<SwapOutlined />}
                    onClick={handleSwap}
                    className="path-explorer__swap"
                    title="交换源/目的"
                />

                {/* 目的站点 */}
                <div className="path-explorer__field">
                    <label className="path-explorer__label">
                        <AimOutlined /> 目的站点
                    </label>
                    <Select
                        showSearch
                        placeholder="选择目的站点"
                        loading={sitesLoading}
                        value={destSiteId}
                        onChange={setDestSiteId}
                        style={{ width: 220 }}
                        options={siteOptions.map((s) => ({
                            ...s,
                            label: siteLabelRender(s),
                            searchText: `${s.label} ${s.region}`,
                        }))}
                        filterOption={(input, option) => {
                            const site = siteOptions.find((s) => s.value === option?.value);
                            return site
                                ? site.label.toLowerCase().includes(input.toLowerCase()) ||
                                      site.region.toLowerCase().includes(input.toLowerCase())
                                : false;
                        }}
                    />
                </div>

                {/* 应用类型 */}
                <div className="path-explorer__field">
                    <label className="path-explorer__label">
                        <ThunderboltOutlined /> 应用类型
                    </label>
                    <Select
                        placeholder="全部应用（可选）"
                        allowClear
                        value={appType}
                        onChange={setAppType}
                        style={{ width: 180 }}
                        options={appTypes.map((t) => ({
                            value: t.value,
                            label: (
                                <span>
                                    <span style={{ marginRight: 6 }}>{t.icon}</span>
                                    {t.label}
                                </span>
                            ),
                        }))}
                    />
                </div>

                {/* 开始选路按钮 */}
                <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    loading={loading}
                    onClick={handleExplore}
                    className="path-explorer__btn"
                >
                    开始选路
                </Button>
            </div>
        </div>
    );
}
