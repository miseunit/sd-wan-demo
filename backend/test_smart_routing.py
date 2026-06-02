"""
智能路由 API 测试用例
覆盖路径推荐、应用类型查询、链路实况等功能
"""
import pytest


def unwrap(response):
    """
    解包统一响应格式，返回 data 字段
    """
    json_data = response.json()
    if isinstance(json_data, dict) and "code" in json_data and "data" in json_data:
        return json_data["data"]
    return json_data


class TestAppTypes:
    """应用类型相关测试"""

    def test_get_app_types(self, client):
        """获取应用类型列表"""
        response = client.get("/api/v1/smart-routing/app-types")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # 验证常见应用类型
        app_types = {app["value"] for app in data}
        assert "voip" in app_types
        assert "video_conference" in app_types
        assert "web_browsing" in app_types

    def test_app_types_structure(self, client):
        """验证应用类型数据结构"""
        response = client.get("/api/v1/smart-routing/app-types")
        data = response.json()

        if len(data) > 0:
            app = data[0]
            assert "value" in app
            assert "label" in app
            assert "icon" in app


class TestPathRecommendation:
    """路径推荐相关测试"""

    @pytest.fixture
    def sample_sites_and_links(self, client):
        """创建示例站点和链路"""
        # 创建源站点
        source_resp = client.post("/api/v1/sites/", json={
            "name": "source-site",
            "displayName": "源站点",
            "region": "CN",
            "lat": 39.9,
            "lng": 116.4
        })
        source_site_id = unwrap(source_resp)["id"]

        # 创建目的站点
        dest_resp = client.post("/api/v1/sites/", json={
            "name": "dest-site",
            "displayName": "目的站点",
            "region": "US",
            "lat": 37.8,
            "lng": -122.4
        })
        dest_site_id = unwrap(dest_resp)["id"]

        # 为源站点创建链路
        client.post("/api/v1/links/", json={
            "name": "source-mpls",
            "type": "MPLS",
            "siteId": source_site_id,
            "isp": "电信",
            "healthStatus": "healthy",
            "latency": 20,
            "loss": 0.01,
            "bandwidth": 100
        })

        # 为目的站点创建链路
        client.post("/api/v1/links/", json={
            "name": "dest-mpls",
            "type": "MPLS",
            "siteId": dest_site_id,
            "isp": "电信",
            "healthStatus": "healthy",
            "latency": 25,
            "loss": 0.02,
            "bandwidth": 100
        })

        return {
            "source_site_id": source_site_id,
            "dest_site_id": dest_site_id
        }

    def test_recommend_path_success(self, client, sample_sites_and_links):
        """正常路径推荐"""
        source_id = sample_sites_and_links["source_site_id"]
        dest_id = sample_sites_and_links["dest_site_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}"
        )

        assert response.status_code == 200
        data = unwrap(response)

        assert data["sourceSiteId"] == source_id
        assert data["destSiteId"] == dest_id
        assert "paths" in data
        assert isinstance(data["paths"], list)

    def test_recommend_path_with_app_type(self, client, sample_sites_and_links):
        """带应用类型的路径推荐"""
        source_id = sample_sites_and_links["source_site_id"]
        dest_id = sample_sites_and_links["dest_site_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}&appType=voip"
        )

        assert response.status_code == 200
        data = unwrap(response)
        assert data["appType"] == "voip"

    def test_recommend_path_missing_source_site(self, client):
        """缺少源站点ID"""
        response = client.get("/api/v1/smart-routing/recommend?destSiteId=site-001")
        assert response.status_code == 422

    def test_recommend_path_missing_dest_site(self, client):
        """缺少目的站点ID"""
        response = client.get("/api/v1/smart-routing/recommend?sourceSiteId=site-001")
        assert response.status_code == 422

    def test_recommend_path_source_not_found(self, client):
        """源站点不存在"""
        response = client.get(
            "/api/v1/smart-routing/recommend?sourceSiteId=nonexistent&destSiteId=site-001"
        )
        assert response.status_code == 404

    def test_recommend_path_dest_not_found(self, client):
        """目的站点不存在"""
        # 创建源站点
        source_resp = client.post("/api/v1/sites/", json={
            "name": "test-source",
            "displayName": "测试源站点",
            "region": "CN"
        })
        source_id = unwrap(source_resp)["id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId=nonexistent"
        )
        assert response.status_code == 404

    def test_recommend_path_same_site(self, client):
        """源站点和目的站点相同"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "same-site",
            "displayName": "相同站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={site_id}&destSiteId={site_id}"
        )
        assert response.status_code == 400

    def test_recommend_path_structure(self, client, sample_sites_and_links):
        """验证推荐路径数据结构"""
        source_id = sample_sites_and_links["source_site_id"]
        dest_id = sample_sites_and_links["dest_site_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}"
        )
        data = unwrap(response)

        if len(data["paths"]) > 0:
            path = data["paths"][0]
            # 验证路径字段
            assert "rank" in path
            assert "label" in path
            assert "color" in path
            assert "links" in path
            assert "totalLatency" in path
            assert "maxLoss" in path
            assert "minBandwidth" in path
            assert "avgSlaScore" in path
            assert "reason" in path

    def test_recommend_path_top3(self, client, sample_sites_and_links):
        """验证返回Top3路径"""
        source_id = sample_sites_and_links["source_site_id"]
        dest_id = sample_sites_and_links["dest_site_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}"
        )
        data = unwrap(response)

        # 最多返回3条路径
        assert len(data["paths"]) <= 3


class TestSourceLinks:
    """源站点链路实况相关测试"""

    @pytest.fixture
    def sample_site_with_links(self, client):
        """创建带链路的站点"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "links-site",
            "displayName": "链路实况站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建链路
        client.post("/api/v1/links/", json={
            "name": "mpls-link",
            "type": "MPLS",
            "siteId": site_id,
            "isp": "电信"
        })
        client.post("/api/v1/links/", json={
            "name": "internet-link",
            "type": "Internet",
            "siteId": site_id,
            "isp": "联通"
        })

        return site_id

    def test_get_source_links_success(self, client, sample_site_with_links):
        """获取站点链路实况"""
        response = client.get(f"/api/v1/smart-routing/source-links?siteId={sample_site_with_links}")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_get_source_links_missing_site_id(self, client):
        """缺少站点ID"""
        response = client.get("/api/v1/smart-routing/source-links")
        assert response.status_code == 422

    def test_get_source_links_not_found(self, client):
        """站点不存在"""
        response = client.get("/api/v1/smart-routing/source-links?siteId=nonexistent")
        assert response.status_code == 404

    def test_get_source_links_structure(self, client, sample_site_with_links):
        """验证链路实况数据结构"""
        response = client.get(f"/api/v1/smart-routing/source-links?siteId={sample_site_with_links}")
        data = response.json()

        if len(data) > 0:
            link = data[0]
            # 验证链路字段
            assert "id" in link
            assert "name" in link
            assert "type" in link
            assert "isp" in link
            assert "healthStatus" in link
            assert "activeStatus" in link
            assert "latency" in link
            assert "loss" in link
            assert "bandwidth" in link
            assert "slaScore" in link

    def test_get_source_links_empty(self, client):
        """站点没有链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "no-links-site",
            "displayName": "无链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        response = client.get(f"/api/v1/smart-routing/source-links?siteId={site_id}")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestPathScoring:
    """路径评分相关测试"""

    @pytest.fixture
    def sample_sites_for_scoring(self, client):
        """创建用于评分测试的站点和链路"""
        # 创建源站点
        source_resp = client.post("/api/v1/sites/", json={
            "name": "scoring-source",
            "displayName": "评分源站点",
            "region": "CN"
        })
        source_id = unwrap(source_resp)["id"]

        # 创建目的站点
        dest_resp = client.post("/api/v1/sites/", json={
            "name": "scoring-dest",
            "displayName": "评分目的站点",
            "region": "US"
        })
        dest_id = unwrap(dest_resp)["id"]

        # 创建低质量链路
        client.post("/api/v1/links/", json={
            "name": "poor-link",
            "type": "Internet",
            "siteId": source_id,
            "healthStatus": "degraded",
            "latency": 200,
            "loss": 2.0,
            "bandwidth": 10
        })

        # 创建高质量链路
        client.post("/api/v1/links/", json={
            "name": "good-link",
            "type": "MPLS",
            "siteId": source_id,
            "healthStatus": "healthy",
            "latency": 10,
            "loss": 0.01,
            "bandwidth": 100
        })

        return {"source_id": source_id, "dest_id": dest_id}

    def test_path_scoring_with_voip(self, client, sample_sites_for_scoring):
        """VoIP 应用的路径评分"""
        source_id = sample_sites_for_scoring["source_id"]
        dest_id = sample_sites_for_scoring["dest_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}&appType=voip"
        )
        data = unwrap(response)

        # 验证路径已排序（分数从高到低）
        if len(data["paths"]) >= 2:
            assert data["paths"][0]["avgSlaScore"] >= data["paths"][1]["avgSlaScore"]

    def test_path_scoring_with_video(self, client, sample_sites_for_scoring):
        """视频会议应用的路径评分"""
        source_id = sample_sites_for_scoring["source_id"]
        dest_id = sample_sites_for_scoring["dest_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}&appType=video_conference"
        )
        data = unwrap(response)

        # 验证返回路径
        assert len(data["paths"]) >= 1

    def test_path_reason_generation(self, client, sample_sites_for_scoring):
        """验证推荐理由生成"""
        source_id = sample_sites_for_scoring["source_id"]
        dest_id = sample_sites_for_scoring["dest_id"]

        response = client.get(
            f"/api/v1/smart-routing/recommend?sourceSiteId={source_id}&destSiteId={dest_id}"
        )
        data = unwrap(response)

        # 验证每条路径都有理由
        for path in data["paths"]:
            assert path["reason"] != ""
