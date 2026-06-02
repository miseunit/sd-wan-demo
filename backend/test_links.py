"""
链路管理 API 测试用例
覆盖 CRUD、切换、历史数据等功能
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


class TestLinkStats:
    """链路统计相关测试"""

    def test_get_stats_empty(self, client):
        """空数据统计"""
        response = client.get("/api/v1/links/stats")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["healthy"] == 0
        assert data["degraded"] == 0
        assert data["down"] == 0
        assert data["activeCount"] == 0

    def test_get_stats_with_links(self, client, sample_site):
        """有链路时的统计"""
        # 创建链路
        client.post("/api/v1/links/", json={
            "name": "test-link",
            "type": "MPLS",
            "siteId": sample_site["id"],
            "isp": "电信"
        })

        response = client.get("/api/v1/links/stats")
        data = unwrap(response)
        assert data["total"] >= 1

    def test_get_site_names(self, client, sample_site):
        """获取站点名称列表"""
        response = client.get("/api/v1/links/site-names")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestLinkCreate:
    """链路创建相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "link-site",
            "displayName": "链路站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_create_link_success(self, client, sample_site):
        """正常创建链路"""
        response = client.post("/api/v1/links/", json={
            "name": "MPLS-01",
            "type": "MPLS",
            "siteId": sample_site["id"],
            "isp": "中国电信",
            "ip": "10.0.1.1"
        })

        assert response.status_code == 201
        data = unwrap(response)
        assert data["name"] == "MPLS-01"
        assert data["type"] == "MPLS"
        assert "id" in data

    def test_create_link_missing_name(self, client, sample_site):
        """缺少必填字段 name"""
        response = client.post("/api/v1/links/", json={
            "type": "MPLS",
            "siteId": sample_site["id"]
        })
        assert response.status_code == 422

    def test_create_link_missing_type(self, client, sample_site):
        """缺少必填字段 type"""
        response = client.post("/api/v1/links/", json={
            "name": "test-link",
            "siteId": sample_site["id"]
        })
        assert response.status_code == 422

    def test_create_link_missing_site_id(self, client):
        """缺少必填字段 siteId"""
        response = client.post("/api/v1/links/", json={
            "name": "test-link",
            "type": "MPLS"
        })
        assert response.status_code == 422

    def test_create_link_invalid_site(self, client):
        """站点不存在"""
        response = client.post("/api/v1/links/", json={
            "name": "test-link",
            "type": "MPLS",
            "siteId": "nonexistent-site"
        })
        assert response.status_code == 404


class TestLinkList:
    """链路列表相关测试"""

    @pytest.fixture
    def sample_links(self, client):
        """创建示例链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "link-list-site",
            "displayName": "链路列表站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建不同类型的链路
        client.post("/api/v1/links/", json={
            "name": "MPLS-01",
            "type": "MPLS",
            "siteId": site_id,
            "isp": "电信"
        })
        client.post("/api/v1/links/", json={
            "name": "Internet-01",
            "type": "Internet",
            "siteId": site_id,
            "isp": "联通"
        })
        return site_id

    def test_list_links_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/links/")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_links_with_data(self, client, sample_links):
        """有数据的列表"""
        response = client.get("/api/v1/links/")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] >= 2

    def test_list_links_pagination(self, client):
        """分页测试"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "pagination-site",
            "displayName": "分页站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建 15 条链路
        for i in range(15):
            client.post("/api/v1/links/", json={
                "name": f"link-{i:02d}",
                "type": "Internet",
                "siteId": site_id
            })

        # 第一页
        response = client.get("/api/v1/links/?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/links/?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_links_filter_type(self, client, sample_links):
        """按类型筛选"""
        response = client.get("/api/v1/links/?type=MPLS")
        data = unwrap(response)
        assert data["total"] >= 1
        for link in data["items"]:
            assert link["type"] == "MPLS"

    def test_list_links_filter_health_status(self, client):
        """按健康状态筛选"""
        # 创建站点和链路
        site_resp = client.post("/api/v1/sites/", json={
            "name": "health-site",
            "displayName": "健康站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        client.post("/api/v1/links/", json={
            "name": "healthy-link",
            "type": "MPLS",
            "siteId": site_id
        })

        response = client.get("/api/v1/links/?healthStatus=healthy")
        data = unwrap(response)
        assert data["total"] >= 1

    def test_list_links_search(self, client, sample_links):
        """搜索链路"""
        response = client.get("/api/v1/links/?search=MPLS")
        data = unwrap(response)
        assert data["total"] >= 1


class TestLinkDetail:
    """链路详情相关测试"""

    @pytest.fixture
    def sample_link(self, client):
        """创建示例链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "detail-link-site",
            "displayName": "详情链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建链路
        response = client.post("/api/v1/links/", json={
            "name": "detail-link",
            "type": "MPLS",
            "siteId": site_id,
            "isp": "电信"
        })
        return unwrap(response)

    def test_get_link_success(self, client, sample_link):
        """获取链路详情"""
        link_id = sample_link["id"]

        response = client.get(f"/api/v1/links/{link_id}")
        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "detail-link"
        assert "switchHistory" in data
        assert "alerts" in data

    def test_get_link_not_found(self, client):
        """链路不存在"""
        response = client.get("/api/v1/links/nonexistent-id")
        assert response.status_code == 404


class TestLinkUpdate:
    """链路更新相关测试"""

    @pytest.fixture
    def sample_link(self, client):
        """创建示例链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "update-link-site",
            "displayName": "更新链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建链路
        response = client.post("/api/v1/links/", json={
            "name": "update-link",
            "type": "MPLS",
            "siteId": site_id
        })
        return unwrap(response)

    def test_update_link_success(self, client, sample_link):
        """正常更新链路"""
        link_id = sample_link["id"]

        response = client.put(f"/api/v1/links/{link_id}", json={
            "name": "updated-link"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "updated-link"

    def test_update_link_not_found(self, client):
        """更新不存在的链路"""
        response = client.put("/api/v1/links/nonexistent-id", json={
            "name": "updated"
        })
        assert response.status_code == 404


class TestLinkDelete:
    """链路删除相关测试"""

    @pytest.fixture
    def sample_link(self, client):
        """创建示例链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "delete-link-site",
            "displayName": "删除链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建链路
        response = client.post("/api/v1/links/", json={
            "name": "delete-link",
            "type": "MPLS",
            "siteId": site_id
        })
        return unwrap(response)

    def test_delete_link_success(self, client, sample_link):
        """正常删除链路"""
        link_id = sample_link["id"]

        # 删除
        response = client.delete(f"/api/v1/links/{link_id}")
        assert response.status_code == 204

        # 确认已删除
        get_resp = client.get(f"/api/v1/links/{link_id}")
        assert get_resp.status_code == 404

    def test_delete_link_not_found(self, client):
        """删除不存在的链路"""
        response = client.delete("/api/v1/links/nonexistent-id")
        assert response.status_code == 404


class TestLinkHistory:
    """链路历史数据相关测试"""

    @pytest.fixture
    def sample_link(self, client):
        """创建示例链路"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "history-link-site",
            "displayName": "历史链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建链路
        response = client.post("/api/v1/links/", json={
            "name": "history-link",
            "type": "MPLS",
            "siteId": site_id
        })
        return unwrap(response)

    def test_get_link_history_5min(self, client, sample_link):
        """获取5分钟历史数据"""
        link_id = sample_link["id"]

        response = client.get(f"/api/v1/links/{link_id}/history?timeRange=5min")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_link_history_1hour(self, client, sample_link):
        """获取1小时历史数据"""
        link_id = sample_link["id"]

        response = client.get(f"/api/v1/links/{link_id}/history?timeRange=1hour")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_link_history_24hour(self, client, sample_link):
        """获取24小时历史数据"""
        link_id = sample_link["id"]

        response = client.get(f"/api/v1/links/{link_id}/history?timeRange=24hour")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_link_history_invalid_range(self, client, sample_link):
        """无效的时间范围"""
        link_id = sample_link["id"]

        response = client.get(f"/api/v1/links/{link_id}/history?timeRange=invalid")
        assert response.status_code == 400


class TestLinkSwitch:
    """链路切换相关测试"""

    @pytest.fixture
    def sample_links(self, client):
        """创建多条链路用于切换测试"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "switch-link-site",
            "displayName": "切换链路站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建主链路
        main_resp = client.post("/api/v1/links/", json={
            "name": "main-link",
            "type": "MPLS",
            "siteId": site_id,
            "isp": "电信"
        })
        main_link = unwrap(main_resp)

        # 创建备用链路
        backup_resp = client.post("/api/v1/links/", json={
            "name": "backup-link",
            "type": "Internet",
            "siteId": site_id,
            "isp": "联通"
        })
        backup_link = unwrap(backup_resp)

        return {"site_id": site_id, "main": main_link, "backup": backup_link}

    def test_switch_link_success(self, client, sample_links):
        """正常切换链路"""
        link_id = sample_links["backup"]["id"]

        response = client.post(f"/api/v1/links/{link_id}/switch")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_switch_link_not_found(self, client):
        """切换不存在的链路"""
        response = client.post("/api/v1/links/nonexistent-id/switch")
        assert response.status_code == 404
