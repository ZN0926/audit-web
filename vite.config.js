import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 前端独立仓库：F:\毕业设计\audit-web
// 开发期把 /api 转发到后端 8080，浏览器看到的是同源请求，不需要处理 CORS。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
})
