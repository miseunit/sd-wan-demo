"""
设备管理 API 测试用例
覆盖 CRUD 基本操作和边界情况

注意：响应格式为 {code, message, data}
"""
import pytest


def unwrap(response):
    """
    解包统一响应格式，返回 data 字段
    如果响应不是统一格式，则直接返回 JSON
    """
    json_data = response.json()
    if isinstance(json_data, dict) and "code" in json_data and "data" in json_data:
        return json_data["data"]
    return json_data


class TestDeviceCreate:
    """设备创建相关测试"""

    def test_create_device_success(self, client, sample_device_data):
        """正常创建设备"""
        response = client.post("/api/v1/devices", json=sample_device_data)

        assert response.status_code == 201
        data = unwrap(response)
        assert data["name"] == sample_device_data["name"]
        assert data["device_type"] == sample_device_data["device_type"]
        assert "id" in data

    def test_create_device_missing_name(self, client):
        """缺少必填字段 name"""
        response = client.post("/api/v1/devices", json={
            "device_type": "Edge",
            "site_id": "site-001"
        })
        assert response.status_code == 422

    def test_create_device_missing_type(self, client):
        """缺少必填字段 device_type"""
        response = client.post("/api/v1/devices", json={
            "name": "test-device",
            "site_id": "site-001"
        })
        assert response.status_code == 422

    def test_create_device_duplicate_name(self, client, sample_device_data):
        """设备名称重复"""
        # 创建第一个设备
        client.post("/api/v1/devices", json=sample_device_data)

        # 创建同名设备
        response = client.post("/api/v1/devices", json=sample_device_data)
        assert response.status_code == 400


class TestDeviceList:
    """设备列表相关测试"""

    def test_list_devices_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/devices")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_devices_with_data(self, client, sample_device_data):
        """有数据的列表"""
        # 创建设备
        client.post("/api/v1/devices", json=sample_device_data)

        response = client.get("/api/v1/devices")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_list_devices_pagination(self, client):
        """分页测试"""
        # 创建 15 个设备
        for i in range(15):
            client.post("/api/v1/devices", json={
                "name": f"device-{i:02d}",
                "device_type": "Edge",
                "site_id": "site-001"
            })

        # 第一页
        response = client.get("/api/v1/devices?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/devices?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_devices_filter_type(self, client):
        """按类型筛选"""
        client.post("/api/v1/devices", json={
            "name": "edge-01", "device_type": "Edge", "site_id": "s1"
        })
        client.post("/api/v1/devices", json={
            "name": "gateway-01", "device_type": "Gateway", "site_id": "s1"
        })

        response = client.get("/api/v1/devices?device_type=Edge")
        data = unwrap(response)
        assert data["total"] == 1
        assert data["items"][0]["device_type"] == "Edge"


class TestDeviceDetail:
    """设备详情相关测试"""

    def test_get_device_success(self, client, sample_device_data):
        """获取设备详情"""
        # 创建设备
        create_resp = client.post("/api/v1/devices", json=sample_device_data)
        device_id = unwrap(create_resp)["id"]

        # 获取详情
        response = client.get(f"/api/v1/devices/{device_id}")
        assert response.status_code == 200
        assert unwrap(response)["name"] == sample_device_data["name"]

    def test_get_device_not_found(self, client):
        """设备不存在"""
        response = client.get("/api/v1/devices/nonexistent-id")
        assert response.status_code == 404


class TestDeviceUpdate:
    """设备更新相关测试"""

    def test_update_device_success(self, client, sample_device_data):
        """正常更新设备"""
        # 创建设备
        create_resp = client.post("/api/v1/devices", json=sample_device_data)
        device_id = unwrap(create_resp)["id"]

        # 更新
        response = client.put(f"/api/v1/devices/{device_id}", json={
            "name": "updated-device"
        })
        assert response.status_code == 200
        assert unwrap(response)["name"] == "updated-device"

    def test_update_device_not_found(self, client):
        """更新不存在的设备"""
        response = client.put("/api/v1/devices/nonexistent-id", json={
            "name": "updated"
        })
        assert response.status_code == 404


class TestDeviceDelete:
    """设备删除相关测试"""

    def test_delete_device_success(self, client, sample_device_data):
        """正常删除设备"""
        # 创建设备
        create_resp = client.post("/api/v1/devices", json=sample_device_data)
        device_id = unwrap(create_resp)["id"]

        # 删除
        response = client.delete(f"/api/v1/devices/{device_id}")
        assert response.status_code == 200

        # 确认已删除
        get_resp = client.get(f"/api/v1/devices/{device_id}")
        assert get_resp.status_code == 404

    def test_delete_device_not_found(self, client):
        """删除不存在的设备"""
        response = client.delete("/api/v1/devices/nonexistent-id")
        assert response.status_code == 404


class TestDeviceStats:
    """设备统计相关测试"""

    def test_get_stats_empty(self, client):
        """空数据统计"""
        response = client.get("/api/v1/devices/stats")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] == 0
        assert data["online"] == 0
        assert data["offline"] == 0

    def test_get_stats_with_devices(self, client):
        """有设备时的统计"""
        # 创建 3 个设备
        for i in range(3):
            client.post("/api/v1/devices", json={
                "name": f"device-{i}",
                "device_type": "Edge",
                "site_id": "s1"
            })

        response = client.get("/api/v1/devices/stats")
        data = unwrap(response)
        assert data["total"] == 3
