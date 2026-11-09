/**
 * 【功能】把后端 13 个接口封装成 13 个函数，页面里只写 api.xxx()
 * 【作用】统一 baseURL、超时、错误提示，避免每个页面各写一套 axios 配置
 * 【输入】各函数的参数（文件、taskId、过滤条件等）
 * 【输出】Promise，resolve 的是后端返回的 JSON（已经是对象，不是 axios 包装）
 * 【怎么用】import api from '@/api' 然后 await api.ping()
 * 【例子】const r = await api.upload(file, p => (percent.value = p))
 *        → r.taskId 就是任务号
 */
import axios from 'axios'

const http = axios.create({
  // 开发期由 vite.config.js 把 /api 代理到 http://localhost:8080
  baseURL: '/api',
  // 上传接口内部会同步跑完审计，10~60 秒很常见，短了必然假超时
  timeout: 120000,
})

http.interceptors.response.use(
  (resp) => resp.data,
  (err) => {
    const msg =
      err.response?.data?.error ||
      (err.code === 'ECONNABORTED'
        ? '请求超时：审计可能还在跑，或文件太大，请稍后刷新任务列表'
        : err.message || '请求失败')
    return Promise.reject(new Error(msg))
  },
)

export default {
  /** 探活：返回 {status, db, time} */
  ping: () => http.get('/ping'),

  /** 上传并审计（同步），onProgress 收到 0~100 */
  upload: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return http.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  /** 任务列表 */
  tasks: () => http.get('/audit/tasks'),
  /** 单任务：{task, violations, checked} */
  task: (id) => http.get(`/audit/tasks/${id}`),
  /** 违规明细（按 startLine 升序） */
  findings: (id) => http.get(`/audit/tasks/${id}/findings`),

  /** 报告 JSON（含 markdown / html 字符串） */
  report: (id) => http.get(`/report/${id}`),
  /** 报告 Markdown 纯文本 */
  reportMarkdown: (id) => http.get(`/report/${id}/markdown`),
  /** 报告 HTML 纯文本 */
  reportHtml: (id) => http.get(`/report/${id}/html`),
  /** 强制重算报告 */
  regenerate: (id) => http.post(`/report/${id}/regenerate`),

  /** 规则列表 */
  rules: (language, limit = 20) => http.get('/rules', { params: { language, limit } }),
  /** 规则库统计 */
  ruleStats: () => http.get('/rules/stats'),
  /** 从 JSON 文件导入规则（管理用） */
  importRules: (path) => http.post('/rules/import', null, { params: { path } }),
  /** 从规范文档蒸馏规则 */
  distill: (docPath, language, startChunk = 0, maxChunks = 5) =>
    http.post('/rules/distill', null, { params: { docPath, language, startChunk, maxChunks } }),
}
