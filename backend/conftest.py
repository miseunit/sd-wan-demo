"""
后端测试配置
提供测试数据库和客户端 fixtures
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from app.db import Base, get_db

# 使用内存 SQLite 进行测试（隔离、快速）
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """覆盖数据库依赖，使用测试数据库"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """
    每个测试函数独立的数据库会话
    测试前创建表，测试后销毁，保证测试隔离
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    测试客户端
    自动注入测试数据库
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_device_data():
    """示例设备数据"""
    return {
        "name": "test-device-01",
        "device_type": "Edge",
        "site_id": "site-001"
    }


@pytest.fixture
def sample_site_data():
    """示例站点数据"""
    return {
        "name": "test-site-01",
        "displayName": "测试站点01",
        "region": "CN",
        "siteType": "branch"
    }


@pytest.fixture
def sample_site(client):
    """创建示例站点"""
    response = client.post("/api/v1/sites/", json={
        "name": "test-site",
        "displayName": "测试站点",
        "region": "CN"
    })
    return unwrap(response.json())


def unwrap(response):
    """
    解包统一响应格式，返回 data 字段
    如果响应不是统一格式，则直接返回数据
    """
    if isinstance(response, dict):
        if "code" in response and "data" in response:
            return response["data"]
        return response
    return response
