"""
策略管理 API 测试用例
覆盖 CRUD、状态切换、筛选等功能
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


class TestPolicyCreate:
    """策略创建相关测试"""

    def test_create_policy_success(self, client):
        """正常创建策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "测试路由策略",
            "type": "route",
            "priority": 100,
            "description": "这是一个测试路由策略"
        })

        assert response.status_code == 201
        data = unwrap(response)
        assert data["name"] == "测试路由策略"
        assert data["type"] == "route"
        assert data["priority"] == 100
        assert data["status"] == "draft"
        assert "id" in data

    def test_create_policy_missing_name(self, client):
        """缺少必填字段 name"""
        response = client.post("/api/v1/policies/", json={
            "type": "route",
            "priority": 100
        })
        assert response.status_code == 422

    def test_create_policy_missing_type(self, client):
        """缺少必填字段 type"""
        response = client.post("/api/v1/policies/", json={
            "name": "测试策略",
            "priority": 100
        })
        assert response.status_code == 422

    def test_create_policy_short_name(self, client):
        """策略名称太短（小于2字符）"""
        response = client.post("/api/v1/policies/", json={
            "name": "测",
            "type": "route"
        })
        assert response.status_code == 422

    def test_create_policy_long_name(self, client):
        """策略名称太长（超过100字符）"""
        response = client.post("/api/v1/policies/", json={
            "name": "a" * 101,
            "type": "route"
        })
        assert response.status_code == 422

    def test_create_policy_invalid_type(self, client):
        """无效的策略类型"""
        response = client.post("/api/v1/policies/", json={
            "name": "测试策略",
            "type": "invalid_type"
        })
        assert response.status_code == 400

    def test_create_policy_invalid_priority_low(self, client):
        """优先级太小（小于1）"""
        response = client.post("/api/v1/policies/", json={
            "name": "测试策略",
            "type": "route",
            "priority": 0
        })
        assert response.status_code == 422

    def test_create_policy_invalid_priority_high(self, client):
        """优先级太大（超过9999）"""
        response = client.post("/api/v1/policies/", json={
            "name": "测试策略",
            "type": "route",
            "priority": 10000
        })
        assert response.status_code == 422

    def test_create_policy_duplicate_name(self, client):
        """策略名称重复"""
        # 创建第一个策略
        client.post("/api/v1/policies/", json={
            "name": "重复策略",
            "type": "route"
        })

        # 创建同名策略
        response = client.post("/api/v1/policies/", json={
            "name": "重复策略",
            "type": "qos"
        })
        assert response.status_code == 400

    def test_create_policy_with_match_conditions(self, client):
        """创建带匹配条件的策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "应用感知策略",
            "type": "app_aware",
            "priority": 200,
            "matchConditions": {
                "applications": ["video", "voip"],
                "minBandwidth": 10
            },
            "actionConfig": {
                "priority": "high",
                "guaranteeBandwidth": True
            }
        })

        # 统一响应中间件可能返回 200 或 201
        assert response.status_code in [200, 201]
        data = unwrap(response)
        assert data["type"] == "app_aware"

    def test_create_policy_with_applied_sites(self, client):
        """创建带应用站点的策略"""
        # 先创建站点
        site_resp = client.post("/api/v1/sites/", json={
            "name": "policy-site",
            "displayName": "策略站点",
            "region": "CN"
        })
        site_id = unwrap(site_resp)["id"]

        response = client.post("/api/v1/policies/", json={
            "name": "站点策略",
            "type": "qos",
            "priority": 150,
            "appliedSites": [site_id]
        })

        # 统一响应中间件可能返回 200 或 201
        assert response.status_code in [200, 201]
        data = unwrap(response)
        assert data["type"] == "qos"


class TestPolicyList:
    """策略列表相关测试"""

    def test_list_policies_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/policies/")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_policies_with_data(self, client):
        """有数据的列表"""
        # 创建策略
        client.post("/api/v1/policies/", json={
            "name": "路由策略01",
            "type": "route"
        })
        client.post("/api/v1/policies/", json={
            "name": "QoS策略01",
            "type": "qos"
        })

        response = client.get("/api/v1/policies/")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] >= 2

    def test_list_policies_pagination(self, client):
        """分页测试"""
        # 创建 15 个策略
        for i in range(15):
            client.post("/api/v1/policies/", json={
                "name": f"策略{i:02d}",
                "type": "route",
                "priority": 100 + i
            })

        # 第一页
        response = client.get("/api/v1/policies/?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/policies/?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_policies_filter_type(self, client):
        """按类型筛选"""
        # 创建不同类型的策略
        client.post("/api/v1/policies/", json={
            "name": "路由策略",
            "type": "route"
        })
        client.post("/api/v1/policies/", json={
            "name": "安全策略",
            "type": "security"
        })

        response = client.get("/api/v1/policies/?type=route")
        data = unwrap(response)
        assert data["total"] >= 1
        for policy in data["items"]:
            assert policy["type"] == "route"

    def test_list_policies_filter_status(self, client):
        """按状态筛选"""
        # 创建策略
        client.post("/api/v1/policies/", json={
            "name": "草稿策略",
            "type": "route"
        })

        response = client.get("/api/v1/policies/?status=draft")
        data = unwrap(response)
        assert data["total"] >= 1

    def test_list_policies_search(self, client):
        """搜索策略"""
        # 创建策略
        client.post("/api/v1/policies/", json={
            "name": "高优先级路由策略",
            "type": "route"
        })

        response = client.get("/api/v1/policies/?search=高优先级")
        data = unwrap(response)
        assert data["total"] >= 1


class TestPolicyDetail:
    """策略详情相关测试"""

    @pytest.fixture
    def sample_policy(self, client):
        """创建示例策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "详情策略",
            "type": "route",
            "priority": 100,
            "description": "这是一个详情策略"
        })
        return unwrap(response)

    def test_get_policy_success(self, client, sample_policy):
        """获取策略详情"""
        policy_id = sample_policy["id"]

        response = client.get(f"/api/v1/policies/{policy_id}")
        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "详情策略"

    def test_get_policy_not_found(self, client):
        """策略不存在"""
        response = client.get("/api/v1/policies/999999")
        assert response.status_code == 404


class TestPolicyUpdate:
    """策略更新相关测试"""

    @pytest.fixture
    def sample_policy(self, client):
        """创建示例策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "更新策略",
            "type": "route",
            "priority": 100
        })
        return unwrap(response)

    def test_update_policy_success(self, client, sample_policy):
        """正常更新策略"""
        policy_id = sample_policy["id"]

        response = client.put(f"/api/v1/policies/{policy_id}", json={
            "name": "更新后的策略名称",
            "priority": 200
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["name"] == "更新后的策略名称"
        assert data["priority"] == 200

    def test_update_partial_fields(self, client, sample_policy):
        """部分字段更新"""
        policy_id = sample_policy["id"]

        # 只更新描述
        response = client.put(f"/api/v1/policies/{policy_id}", json={
            "description": "更新后的描述"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["description"] == "更新后的描述"
        # 其他字段保持不变
        assert data["name"] == "更新策略"

    def test_update_policy_not_found(self, client):
        """更新不存在的策略"""
        response = client.put("/api/v1/policies/999999", json={
            "name": "更新"
        })
        assert response.status_code == 404

    def test_update_policy_invalid_priority(self, client, sample_policy):
        """无效的优先级"""
        policy_id = sample_policy["id"]

        response = client.put(f"/api/v1/policies/{policy_id}", json={
            "priority": 0
        })
        assert response.status_code == 422


class TestPolicyDelete:
    """策略删除相关测试"""

    @pytest.fixture
    def sample_policy(self, client):
        """创建示例策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "删除策略",
            "type": "route"
        })
        return unwrap(response)

    def test_delete_policy_success(self, client, sample_policy):
        """正常删除策略"""
        policy_id = sample_policy["id"]

        # 删除
        response = client.delete(f"/api/v1/policies/{policy_id}")
        # 统一响应中间件可能返回 200 或 204
        assert response.status_code in [200, 204]

        # 确认已删除
        get_resp = client.get(f"/api/v1/policies/{policy_id}")
        assert get_resp.status_code == 404

    def test_delete_policy_not_found(self, client):
        """删除不存在的策略"""
        response = client.delete("/api/v1/policies/999999")
        assert response.status_code == 404


class TestPolicyStatusUpdate:
    """策略状态更新相关测试"""

    @pytest.fixture
    def sample_policy(self, client):
        """创建示例策略"""
        response = client.post("/api/v1/policies/", json={
            "name": "状态策略",
            "type": "route"
        })
        return unwrap(response)

    def test_activate_policy(self, client, sample_policy):
        """启用策略"""
        policy_id = sample_policy["id"]

        response = client.patch(f"/api/v1/policies/{policy_id}/status", json={
            "status": "active"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["status"] == "active"

    def test_deactivate_policy(self, client, sample_policy):
        """禁用策略"""
        policy_id = sample_policy["id"]

        response = client.patch(f"/api/v1/policies/{policy_id}/status", json={
            "status": "inactive"
        })
        assert response.status_code == 200
        data = unwrap(response)
        assert data["status"] == "inactive"

    def test_update_status_invalid(self, client, sample_policy):
        """无效的状态"""
        policy_id = sample_policy["id"]

        response = client.patch(f"/api/v1/policies/{policy_id}/status", json={
            "status": "invalid_status"
        })
        assert response.status_code == 400

    def test_update_status_not_found(self, client):
        """策略不存在"""
        response = client.patch("/api/v1/policies/999999/status", json={
            "status": "active"
        })
        assert response.status_code == 404
