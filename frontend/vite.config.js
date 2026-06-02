import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // 监听所有网络接口，支持通过 IP 访问
        host: '0.0.0.0',
        // 前端开发服务器端口
        port: 5273,
        proxy: {
            // 将 /api 请求代理到后端 FastAPI 服务
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
})
