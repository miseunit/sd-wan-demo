"""
用户管理 API 测试用例
覆盖注册、登录、获取用户信息等操作
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


class TestUserRegister:
    """用户注册相关测试"""

    def test_register_success(self, client):
        """正常注册用户"""
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        })

        assert response.status_code == 201
        data = unwrap(response)
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert "id" in data
        assert data["is_active"] is True

    def test_register_missing_username(self, client):
        """缺少用户名"""
        response = client.post("/api/v1/users/register", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 422

    def test_register_missing_email(self, client):
        """缺少邮箱"""
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "password": "password123"
        })
        assert response.status_code == 422

    def test_register_missing_password(self, client):
        """缺少密码"""
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "test@example.com"
        })
        assert response.status_code == 422

    def test_register_short_username(self, client):
        """用户名太短（小于3字符）"""
        response = client.post("/api/v1/users/register", json={
            "username": "ab",
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 422

    def test_register_short_password(self, client):
        """密码太短（小于6字符）"""
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "12345"
        })
        assert response.status_code == 422

    def test_register_invalid_email(self, client):
        """邮箱格式不正确"""
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "invalid-email",
            "password": "password123"
        })
        assert response.status_code == 422

    def test_register_duplicate_username(self, client):
        """用户名重复"""
        # 注册第一个用户
        client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "test1@example.com",
            "password": "password123"
        })

        # 尝试用相同用户名注册
        response = client.post("/api/v1/users/register", json={
            "username": "testuser",
            "email": "test2@example.com",
            "password": "password123"
        })
        assert response.status_code == 400

    def test_register_duplicate_email(self, client):
        """邮箱重复"""
        # 注册第一个用户
        client.post("/api/v1/users/register", json={
            "username": "user1",
            "email": "test@example.com",
            "password": "password123"
        })

        # 尝试用相同邮箱注册
        response = client.post("/api/v1/users/register", json={
            "username": "user2",
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 400


class TestUserLogin:
    """用户登录相关测试"""

    @pytest.fixture
    def registered_user(self, client):
        """注册一个测试用户"""
        response = client.post("/api/v1/users/register", json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "password123",
            "full_name": "Login User"
        })
        return unwrap(response)

    def test_login_success(self, client, registered_user):
        """正常登录"""
        response = client.post("/api/v1/users/login", data={
            "username": "loginuser",
            "password": "password123"
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["username"] == "loginuser"

    def test_login_wrong_username(self, client, registered_user):
        """用户名错误"""
        response = client.post("/api/v1/users/login", data={
            "username": "wronguser",
            "password": "password123"
        })
        assert response.status_code == 401

    def test_login_wrong_password(self, client, registered_user):
        """密码错误"""
        response = client.post("/api/v1/users/login", data={
            "username": "loginuser",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_missing_username(self, client):
        """缺少用户名"""
        response = client.post("/api/v1/users/login", data={
            "password": "password123"
        })
        assert response.status_code == 422

    def test_login_missing_password(self, client):
        """缺少密码"""
        response = client.post("/api/v1/users/login", data={
            "username": "loginuser"
        })
        assert response.status_code == 422


class TestGetCurrentUser:
    """获取当前用户信息相关测试"""

    @pytest.fixture
    def access_token(self, client):
        """注册并登录用户，返回访问令牌"""
        # 注册用户
        client.post("/api/v1/users/register", json={
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "password123"
        })

        # 登录获取令牌
        response = client.post("/api/v1/users/login", data={
            "username": "tokenuser",
            "password": "password123"
        })
        return response.json()["access_token"]

    def test_get_current_user_success(self, client, access_token):
        """正常获取当前用户信息"""
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "tokenuser"
        assert data["email"] == "token@example.com"
        assert "id" in data

    def test_get_current_user_no_token(self, client):
        """没有提供令牌"""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """令牌无效"""
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestRefreshToken:
    """刷新令牌相关测试"""

    @pytest.fixture
    def refresh_token(self, client):
        """注册并登录用户，返回刷新令牌"""
        # 注册用户
        client.post("/api/v1/users/register", json={
            "username": "refreshuser",
            "email": "refresh@example.com",
            "password": "password123"
        })

        # 登录获取令牌
        response = client.post("/api/v1/users/login", data={
            "username": "refreshuser",
            "password": "password123"
        })
        return response.json()["refresh_token"]

    def test_refresh_token_success(self, client, refresh_token):
        """正常刷新令牌"""
        response = client.post(
            "/api/v1/users/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    def test_refresh_token_no_token(self, client):
        """没有提供令牌"""
        response = client.post("/api/v1/users/refresh")
        assert response.status_code == 401

    def test_refresh_token_invalid_token(self, client):
        """令牌无效"""
        response = client.post(
            "/api/v1/users/refresh",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestUserList:
    """用户列表相关测试"""

    def test_list_users_empty(self, client):
        """空列表"""
        response = client.get("/api/v1/users/")

        assert response.status_code == 200
        data = unwrap(response)
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_users_with_data(self, client):
        """有数据的列表"""
        # 创建两个用户
        client.post("/api/v1/users/register", json={
            "username": "user1",
            "email": "user1@example.com",
            "password": "password123"
        })
        client.post("/api/v1/users/register", json={
            "username": "user2",
            "email": "user2@example.com",
            "password": "password123"
        })

        response = client.get("/api/v1/users/")
        assert response.status_code == 200

        data = unwrap(response)
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_list_users_pagination(self, client):
        """分页测试"""
        # 创建 15 个用户
        for i in range(15):
            client.post("/api/v1/users/register", json={
                "username": f"user{i:02d}",
                "email": f"user{i:02d}@example.com",
                "password": "password123"
            })

        # 第一页
        response = client.get("/api/v1/users/?page=1&pageSize=10")
        data = unwrap(response)
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["totalPages"] == 2

        # 第二页
        response = client.get("/api/v1/users/?page=2&pageSize=10")
        data = unwrap(response)
        assert len(data["items"]) == 5

    def test_list_users_invalid_page(self, client):
        """无效的页码"""
        response = client.get("/api/v1/users/?page=0")
        assert response.status_code == 422

    def test_list_users_invalid_page_size(self, client):
        """无效的每页记录数"""
        response = client.get("/api/v1/users/?pageSize=501")
        assert response.status_code == 422
