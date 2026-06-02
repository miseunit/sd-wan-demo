"""
仪表板 API 测试用例
覆盖 Dashboard 数据获取、聚合统计等功能
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


class TestDashboardData:
    """Dashboard 数据获取相关测试"""

    def test_get_dashboard_empty(self, client):
        """获取空数据 Dashboard"""
        response = client.get("/api/v1/dashboard")

        assert response.status_code == 200
        data = unwrap(response)

        # 验证响应结构
        assert "healthScore" in data
        assert "stats" in data
        assert "sites" in data
        assert "links" in data
        assert "applications" in data
        assert "alerts" in data
        assert "ispBandwidth" in data

        # 验证统计数据
        assert data["stats"]["totalSites"] == 0
        assert data["stats"]["onlineSites"] == 0
        assert data["stats"]["offlineSites"] == 0

    def test_get_dashboard_with_sites(self, client):
        """获取有站点的 Dashboard 数据"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "dashboard-site-01",
            "displayName": "仪表板站点01",
            "region": "CN",
            "lat": 39.9,
            "lng": 116.4,
            "siteType": "branch"
        })
        client.post("/api/v1/sites/", json={
            "name": "dashboard-site-02",
            "displayName": "仪表板站点02",
            "region": "US",
            "lat": 37.8,
            "lng": -122.4,
            "siteType": "hq"
        })

        response = client.get("/api/v1/dashboard")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["stats"]["totalSites"] >= 2
        assert len(data["sites"]) >= 2

    def test_get_dashboard_health_score(self, client):
        """验证健康分数计算"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "health-site",
            "displayName": "健康站点",
            "region": "CN",
            "lat": 39.9,
            "lng": 116.4
        })

        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        # 健康分数应该在 0-100 之间
        assert 0 <= data["healthScore"] <= 100

    def test_get_dashboard_sites_structure(self, client):
        """验证站点数据结构"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "structure-site",
            "displayName": "结构站点",
            "region": "CN",
            "lat": 39.9,
            "lng": 116.4
        })

        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        if len(data["sites"]) > 0:
            site = data["sites"][0]
            # 验证站点字段
            assert "id" in site
            assert "name" in site
            assert "type" in site
            assert "status" in site
            assert "sla" in site
            assert "avgLatency" in site
            assert "region" in site

    def test_get_dashboard_alerts_structure(self, client):
        """验证告警数据结构"""
        # 创建站点和告警
        site_resp = client.post("/api/v1/sites/", json={
            "name": "alert-dashboard-site",
            "displayName": "告警仪表板站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "严重告警",
            "message": "严重告警内容",
            "sourceType": "site",
            "sourceId": site_id,
            "sourceName": "告警仪表板站点"
        })

        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            # 验证告警字段
            assert "id" in alert
            assert "severity" in alert
            assert "title" in alert
            assert "timestamp" in alert
            assert "category" in alert

    def test_get_dashboard_stats_accuracy(self, client):
        """验证统计数据准确性"""
        # 创建多个站点
        for i in range(5):
            client.post("/api/v1/sites/", json={
                "name": f"stats-site-{i}",
                "displayName": f"统计站点{i}",
                "region": "CN",
                "status": "online"
            })

        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        # 验证站点总数
        assert data["stats"]["totalSites"] >= 5

    def test_get_dashboard_links_with_topology(self, client):
        """验证链路拓扑数据"""
        # 创建站点
        site1_resp = client.post("/api/v1/sites/", json={
            "name": "topo-site-1",
            "displayName": "拓扑站点1",
            "region": "CN",
            "lat": 39.9,
            "lng": 116.4
        })
        site1_id = unwrap(site1_resp)["id"]

        site2_resp = client.post("/api/v1/sites/", json={
            "name": "topo-site-2",
            "displayName": "拓扑站点2",
            "region": "US",
            "lat": 37.8,
            "lng": -122.4
        })
        site2_id = unwrap(site2_resp)["id"]

        # 创建链路
        client.post("/api/v1/links/", json={
            "name": "topo-link",
            "type": "MPLS",
            "siteId": site1_id,
            "isp": "电信"
        })

        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        # 验证链路数据结构
        if len(data["links"]) > 0:
            link = data["links"][0]
            assert "id" in link
            assert "sourceId" in link
            assert "targetId" in link
            assert "avgLatency" in link
            assert "packetLoss" in link
            assert "health" in link

    def test_get_dashboard_isp_bandwidth(self, client):
        """验证 ISP 带宽数据"""
        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        # ISP 带宽数据应该存在
        assert "ispBandwidth" in data
        assert isinstance(data["ispBandwidth"], list)

    def test_get_dashboard_applications(self, client):
        """验证应用 SLA 数据"""
        response = client.get("/api/v1/dashboard")
        data = unwrap(response)

        # 应用数据应该存在
        assert "applications" in data
        assert isinstance(data["applications"], list)

    def test_get_dashboard_consistency(self, client):
        """验证多次请求数据一致性"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "consistent-site",
            "displayName": "一致性站点",
            "region": "CN"
        })

        # 第一次请求
        response1 = client.get("/api/v1/dashboard")
        data1 = unwrap(response1)

        # 第二次请求
        response2 = client.get("/api/v1/dashboard")
        data2 = unwrap(response2)

        # 站点总数应该一致
        assert data1["stats"]["totalSites"] == data2["stats"]["totalSites"]
