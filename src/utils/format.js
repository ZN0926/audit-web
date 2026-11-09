/*
【功能】前端公共格式化函数
【作用】四个页面都要显示时间、大小、状态文案，集中一处避免各写一份还不一致
【输入】见各函数参数
【输出】格式化后的字符串
【怎么用】import { fmtTime, fmtSize, statusText } from '@/utils/format'
【例子】fmtTime('2026-11-09T13:11:33') -> '2026-11-09 13:11'
*/

const p = (n) => String(n).padStart(2, '0')

export function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 后端 status 只有四种取值
export const STATUS_MAP = {
  PENDING: { text: '排队中', type: 'info' },
  RUNNING: { text: '审计中', type: 'warning' },
  DONE: { text: '已完成', type: 'success' },
  FAILED: { text: '失败', type: 'danger' },
}

export function statusText(s) {
  return STATUS_MAP[s]?.text || s || '—'
}

export function statusType(s) {
  return STATUS_MAP[s]?.type || 'info'
}
