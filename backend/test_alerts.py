"""
告警管理 API 测试用例
覆盖 CRUD、统计、筛选等功能
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


class TestAlertCreate:
    """告警创建相关测试"""

    def test_create_alert_success(self, client):
        """正常创建告警"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "alert-site",
            "displayName": "告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        response = client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "链路中断",
            "message": "主链路连接中断",
            "sourceType": "site",
            "sourceId": site_id,
            "sourceName": "告警站点",
            "region": "CN",
            "metricType": "latency",
            "metricValue": 500.0,
            "threshold": 100.0
        })

        assert response.status_code == 201
        data = unwrap(response)
        assert data["level"] == "critical"
        assert data["title"] == "链路中断"
        assert "id" in data

    def test_create_alert_missing_level(self, client):
        """缺少必填字段 level"""
        response = client.post("/api/v1/alerts/", json={
            "title": "测试告警",
            "message": "测试内容",
            "sourceType": "site",
            "sourceId": "site-001"
        })
        assert response.status_code == 422

    def test_create_alert_missing_title(self, client):
        """缺少必填字段 title"""
        response = client.post("/api/v1/alerts/", json={
            "level": "critical",
            "message": "测试内容",
            "sourceType": "site",
            "sourceId": "site-001"
        })
        assert response.status_code == 422

    def test_create_alert_invalid_level(self, client):
        """无效的告警等级"""
        response = client.post("/api/v1/alerts/", json={
            "level": "invalid",
            "title": "测试告警",
            "message": "测试内容",
            "sourceType": "site",
            "sourceId": "site-001"
        })
        assert response.status_code == 400

    def test_create_alert_invalid_source_type(self, client):
        """无效的来源类型"""
        response = client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "测试告警",
            "message": "测试内容",
            "sourceType": "invalid",
            "sourceId": "site-001"
        })
        assert response.status_code == 400

    def test_create_alert_short_title(self, client):
        """标题太短（小于2字符）"""
        response = client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "告",
            "message": "测试内容",
            "sourceType": "site",
            "sourceId": "site-001"
        })
        assert response.status_code == 422


class TestAlertList:
    """告警列表相关测试"""

    @pytest.fixture
    def sample_alerts(self, client):
        """创建示例告警"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "alert-list-site",
            "displayName": "告警列表站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建不同等级的告警
        client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "严重告警",
            "message": "严重告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })
        client.post("/api/v1/alerts/", json={
            "level": "warning",
            "title": "警告告警",
            "message": "警告告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })
        client.post("/api/v1/alerts/", json={
            "level": "info",
            "title": "信息告警",
            "message": "信息告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })
        return site_id

    def test_list_alerts_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/alerts/")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_alerts_with_data(self, client, sample_alerts):
        """有数据的列表"""
        response = client.get("/api/v1/alerts/")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] >= 3

    def test_list_alerts_pagination(self, client):
        """分页测试"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "pagination-alert-site",
            "displayName": "分页告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建 15 条告警
        for i in range(15):
            client.post("/api/v1/alerts/", json={
                "level": "warning",
                "title": f"告警{i:02d}",
                "message": f"告警内容{i:02d}",
                "sourceType": "site",
                "sourceId": site_id
            })

        # 第一页
        response = client.get("/api/v1/alerts/?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/alerts/?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_alerts_filter_level(self, client, sample_alerts):
        """按等级筛选"""
        response = client.get("/api/v1/alerts/?level=critical")
        data = unwrap(response)
        assert data["total"] >= 1
        for alert in data["items"]:
            assert alert["level"] == "critical"

    def test_list_alerts_filter_status(self, client):
        """按状态筛选"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "status-alert-site",
            "displayName": "状态告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建不同状态的告警
        client.post("/api/v1/alerts/", json={
            "level": "warning",
            "title": "新告警",
            "message": "新告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })

        response = client.get("/api/v1/alerts/?status=new")
        data = unwrap(response)
        assert data["total"] >= 1

    def test_list_alerts_filter_source_type(self, client, sample_alerts):
        """按来源类型筛选"""
        response = client.get("/api/v1/alerts/?sourceType=site")
        data = unwrap(response)
        assert data["total"] >= 1
        for alert in data["items"]:
            assert alert["sourceType"] == "site"

    def test_list_alerts_search(self, client, sample_alerts):
        """搜索告警"""
        response = client.get("/api/v1/alerts/?search=严重")
        data = unwrap(response)
        assert data["total"] >= 1


class TestAlertDetail:
    """告警详情相关测试"""

    @pytest.fixture
    def sample_alert(self, client):
        """创建示例告警"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "detail-alert-site",
            "displayName": "详情告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建告警
        response = client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "详情告警",
            "message": "详情告警内容",
            "sourceType": "site",
            "sourceId": site_id,
            "sourceName": "详情站点"
        })
        return unwrap(response)

    def test_get_alert_success(self, client, sample_alert):
        """获取告警详情"""
        alert_id = sample_alert["id"]

        response = client.get(f"/api/v1/alerts/{alert_id}")
        assert response.status_code == 200
        data = unwrap(response)
        assert data["title"] == "详情告警"
        assert "timeline" in data

    def test_get_alert_not_found(self, client):
        """告警不存在"""
        response = client.get("/api/v1/alerts/999999")
        assert response.status_code == 404


class TestAlertUpdate:
    """告警更新相关测试"""

    @pytest.fixture
    def sample_alert(self, client):
        """创建示例告警"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "update-alert-site",
            "displayName": "更新告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建告警
        response = client.post("/api/v1/alerts/", json={
            "level": "warning",
            "title": "更新告警",
            "message": "更新告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })
        return unwrap(response)

    def test_update_alert_success(self, client, sample_alert):
        """正常更新告警"""
        alert_id = sample_alert["id"]

        response = client.put(f"/api/v1/alerts/{alert_id}", json={
            "status": "acknowledged",
            "acknowledgedBy": "admin",
            "remark": "已确认处理"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["status"] == "acknowledged"

    def test_update_alert_not_found(self, client):
        """更新不存在的告警"""
        response = client.put("/api/v1/alerts/999999", json={
            "status": "acknowledged"
        })
        assert response.status_code == 404

    def test_update_alert_invalid_status(self, client, sample_alert):
        """无效的状态"""
        alert_id = sample_alert["id"]

        response = client.put(f"/api/v1/alerts/{alert_id}", json={
            "status": "invalid_status"
        })
        assert response.status_code == 400


class TestAlertDelete:
    """告警删除相关测试"""

    @pytest.fixture
    def sample_alert(self, client):
        """创建示例告警"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "delete-alert-site",
            "displayName": "删除告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建告警
        response = client.post("/api/v1/alerts/", json={
            "level": "info",
            "title": "删除告警",
            "message": "删除告警内容",
            "sourceType": "site",
            "sourceId": site_id
        })
        return unwrap(response)

    def test_delete_alert_success(self, client, sample_alert):
        """正常删除告警"""
        alert_id = sample_alert["id"]

        # 删除
        response = client.delete(f"/api/v1/alerts/{alert_id}")
        assert response.status_code == 204

        # 确认已删除
        get_resp = client.get(f"/api/v1/alerts/{alert_id}")
        assert get_resp.status_code == 404

    def test_delete_alert_not_found(self, client):
        """删除不存在的告警"""
        response = client.delete("/api/v1/alerts/999999")
        assert response.status_code == 404


class TestAlertStats:
    """告警统计相关测试"""

    def test_get_stats_empty(self, client):
        """空数据统计"""
        response = client.get("/api/v1/alerts/stats")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["critical"] == 0
        assert data["warning"] == 0
        assert data["info"] == 0

    def test_get_stats_with_alerts(self, client):
        """有告警时的统计"""
        # 创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "stats-alert-site",
            "displayName": "统计告警站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        # 创建不同等级的告警
        client.post("/api/v1/alerts/", json={
            "level": "critical",
            "title": "严重告警",
            "message": "严重",
            "sourceType": "site",
            "sourceId": site_id
        })
        client.post("/api/v1/alerts/", json={
            "level": "warning",
            "title": "警告告警",
            "message": "警告",
            "sourceType": "site",
            "sourceId": site_id
        })

        response = client.get("/api/v1/alerts/stats")
        data = unwrap(response)
        assert data["total"] >= 2
        assert data["critical"] >= 1
        assert data["warning"] >= 1
