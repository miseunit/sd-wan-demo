"""
数据库连接配置
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 需要
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()


def get_db():
    """
    获取数据库会话
    用于依赖注入
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    初始化数据库
    创建所有表
    """
    from app.models import user, site, policy, device, alert, dashboard, link, link_metrics_history  # noqa: F401 导入模型以确保注册

    Base.metadata.create_all(bind=engine)

    # 简易迁移：给 device_interfaces 和 device_tunnels 表加 is_primary 列（如不存在）
    _migrate_add_is_primary(engine)


def _migrate_add_is_primary(engine):
    """给 device_interfaces / device_tunnels 加 is_primary 布尔列，给 devices 加绑定字段"""
    import sqlalchemy as sa

    with engine.connect() as conn:
        inspector = sa.inspect(engine)

        # device_interfaces 加 is_primary
        iface_cols = {c["name"] for c in inspector.get_columns("device_interfaces")}
        if "is_primary" not in iface_cols:
            conn.execute(sa.text("ALTER TABLE device_interfaces ADD COLUMN is_primary BOOLEAN DEFAULT 0"))
            conn.commit()

        # device_tunnels 加 is_primary
        tunnel_cols = {c["name"] for c in inspector.get_columns("device_tunnels")}
        if "is_primary" not in tunnel_cols:
            conn.execute(sa.text("ALTER TABLE device_tunnels ADD COLUMN is_primary BOOLEAN DEFAULT 0"))
            conn.commit()

        # devices 加绑定相关字段
        device_cols = {c["name"] for c in inspector.get_columns("devices")}
        device_migrations = [
            ("serial_number", "VARCHAR(50)"),
            ("management_ip", "VARCHAR(50)"),
            ("mac_address", "VARCHAR(20)"),
            ("bind_status", "VARCHAR(20) DEFAULT 'unbound'"),
            ("bound_at", "DATETIME"),
        ]
        for col_name, col_type in device_migrations:
            if col_name not in device_cols:
                conn.execute(sa.text(f"ALTER TABLE devices ADD COLUMN {col_name} {col_type}"))
                conn.commit()


def seed_db():
    """
    填充种子数据
    仅在数据库为空时执行，不会覆盖已有数据
    """
    from app.seed import seed_all

    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
