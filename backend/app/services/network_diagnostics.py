"""
网络诊断服务层
提供 Ping、Traceroute 和链路探测功能
"""
import asyncio
import ipaddress
import random
from datetime import datetime
from typing import List, Optional, Dict, Any

try:
    from icmplib import ping, traceroute
    HAS_ICMPLIB = True
except ImportError:
    HAS_ICMPLIB = False

from app.models.diagnostics import PingHistory, TracerouteHistory, LinkProbeHistory
from app.schemas.diagnostics import (
    TracerouteHop,
    SLAScore,
)


class NetworkDiagnosticsService:
    """网络诊断服务类"""

    @staticmethod
    def _validate_target(target: str) -> bool:
        """
        验证目标地址是否有效
        :param target: IP 地址或域名
        :return: 是否有效
        """
        if not target:
            return False

        try:
            # 尝试解析为 IP 地址
            ipaddress.ip_address(target)
            return True
        except ValueError:
            # 如果不是 IP，检查是否为有效域名
            # 域名规则: 长度不超过 253，只包含字母、数字、点和连字符
            if len(target) > 253:
                return False
            # 基本的域名验证
            valid_chars = set("abcdefghijklmnopqrstuvwxyz0123456789.-")
            return all(c in valid_chars for c in target.lower())

    @staticmethod
    async def ping_target(
        target: str,
        count: int = 5,
        interval: float = 1.0,
        timeout: float = 2.0,
        packet_size: int = 32,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行 Ping 测试
        :param target: 目标 IP 或域名
        :param count: 发送包数
        :param interval: 发送间隔(秒)
        :param timeout: 超时时间(秒)
        :param packet_size: 数据包大小(字节)
        :return: Ping 测试结果字典
        """
        # 验证目标地址
        if not NetworkDiagnosticsService._validate_target(target):
            raise ValueError(f"无效的目标地址: {target}")

        # 如果 icmplib 不可用，返回模拟数据
        if not HAS_ICMPLIB:
            base_latency = random.uniform(1, 50)
            return {
                "is_alive": True,
                "packets_sent": count,
                "packets_received": count,
                "packet_loss": 0,
                "min_rtt": base_latency * 0.8,
                "max_rtt": base_latency * 1.5,
                "avg_rtt": base_latency,
                "jitter": base_latency * 0.1,
            }

        try:
            # 执行异步 ping（icmplib 的 ping 是同步的，需要在独立线程中运行）
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: ping(
                    target,
                    count=count,
                    interval=interval,
                    timeout=timeout,
                    packet_size=packet_size,
                    **kwargs
                )
            )

            return {
                "is_alive": result.is_alive,
                "packets_sent": result.packets_sent,
                "packets_received": result.packets_received,
                "packet_loss": result.packet_loss,
                "min_rtt": result.min_rtt,
                "max_rtt": result.max_rtt,
                "avg_rtt": result.avg_rtt,
                "jitter": result.jitter if hasattr(result, "jitter") else 0,
            }

        except PermissionError:
            raise PermissionError("Ping 需要 root/管理员权限")
        except Exception as e:
            raise RuntimeError(f"Ping 执行失败: {str(e)}")

    @staticmethod
    async def traceroute_target(
        destination: str,
        max_hops: int = 30,
        timeout: float = 2.0,
        destination_port: int = 33434,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行 Traceroute
        :param destination: 目标 IP 或域名
        :param max_hops: 最大跳数
        :param timeout: 超时时间(秒)
        :param destination_port: 目标端口
        :return: Traceroute 结果字典
        """
        # 验证目标地址
        if not NetworkDiagnosticsService._validate_target(destination):
            raise ValueError(f"无效的目标地址: {destination}")

        # 如果 icmplib 不可用，返回模拟数据
        if not HAS_ICMPLIB:
            hops = []
            for i in range(min(5, max_hops)):
                base_latency = random.uniform(1, 30)
                hops.append({
                    "hop_number": i + 1,
                    "ip": f"10.0.{i}.{random.randint(1, 254)}",
                    "hostname": None,
                    "rtt_list": [base_latency, base_latency * 1.1, base_latency * 0.9],
                    "is_timeout": False,
                    "status": "success",
                })
            return {
                "reached": True,
                "total_hops": len(hops),
                "hops": hops,
                "has_timeout": False,
                "timeout_hop": None,
            }

        try:
            # 执行异步 traceroute
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: traceroute(
                    destination,
                    max_hops=max_hops,
                    timeout=timeout,
                    port=destination_port,
                    **kwargs
                )
            )

            # 解析跳数信息
            hops = []
            has_timeout = False
            timeout_hop = None

            for i, hop in enumerate(result.hops):
                hop_number = i + 1
                is_timeout = hop.address is None

                if is_timeout and not has_timeout:
                    has_timeout = True
                    timeout_hop = hop_number

                hops.append(
                    {
                        "hop_number": hop_number,
                        "ip": hop.address,
                        "hostname": None,  # icmplib 不提供主机名解析，可通过 DNS 查询获取
                        "rtt_list": hop.probes_rtt,
                        "is_timeout": is_timeout,
                        "status": "timeout" if is_timeout else "success",
                    }
                )

            return {
                "reached": result.destination_reached,
                "total_hops": len(hops),
                "hops": hops,
                "has_timeout": has_timeout,
                "timeout_hop": timeout_hop,
            }

        except PermissionError:
            raise PermissionError("Traceroute 需要 root/管理员权限")
        except Exception as e:
            raise RuntimeError(f"Traceroute 执行失败: {str(e)}")

    @staticmethod
    def calculate_sla_score(latency: float, loss: float, jitter: float) -> float:
        """
        计算 SLA 评分 (0-100)
        权重: 延迟40%, 丢包35%, 抖动25%
        :param latency: 延迟(ms)
        :param loss: 丢包率(%)
        :param jitter: 抖动(ms)
        :return: SLA 评分
        """
        # 延迟得分 (0-200ms 映射到 0-40分)
        latency_score = max(0, 40 - (latency / 200) * 40)

        # 丢包得分 (0-1% 映射到 0-35分)
        loss_score = max(0, 35 - (loss / 1) * 35)

        # 抖动得分 (0-50ms 映射到 0-25分)
        jitter_score = max(0, 25 - (jitter / 50) * 25)

        total_score = latency_score + loss_score + jitter_score

        return round(total_score, 1)

    @staticmethod
    def get_sla_details(latency: float, loss: float, jitter: float) -> SLAScore:
        """
        获取详细的 SLA 评分信息
        :param latency: 延迟(ms)
        :param loss: 丢包率(%)
        :param jitter: 抖动(ms)
        :return: SLA 评分详情
        """
        latency_score = max(0, 40 - (latency / 200) * 40)
        loss_score = max(0, 35 - (loss / 1) * 35)
        jitter_score = max(0, 25 - (jitter / 50) * 25)
        sla_score = round(latency_score + loss_score + jitter_score, 1)

        # 判断健康状态
        if loss > 1 or latency > 100:
            health_status = "down"
        elif loss > 0.2 or latency > 40 or jitter > 10:
            health_status = "degraded"
        else:
            health_status = "healthy"

        return SLAScore(
            sla_score=sla_score,
            latency_score=round(latency_score, 1),
            loss_score=round(loss_score, 1),
            jitter_score=round(jitter_score, 1),
            health_status=health_status,
        )

    @staticmethod
    def determine_health_status(latency: float, loss: float, jitter: float) -> str:
        """
        判断链路健康状态
        :param latency: 延迟(ms)
        :param loss: 丢包率(%)
        :param jitter: 抖动(ms)
        :return: 健康状态: healthy/degraded/down
        """
        if loss > 1 or latency > 100:
            return "down"
        elif loss > 0.2 or latency > 40 or jitter > 10:
            return "degraded"
        else:
            return "healthy"

    @staticmethod
    def analyze_traceroute_hops(hops: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        分析 Traceroute 跳数信息，识别异常
        :param hops: 跳数列表
        :return: 分析结果
        """
        if not hops:
            return {"has_issues": False, "issues": []}

        issues = []

        for hop in hops:
            # 检查超时
            if hop.get("is_timeout"):
                issues.append({
                    "type": "timeout",
                    "hop_number": hop["hop_number"],
                    "message": f"第 {hop['hop_number']} 跳无响应，可能是防火墙阻断"
                })

            # 检查高延迟
            elif hop.get("rtt_list"):
                avg_rtt = sum(hop["rtt_list"]) / len(hop["rtt_list"]) if hop["rtt_list"] else 0
                if avg_rtt > 100:
                    issues.append({
                        "type": "high_latency",
                        "hop_number": hop["hop_number"],
                        "ip": hop.get("ip"),
                        "avg_rtt": avg_rtt,
                        "message": f"第 {hop['hop_number']} 跳延迟较高: {avg_rtt:.1f}ms"
                    })

        return {
            "has_issues": len(issues) > 0,
            "issues": issues,
        }


class LinkMonitor:
    """链路监控后台任务类"""

    # 活跃的监控任务字典 {link_id: True/False}
    _active_monitors: Dict[str, bool] = {}

    @classmethod
    async def continuous_probe(
        cls,
        link_id: str,
        target: str,
        interval: int = 5,
        db_session=None,
        websocket_manager=None
    ):
        """
        持续探测链路质量
        :param link_id: 链路ID
        :param target: 目标IP
        :param interval: 探测间隔(秒)
        :param db_session: 数据库会话
        :param websocket_manager: WebSocket 管理器（用于实时推送）
        """
        from app.db import SessionLocal
        from app.models.link import WanLink

        cls._active_monitors[link_id] = True
        db = db_session or SessionLocal()

        try:
            while cls._active_monitors.get(link_id):
                try:
                    # 刷新会话以获取最新数据
                    db.expire_all()
                    link = db.query(WanLink).filter(WanLink.id == link_id).first()

                    if not link:
                        break

                    # 执行探测
                    result = await NetworkDiagnosticsService.ping_target(
                        target=target,
                        count=3,
                        interval=0.5,
                        timeout=2.0
                    )

                    # 计算指标
                    latency = result.get("avg_rtt") or 0
                    loss = result.get("packet_loss") or 0
                    jitter = result.get("jitter") or 0

                    # 计算 SLA 评分
                    sla_score = NetworkDiagnosticsService.calculate_sla_score(
                        latency, loss, jitter
                    )
                    health_status = NetworkDiagnosticsService.determine_health_status(
                        latency, loss, jitter
                    )

                    # 更新链路指标
                    link.latency = latency
                    link.loss = loss
                    link.jitter = jitter
                    link.sla_score = sla_score
                    link.health_status = health_status

                    # 保存历史记录
                    history = LinkProbeHistory(
                        link_id=link_id,
                        target=target,
                        latency=latency,
                        packet_loss=loss,
                        jitter=jitter,
                        sla_score=sla_score,
                        health_status=health_status,
                        probe_type="periodic"
                    )
                    db.add(history)
                    db.commit()

                    # WebSocket 推送（如果提供）
                    if websocket_manager:
                        await websocket_manager.broadcast(
                            {
                                "type": "link_update",
                                "link_id": link_id,
                                "data": {
                                    "latency": latency,
                                    "loss": loss,
                                    "jitter": jitter,
                                    "sla_score": sla_score,
                                    "health_status": health_status,
                                }
                            }
                        )

                    await asyncio.sleep(interval)

                except Exception as e:
                    print(f"链路探测异常 {link_id}: {e}")
                    await asyncio.sleep(interval)

        finally:
            cls._active_monitors[link_id] = False
            if not db_session:
                db.close()

    @classmethod
    def stop_monitoring(cls, link_id: str):
        """
        停止监控指定链路
        :param link_id: 链路ID
        """
        cls._active_monitors[link_id] = False

    @classmethod
    def get_active_monitors(cls) -> List[str]:
        """
        获取所有活跃的监控任务
        :return: 链路ID列表
        """
        return [lid for lid, active in cls._active_monitors.items() if active]
