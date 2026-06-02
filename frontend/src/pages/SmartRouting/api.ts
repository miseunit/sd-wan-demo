/**
 * 智能选路 - API 服务层
 * 通过 vite proxy 调用后端 /api/v1/smart-routing 接口
 */
import { get } from '../../services/api';
import type {
    AppTypeOption,
    PathRecommendation,
    LinkQuality,
    SiteOption,
} from './types';

/**
 * 获取应用类型列表
 */
export async function getAppTypes(): Promise<AppTypeOption[]> {
    return get('/smart-routing/app-types');
}

/**
 * 获取推荐路径
 * @param sourceSiteId - 源站点ID
 * @param destSiteId - 目的站点ID
 * @param appType - 应用类型（可选）
 */
export async function recommendPath(
    sourceSiteId: string,
    destSiteId: string,
    appType?: string,
): Promise<PathRecommendation> {
    let url = `/smart-routing/recommend?sourceSiteId=${encodeURIComponent(sourceSiteId)}&destSiteId=${encodeURIComponent(destSiteId)}`;
    if (appType) {
        url += `&appType=${encodeURIComponent(appType)}`;
    }
    return get(url);
}

/**
 * 获取源站点链路实况
 * @param siteId - 站点ID
 */
export async function getSourceLinks(siteId: string): Promise<LinkQuality[]> {
    return get(`/smart-routing/source-links?siteId=${encodeURIComponent(siteId)}`);
}

/**
 * 获取站点列表（用于下拉选择）
 * 复用站点管理接口
 */
export async function getSiteOptions(): Promise<SiteOption[]> {
    const data = await get('/sites/?pageSize=500');
    const items = data && typeof data === 'object' && 'items' in data ? data.items : data;
    return items.map((site: { id: string; displayName: string; region: string; status: string }) => ({
        value: site.id,
        label: site.displayName,
        region: site.region,
        status: site.status,
    }));
}
