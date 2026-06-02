/**
 * WebSocket 连接管理
 * 用于站点实时数据推送
 */

const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';
const WS_PATH = '/api/v1/sites/ws';

class SiteWebSocket {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.heartbeatInterval = null;
        this.messageHandlers = [];
        this.statusHandlers = [];
    }

    /**
     * 连接 WebSocket
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket 已连接');
            return;
        }

        try {
            this.ws = new WebSocket(`${WS_BASE}${WS_PATH}`);

            this.ws.onopen = () => {
                console.log('WebSocket 连接成功');
                this.connected = true;
                this.reconnectAttempts = 0;
                this._notifyStatus('connected');
                this._startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                const data = event.data;
                if (data === 'pong') {
                    // 心跳响应
                    return;
                }
                try {
                    const message = JSON.parse(data);
                    this._notifyHandlers(message);
                } catch (e) {
                    console.error('WebSocket 消息解析失败:', e);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket 错误:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket 连接关闭');
                this.connected = false;
                this._notifyStatus('disconnected');
                this._stopHeartbeat();
                this._attemptReconnect();
            };
        } catch (error) {
            console.error('WebSocket 连接失败:', error);
            this._attemptReconnect();
        }
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.reconnectAttempts = this.maxReconnectAttempts; // 防止重连
        this._stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    /**
     * 发送心跳
     */
    sendPing() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
        }
    }

    /**
     * 注册消息处理器
     * @param {Function} handler - 消息处理函数
     */
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    /**
     * 移除消息处理器
     * @param {Function} handler - 消息处理函数
     */
    offMessage(handler) {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
            this.messageHandlers.splice(index, 1);
        }
    }

    /**
     * 注册连接状态处理器
     * @param {Function} handler - 状态处理函数
     */
    onStatus(handler) {
        this.statusHandlers.push(handler);
    }

    /**
     * 移除连接状态处理器
     * @param {Function} handler - 状态处理函数
     */
    offStatus(handler) {
        const index = this.statusHandlers.indexOf(handler);
        if (index > -1) {
            this.statusHandlers.splice(index, 1);
        }
    }

    /**
     * 尝试重连
     */
    _attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('WebSocket 重连次数已达上限');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`WebSocket 将在 ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连...`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * 启动心跳
     */
    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendPing();
        }, 30000); // 每30秒发送一次心跳
    }

    /**
     * 停止心跳
     */
    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 通知消息处理器
     */
    _notifyHandlers(message) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (e) {
                console.error('消息处理器错误:', e);
            }
        });
    }

    /**
     * 通知状态处理器
     */
    _notifyStatus(status) {
        this.statusHandlers.forEach(handler => {
            try {
                handler(status);
            } catch (e) {
                console.error('状态处理器错误:', e);
            }
        });
    }
}

// 创建单例
const siteWebSocket = new SiteWebSocket();

export default siteWebSocket;
