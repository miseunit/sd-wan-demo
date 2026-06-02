"""
补充 site_links 和 wan_links 的关联数据

将 site_links 表中缺少 wan_link_id 的记录，
在 wan_links 表中创建对应数据，并建立关联。
"""
import sqlite3
import uuid
from datetime import datetime

# 数据库路径
DB_PATH = "app.db"

def get_next_link_id(cursor, site_id: str, link_type: str) -> str:
    """
    生成新的 link_id，格式：link-{站点简称}-{类型序号}
    例如：link-sh-int-1
    """
    # 站点简称映射
    site_map = {
        'site-sh': 'sh',
        'site-gz': 'gz',
        'site-sz': 'sz',
        'site-cd': 'cd',
        'site-wh': 'wh',
        'site-nj': 'nj',
        'site-hz': 'hz',
        'site-xa': 'xa',
        'site-aws-tokyo': 'aws-tky',
        'site-azure-sg': 'azure-sg',
        'site-gcp-hk': 'gcp-hk',
    }

    # 类型简称映射
    type_map = {
        'MPLS': 'mpls',
        'Internet': 'int',
        '5G': '5g',
    }

    site_short = site_map.get(site_id, site_id.replace('site-', ''))
    type_short = type_map.get(link_type, link_type.lower())

    # 查找该站点该类型的最大序号
    cursor.execute("""
        SELECT id FROM wan_links
        WHERE id LIKE ?
        ORDER BY id DESC
    """, (f"link-{site_short}-{type_short}-%",))

    existing = cursor.fetchall()
    if existing:
        # 获取最后一个 ID 的序号并递增
        last_id = existing[0][0]
        try:
            last_num = int(last_id.split('-')[-1])
            new_num = last_num + 1
        except:
            new_num = 1
    else:
        new_num = 1

    return f"link-{site_short}-{type_short}-{new_num}"


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 获取站点信息映射（用于填充 site_name）
    cursor.execute("SELECT id, display_name FROM sites")
    sites_info = {row[0]: row[1] for row in cursor.fetchall()}

    # 获取缺少 wan_link_id 的 site_links
    cursor.execute("""
        SELECT id, site_id, link_type
        FROM site_links
        WHERE wan_link_id IS NULL
        ORDER BY site_id, link_type
    """)
    missing_links = cursor.fetchall()

    print(f"找到 {len(missing_links)} 条需要补充关联的记录\n")

    # 遍历每条需要补充的记录
    updated_count = 0
    created_count = 0

    for site_link_id, site_id, link_type in missing_links:
        # 检查 wan_links 中是否已有对应的链路
        cursor.execute("""
            SELECT id FROM wan_links
            WHERE site_id = ? AND type = ?
        """, (site_id, link_type))

        existing_wan_link = cursor.fetchone()

        if existing_wan_link:
            # 已存在，直接关联
            wan_link_id = existing_wan_link[0]
            print(f"✓ 站点 {site_id} 的 {link_type} 链路已存在: {wan_link_id}")
        else:
            # 不存在，创建新的 wan_link
            wan_link_id = get_next_link_id(cursor, site_id, link_type)
            site_name = sites_info.get(site_id, site_id)

            # 插入新的 wan_link
            cursor.execute("""
                INSERT INTO wan_links (
                    id, name, type, site_id, site_name,
                    health_status, active_status, ip,
                    latency, loss, jitter,
                    bandwidth, used_bandwidth, utilization,
                    sla_score, switch_policy, monthly_cost,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                wan_link_id,
                f"{link_type}-{site_id.replace('site-', '').upper()}-1",
                link_type,
                site_id,
                site_name,
                "healthy",
                "standby",
                None,
                0,
                0,
                0,
                0,
                0,
                0,
                100,
                "mpls-priority",
                0,
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat(),
            ))

            created_count += 1
            print(f"+ 创建新链路: {wan_link_id} ({site_id} - {link_type})")

        # 更新 site_links 的 wan_link_id
        cursor.execute("""
            UPDATE site_links
            SET wan_link_id = ?
            WHERE id = ?
        """, (wan_link_id, site_link_id))

        updated_count += 1

    conn.commit()

    print(f"\n完成！")
    print(f"- 创建了 {created_count} 条新的 wan_links 记录")
    print(f"- 更新了 {updated_count} 条 site_links 记录")

    # 验证结果
    print("\n=== 验证 ===")
    cursor.execute("SELECT COUNT(*) FROM site_links WHERE wan_link_id IS NULL")
    remaining = cursor.fetchone()[0]
    print(f"剩余未关联的 site_links: {remaining}")

    if remaining == 0:
        print("✓ 所有关联已完成！")
    else:
        print("⚠ 仍有部分记录未关联")

    conn.close()


if __name__ == "__main__":
    main()
