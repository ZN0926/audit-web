<!--
【功能】展示单个任务的审计报告：合规率、结论、图表、逐条违规（行号+代码+原因+修法）
【作用】系统结论的最终呈现页，也是答辩演示重点
【输入】路由参数 id（任务号）
【输出】页面；可下载 Markdown、新窗口打开 HTML、重新生成报告
【怎么用】从任务列表点击进入，或直接访问 /#/report/6
【例子】打开 /#/report/6 → 98.7% 合规率 → 3 条明细，其中第 11 行 SQL 注入为 HIGH
-->
<template>
  <div class="page" v-loading="loading">
    <!-- 顶部：任务信息 + 三个动作 -->
    <el-card shadow="never" class="head">
      <div class="head-row">
        <div>
          <span class="file">{{ task?.fileName || '—' }}</span>
          <el-tag v-if="task" class="ml" :type="task.language === 'java' ? 'warning' : 'success'">
            {{ task.language }}
          </el-tag>
          <span class="meta">完成于 {{ fmtTime(task?.finishedAt) }} · 任务 #{{ id }}</span>
        </div>
        <div class="acts">
          <el-button @click="downloadMarkdown">下载 Markdown</el-button>
          <el-button @click="openHtml">投屏 HTML</el-button>
          <el-button :loading="regenerating" @click="regenerate">重新生成</el-button>
        </div>
      </div>
    </el-card>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      class="row"
      :title="loadError"
      description="报告加载失败，请确认后端是否启动后刷新页面"
    />

    <!-- 合规率 + 结论 -->
    <el-row v-if="!loadError" :gutter="16" class="row">
      <el-col :span="6">
        <el-card shadow="never" class="rate-card">
          <el-progress
            type="circle"
            :percentage="ratePercent"
            :width="120"
            :color="rateColor"
          />
          <div class="rate-label">合规率</div>
          <div class="rate-sub">{{ findings.length }} 条违规 / {{ ruleTotal }} 条规则</div>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card shadow="never" class="summary-card">
          <div class="summary-title">总体评估</div>
          <p class="summary-text">{{ report?.summaryText || '暂无结论' }}</p>
          <div class="badges">
            <el-tag type="danger">HIGH {{ severityCount.HIGH || 0 }}</el-tag>
            <el-tag type="warning" class="ml">MEDIUM {{ severityCount.MEDIUM || 0 }}</el-tag>
            <el-tag type="info" class="ml">LOW {{ severityCount.LOW || 0 }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 两个图表 -->
    <el-row v-if="!loadError" :gutter="16" class="row">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>严重程度分布</template>
          <div ref="pieRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>各规则命中条数</template>
          <div ref="barRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 明细 -->
    <el-card v-if="!loadError" shadow="never" class="row">
      <template #header>
        违规明细（{{ findings.length }}）
      </template>

      <el-empty v-if="!findings.length" description="没有发现问题：这个文件在这套规则下是干净的" />

      <div v-for="f in findings" :key="f.id" class="finding">
        <div class="f-head">
          <el-tag :type="sevType(f.severity)" effect="dark">{{ f.severity }}</el-tag>
          <span class="f-line">第 {{ lineText(f) }} 行</span>
          <el-tag v-if="f.confidence < 0.5" type="warning" effect="plain" class="ml">待人工确认</el-tag>
          <span class="f-conf">置信度 {{ Math.round((f.confidence || 0) * 100) }}%</span>
          <span class="f-rule">{{ f.ruleId }}</span>
        </div>

        <CodeBlock :code="f.codeSnippet" :language="task?.language || 'java'" :start-line="f.startLine" />

        <div class="f-body">
          <div class="f-item">
            <span class="label">为什么判违规</span>
            <span class="value">{{ f.reason }}</span>
          </div>
          <div class="f-item">
            <span class="label">怎么修</span>
            <span class="value">{{ f.fixSuggestion }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import api from '@/api'
import { fmtTime } from '@/utils/format'
import CodeBlock from '@/components/CodeBlock.vue'

const route = useRoute()
const id = route.params.id

const loading = ref(false)
const regenerating = ref(false)
const task = ref(null)
const findings = ref([])
const report = ref(null)
const stats = ref(null) // 规则库统计，用来算"x/总规则数"
const loadError = ref('')

const pieRef = ref(null)
const barRef = ref(null)
let pie = null
let bar = null

const sevType = (s) => ({ HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }[s] || 'info')

const lineText = (f) => (f.startLine === f.endLine ? f.startLine : `${f.startLine}–${f.endLine}`)

const ratePercent = computed(() => Math.round((report.value?.complianceRate ?? 0) * 1000) / 10)

const rateColor = computed(() => {
  const p = ratePercent.value
  if (p >= 95) return '#67c23a'
  if (p >= 80) return '#e6a23c'
  return '#f56c6c'
})

const ruleTotal = computed(() => {
  const lang = task.value?.language
  if (!lang || !stats.value?.byLanguage) return '—'
  return stats.value.byLanguage[lang] ?? '—'
})

const severityCount = computed(() => {
  const m = {}
  for (const f of findings.value) m[f.severity] = (m[f.severity] || 0) + 1
  return m
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [detail, fs, rep, st] = await Promise.all([
      api.task(id),
      api.findings(id),
      api.report(id),
      api.ruleStats().catch(() => null),
    ])
    task.value = detail.task
    findings.value = fs
    report.value = rep
    stats.value = st
    await nextTick()
    drawPie()
    drawBar()
  } catch (e) {
    loadError.value = e.message
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function drawPie() {
  if (!pieRef.value) return
  pie = pie || echarts.init(pieRef.value)
  const data = ['HIGH', 'MEDIUM', 'LOW', 'INFO']
    .map((k) => ({ name: k, value: severityCount.value[k] || 0 }))
    .filter((d) => d.value > 0)
  pie.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    color: ['#f56c6c', '#e6a23c', '#909399', '#409eff'],
    series: [{ type: 'pie', radius: ['40%', '65%'], data, label: { formatter: '{b} {c}' } }],
  }, true)
}

function drawBar() {
  if (!barRef.value) return
  bar = bar || echarts.init(barRef.value)
  const m = {}
  for (const f of findings.value) m[f.ruleId] = (m[f.ruleId] || 0) + 1
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  bar.setOption({
    grid: { left: 8, right: 16, top: 10, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: entries.map(([k]) => (k.length > 28 ? k.slice(0, 28) + '…' : k)).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [{ type: 'bar', data: entries.map(([, v]) => v).reverse(), barWidth: 14, itemStyle: { color: '#409eff' } }],
  }, true)
}

function resize() {
  pie?.resize()
  bar?.resize()
}

async function regenerate() {
  regenerating.value = true
  try {
    await api.regenerate(id)
    ElMessage.success('报告已重新生成')
    report.value = await api.report(id)
    await nextTick()
    drawPie()
    drawBar()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    regenerating.value = false
  }
}

// 后端 /markdown 未带 Content-Disposition，直接 window.open 只会内联显示，
// 这里取回文本后生成 Blob，强制以 report-<id>.md 下载
async function downloadMarkdown() {
  try {
    const md = await api.reportMarkdown(id)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${id}.md`
    a.click()
    // 立即 revoke 可能让部分浏览器取消下载，延迟释放
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    ElMessage.error(e.message)
  }
}
// 后端 /html 直接返回排版好的整页，新窗口打开即可
function openHtml() {
  window.open(`/api/report/${id}/html`, '_blank')
}

onMounted(() => {
  load()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  pie?.dispose()
  bar?.dispose()
})
</script>

<style scoped>
.page { max-width: 1180px; margin: 0 auto; }
.head { margin-bottom: 16px; }
.head-row { display: flex; justify-content: space-between; align-items: center; }
.file { font-size: 17px; font-weight: 600; }
.ml { margin-left: 8px; }
.meta { margin-left: 12px; font-size: 12px; color: #909399; }
.acts { display: flex; gap: 8px; }
.row { margin-bottom: 16px; }
.rate-card { text-align: center; padding: 8px 0; }
.rate-label { margin-top: 8px; font-size: 14px; color: #606266; }
.rate-sub { margin-top: 4px; font-size: 12px; color: #909399; }
.summary-title { font-weight: 600; margin-bottom: 8px; }
.summary-text { margin: 0 0 10px; line-height: 1.8; color: #303133; }
.badges { display: flex; }
.chart { height: 240px; }
.finding { padding: 14px 0; border-bottom: 1px dashed #ebeef5; }
.finding:last-child { border-bottom: none; }
.f-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.f-line { font-weight: 600; }
.f-conf { font-size: 12px; color: #909399; }
.f-rule { margin-left: auto; font-size: 12px; color: #b1b3b8; }
.f-body { margin-top: 10px; }
.f-item { display: flex; margin-top: 6px; font-size: 13px; line-height: 1.7; }
.label { flex: 0 0 100px; color: #909399; }
.value { color: #303133; }
</style>
