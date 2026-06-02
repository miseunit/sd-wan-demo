"""
手动执行种子数据初始化
用法: python seed.py
"""
import sys

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from app.db import init_db, seed_db

if __name__ == "__main__":
    print("=" * 50)
    print("SD-WAN Demo - 数据库种子数据初始化")
    print("=" * 50)
    init_db()
    seed_db()
    print("=" * 50)
    print("初始化完成！")
