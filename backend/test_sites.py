"""
站点管理 API 测试用例
覆盖 CRUD、批量操作、链路切换等功能
"""
import pytest
import time


def unwrap(response):
    """
    解包统一响应格式，返回 data 字段
    """
    json_data = response.json()
    if isinstance(json_data, dict) and "code" in json_data and "data" in json_data:
        return json_data["data"]
    return json_data


class TestSiteStats:
    """站点统计相关测试"""

    def test_get_stats_empty(self, client):
        """空数据统计"""
        response = client.get("/api/v1/sites/stats")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["online"] == 0
        assert data["offline"] == 0
        assert data["warning"] == 0
        assert data["alertCount"] == 0

    def test_get_stats_with_sites(self, client, sample_site_data):
        """有站点时的统计"""
        # 创建站点
        client.post("/api/v1/sites/", json=sample_site_data)

        response = client.get("/api/v1/sites/stats")
        data = unwrap(response)
        assert data["total"] >= 1


class TestSiteCreate:
    """站点创建相关测试"""

    @pytest.fixture
    def sample_site_data(self):
        """示例站点数据"""
        return {
            "name": "test-site-01",
            "displayName": "测试站点01",
            "region": "CN",
            "siteType": "branch"
        }

    def test_create_site_success(self, client, sample_site_data):
        """正常创建站点"""
        response = client.post("/api/v1/sites/", json=sample_site_data)

        assert response.status_code in [200, 201]
        data = unwrap(response)
        assert data["name"] == "test-site-01"
        assert data["displayName"] == "测试站点01"
        assert data["region"] == "CN"
        assert "id" in data

    def test_create_site_missing_name(self, client):
        """缺少必填字段 name"""
        response = client.post("/api/v1/sites/", json={
            "displayName": "测试站点",
            "region": "CN"
        })
        assert response.status_code == 422

    def test_create_site_missing_display_name(self, client):
        """缺少必填字段 displayName"""
        response = client.post("/api/v1/sites/", json={
            "name": "test-site",
            "region": "CN"
        })
        assert response.status_code == 422

    def test_create_site_missing_region(self, client):
        """缺少必填字段 region"""
        response = client.post("/api/v1/sites/", json={
            "name": "test-site",
            "displayName": "测试站点"
        })
        assert response.status_code == 422

    def test_create_site_duplicate_name(self, client, sample_site_data):
        """站点名称重复"""
        # 创建第一个站点
        client.post("/api/v1/sites/", json=sample_site_data)

        # 创建同名站点
        response = client.post("/api/v1/sites/", json=sample_site_data)
        assert response.status_code == 400

    def test_create_site_with_wan_interfaces(self, client):
        """创建带 WAN 接口配置的站点"""
        site_data = {
            "name": "site-with-wan",
            "displayName": "带WAN站点",
            "region": "CN",
            "wanInterfaces": [
                {
                    "name": "WAN1",
                    "interfaceType": "WAN",
                    "ipAddress": "192.168.1.1",
                    "subnetMask": "255.255.255.0",
                    "gateway": "192.168.1.254",
                    "speed": "1Gbps"
                },
                {
                    "name": "WAN2",
                    "interfaceType": "Internet",
                    "ipAddress": "192.168.2.1",
                    "subnetMask": "255.255.255.0",
                    "gateway": "192.168.2.254",
                    "speed": "100Mbps"
                }
            ]
        }

        response = client.post("/api/v1/sites/", json=site_data)
        assert response.status_code in [200, 201]
        data = unwrap(response)
        assert data["name"] == "site-with-wan"


class TestSiteList:
    """站点列表相关测试"""

    @pytest.fixture
    def sample_site_data(self):
        """示例站点数据"""
        return {
            "name": "test-site-01",
            "displayName": "测试站点01",
            "region": "CN",
            "siteType": "branch"
        }

    def test_list_sites_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/sites/")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_sites_with_data(self, client, sample_site_data):
        """有数据的列表"""
        # 创建站点
        client.post("/api/v1/sites/", json=sample_site_data)

        response = client.get("/api/v1/sites/")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] >= 1

    def test_list_sites_pagination(self, client, sample_site_data):
        """分页测试"""
        # 创建 15 个站点
        for i in range(15):
            client.post("/api/v1/sites/", json={
                "name": f"site-{i:02d}",
                "displayName": f"站点{i:02d}",
                "region": "CN"
            })

        # 第一页
        response = client.get("/api/v1/sites/?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/sites/?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_sites_filter_region(self, client):
        """按区域筛选"""
        # 创建不同区域的站点
        client.post("/api/v1/sites/", json={
            "name": "site-cn",
            "displayName": "中国站点",
            "region": "CN"
        })
        client.post("/api/v1/sites/", json={
            "name": "site-us",
            "displayName": "美国站点",
            "region": "US"
        })

        response = client.get("/api/v1/sites/?region=CN")
        data = unwrap(response)
        assert data["total"] >= 1
        for site in data["items"]:
            assert site["region"] == "CN"

    def test_list_sites_filter_status(self, client):
        """按状态筛选"""
        # 创建不同状态的站点
        client.post("/api/v1/sites/", json={
            "name": "site-online",
            "displayName": "在线站点",
            "region": "CN",
            "status": "online"
        })
        client.post("/api/v1/sites/", json={
            "name": "site-offline",
            "displayName": "离线站点",
            "region": "CN",
            "status": "offline"
        })

        response = client.get("/api/v1/sites/?status=online")
        data = unwrap(response)
        assert data["total"] >= 1
        for site in data["items"]:
            assert site["status"] == "online"

    def test_list_sites_search(self, client):
        """搜索站点"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "beijing-001",
            "displayName": "北京站点001",
            "region": "CN"
        })

        response = client.get("/api/v1/sites/?search=北京")
        data = unwrap(response)
        assert data["total"] >= 1


class TestSiteDetail:
    """站点详情相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "detail-site",
            "displayName": "详情站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_get_site_success(self, client, sample_site):
        """获取站点详情"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}")
        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "detail-site"

    def test_get_site_not_found(self, client):
        """站点不存在"""
        response = client.get("/api/v1/sites/nonexistent-id")
        assert response.status_code == 404


class TestSiteUpdate:
    """站点更新相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "update-site",
            "displayName": "更新站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_update_site_success(self, client, sample_site):
        """正常更新站点"""
        site_id = sample_site["id"]

        response = client.put(f"/api/v1/sites/{site_id}", json={
            "displayName": "更新后的站点名称"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["displayName"] == "更新后的站点名称"

    def test_update_site_not_found(self, client):
        """更新不存在的站点"""
        response = client.put("/api/v1/sites/nonexistent-id", json={
            "displayName": "更新"
        })
        assert response.status_code == 404


class TestSiteDelete:
    """站点删除相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "delete-site",
            "displayName": "删除站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_delete_site_success(self, client, sample_site):
        """正常删除站点"""
        site_id = sample_site["id"]

        # 删除
        response = client.delete(f"/api/v1/sites/{site_id}")
        assert response.status_code == 204

        # 确认已删除
        get_resp = client.get(f"/api/v1/sites/{site_id}")
        assert get_resp.status_code == 404

    def test_delete_site_not_found(self, client):
        """删除不存在的站点"""
        response = client.delete("/api/v1/sites/nonexistent-id")
        assert response.status_code == 404


class TestSiteHistory:
    """站点历史数据相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "history-site",
            "displayName": "历史站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_get_site_history_5min(self, client, sample_site):
        """获取5分钟历史数据"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/history?time_range=5min")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_site_history_1hour(self, client, sample_site):
        """获取1小时历史数据"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/history?time_range=1hour")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_site_history_24hour(self, client, sample_site):
        """获取24小时历史数据"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/history?time_range=24hour")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_site_history_invalid_range(self, client, sample_site):
        """无效的时间范围"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/history?time_range=invalid")
        assert response.status_code == 400


class TestBatchAction:
    """批量操作相关测试"""

    @pytest.fixture
    def sample_sites(self, client):
        """创建多个示例站点"""
        site_ids = []
        for i in range(3):
            response = client.post("/api/v1/sites/", json={
                "name": f"batch-site-{i}",
                "displayName": f"批量站点{i}",
                "region": "CN"
            })
            site_ids.append(unwrap(response)["id"])
        return site_ids

    def test_batch_action_restart(self, client, sample_sites):
        """批量重启站点"""
        response = client.post("/api/v1/sites/batch/action", json={
            "action": "restart",
            "siteIds": sample_sites
        })

        assert response.status_code == 200
        data = unwrap(response)
        assert "taskId" in data
        assert data["action"] == "restart"

    def test_batch_action_switch_link(self, client, sample_sites):
        """批量切换链路"""
        response = client.post("/api/v1/sites/batch/action", json={
            "action": "switchLink",
            "siteIds": sample_sites
        })

        assert response.status_code == 200
        data = unwrap(response)
        assert "taskId" in data

    def test_batch_action_invalid_action(self, client, sample_sites):
        """无效的操作类型"""
        response = client.post("/api/v1/sites/batch/action", json={
            "action": "invalid_action",
            "siteIds": sample_sites
        })
        assert response.status_code == 400

    def test_get_batch_task_status(self, client, sample_sites):
        """获取批量操作任务状态"""
        # 创建任务
        create_resp = client.post("/api/v1/sites/batch/action", json={
            "action": "restart",
            "siteIds": sample_sites
        })
        task_id = unwrap(create_resp)["taskId"]

        # 等待任务执行
        time.sleep(2)

        # 获取任务状态
        response = client.get(f"/api/v1/sites/batch/tasks/{task_id}")
        assert response.status_code == 200
        data = unwrap(response)
        assert data["taskId"] == task_id
        assert "results" in data


class TestSiteExport:
    """站点导出相关测试"""

    def test_export_sites_csv(self, client):
        """导出 CSV 格式"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "export-site",
            "displayName": "导出站点",
            "region": "CN"
        })

        response = client.get("/api/v1/sites/export?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    def test_export_sites_json(self, client):
        """导出 JSON 格式"""
        # 创建站点
        client.post("/api/v1/sites/", json={
            "name": "export-site",
            "displayName": "导出站点",
            "region": "CN"
        })

        response = client.get("/api/v1/sites/export?format=json")
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")


class TestSiteDevices:
    """站点设备相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "device-site",
            "displayName": "设备站点",
            "region": "CN"
        })
        return unwrap(response)

    def test_get_site_devices(self, client, sample_site):
        """获取站点设备列表"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/devices")
        assert response.status_code == 200
        data = response.json()
        assert "site_id" in data
        assert "devices" in data
        assert "stats" in data


class TestSiteInterfaces:
    """站点接口相关测试"""

    @pytest.fixture
    def sample_site(self, client):
        """创建示例站点"""
        response = client.post("/api/v1/sites/", json={
            "name": "interface-site",
            "displayName": "接口站点",
            "region": "CN",
            "wanInterfaces": [
                {
                    "name": "WAN1",
                    "interfaceType": "WAN",
                    "ipAddress": "192.168.1.1"
                }
            ]
        })
        return unwrap(response)

    def test_get_site_interfaces(self, client, sample_site):
        """获取站点接口列表"""
        site_id = sample_site["id"]

        response = client.get(f"/api/v1/sites/{site_id}/interfaces")
        assert response.status_code == 200
        data = response.json()
        assert "interfaces" in data
        assert "tunnels" in data
