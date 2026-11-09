<!--
【功能】展示规则库：总量统计、分类分布图、规则列表、单条规则的详情抽屉
【作用】让"规则从规范里来"这件事可被看见，答辩时用于说明规则的可解释性
【输入】无；可选语言筛选与条数
【输出】统计卡 + 图表 + 表格 + 抽屉
【怎么用】左侧菜单点"规则库"
【例子】筛 python → 97 条；点 PY-BANDIT-B608 看到 SQL 注入的检测提示与正反例
-->
<template>
  <div class="page">
    <!-- 四张统计卡 -->
    <el-row :gutter="16" class="row">
      <el-col :span="6" v-for="c in cards" :key="c.label">
        <el-card shadow="never" class="card">
          <div class="num">{{ c.value }}</div>
          <div class="label">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分类分布 -->
    <el-card shadow="never" class="row">
      <template #header>
        <div class="card-header">
          <span>分类分布</span>
          <span class="hint">共 {{ stats?.total ?? 0 }} 条 · {{ Object.keys(stats?.byCategory || {}).length }} 个类别</span>
        </div>
      </template>
      <div ref="chartRef" class="chart"></div>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>规则列表</span>
          <div class="filters">
            <el-select v-model="language" style="width: 130px" @change="loadRules">
              <el-option label="全部语言" value="" />
              <el-option label="Java" value="java" />
              <el-option label="Python" value="python" />
            </el-select>
            <el-select v-model="limit" style="width: 110px; margin-left: 8px" @change="loadRules">
              <el-option :value="20" label="20 条" />
              <el-option :value="50" label="50 条" />
              <el-option :value="100" label="100 条" />
              <el-option :value="300" label="300 条" />
            </el-select>
          </div>
        </div>
      </template>

      <el-alert
        v-if="loadError"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        :title="loadError"
        description="规则库加载失败，请确认后端是否启动后刷新页面"
      />

      <el-table
        v-loading="loading"
        :data="rules"
        stripe
        highlight-current-row
        :empty-text="loadError ? '加载失败，请确认后端是否启动' : '规则库为空，先执行导入命令（见接口说明第 5 节）'"
        @row-click="openDetail"
        class="table"
      >
        <el-table-column prop="ruleId" label="规则 ID" width="260" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="130">
          <template #default="{ row }"><el-tag size="small">{{ row.category }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="cwe" label="CWE" width="100" />
        <el-table-column label="等级" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="sevType(row.severity)" effect="dark">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sourceDoc" label="来源" width="150" show-overflow-tooltip />
      </el-table>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawer" size="46%" :title="current?.ruleId || '规则详情'">
      <template v-if="current">
        <div class="d-title">{{ current.title }}</div>
        <div class="d-meta">
          <el-tag size="small">{{ current.category }}</el-tag>
          <el-tag size="small" class="ml" type="info">{{ current.cwe }}</el-tag>
          <el-tag size="small" class="ml" :type="sevType(current.severity)" effect="dark">{{ current.severity }}</el-tag>
          <el-tag size="small" class="ml" type="success">{{ current.detectability }}</el-tag>
          <el-tag size="small" class="ml" type="info">{{ current.language }}</el-tag>
        </div>

        <el-divider content-position="left">描述</el-divider>
        <p class="d-text">{{ current.description || '—' }}</p>

        <el-divider content-position="left">检测提示（喂给模型的线索）</el-divider>
        <p class="d-text">{{ current.detectionHint || '—' }}</p>

        <el-divider content-position="left">证据原文（A 通道）</el-divider>
        <p class="d-text quote">{{ current.evidenceQuote || '—（B 通道结构化规则没有证据原文）' }}</p>

        <el-divider content-position="left">正例（违规写法）</el-divider>
        <pre class="d-code">{{ current.positiveExample || '—' }}</pre>

        <el-divider content-position="left">反例（正确写法）</el-divider>
        <pre class="d-code">{{ current.negativeExample || '—' }}</pre>

        <el-divider content-position="left">来源</el-divider>
        <p class="d-text">
          {{ current.sourceDoc || '—' }} / {{ current.sourceRef || '—' }} ·
          跨语言归键 {{ current.canonicalKey || '—' }}
        </p>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import api from '@/api'

const stats = ref(null)
const rules = ref([])
const loading = ref(false)
const loadError = ref('')
const language = ref('')
const limit = ref(20)
const drawer = ref(false)
const current = ref(null)

const chartRef = ref(null)
let chart = null

const sevType = (s) => ({ HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }[s] || 'info')

const cards = computed(() => [
  { label: '规则总数', value: stats.value?.total ?? '—' },
  { label: 'Java', value: stats.value?.byLanguage?.java ?? '—' },
  { label: 'Python', value: stats.value?.byLanguage?.python ?? '—' },
  { label: '跨语言归键', value: stats.value?.canonicalGroups ?? '—' },
])

async function loadStats() {
  try {
    stats.value = await api.ruleStats()
    loadError.value = ''
    await nextTick()
    drawChart()
  } catch (e) {
    loadError.value = e.message
    ElMessage.error(e.message)
  }
}

async function loadRules() {
  loading.value = true
  try {
    rules.value = await api.rules(language.value || undefined, limit.value)
  } catch (e) {
    loadError.value = e.message
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function drawChart() {
  if (!chartRef.value || !stats.value) return
  chart = chart || echarts.init(chartRef.value)
  const entries = Object.entries(stats.value.byCategory || {}).sort((a, b) => b[1] - a[1])
  chart.setOption({
    grid: { left: 8, right: 20, top: 14, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(([k]) => k), axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'bar',
      data: entries.map(([, v]) => v),
      barMaxWidth: 36,
      itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', fontSize: 11 },
    }],
  }, true)
}

function openDetail(row) {
  current.value = row
  drawer.value = true
}

function resize() { chart?.resize() }

onMounted(() => {
  loadStats()
  loadRules()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>

<style scoped>
.page { max-width: 1180px; margin: 0 auto; }
.row { margin-bottom: 16px; }
.card { text-align: center; padding: 6px 0; }
.num { font-size: 26px; font-weight: 600; color: #303133; }
.label { margin-top: 6px; font-size: 13px; color: #909399; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.hint { font-size: 12px; color: #909399; }
.filters { display: flex; align-items: center; }
.chart { height: 280px; }
.table { cursor: pointer; }
.d-title { font-size: 17px; font-weight: 600; margin-bottom: 10px; }
.d-meta { display: flex; flex-wrap: wrap; }
.ml { margin-left: 8px; }
.d-text { line-height: 1.8; color: #303133; margin: 4px 0; }
.quote { color: #606266; font-style: italic; background: #f5f7fa; padding: 8px 10px; border-radius: 4px; }
.d-code { background: #fafafa; border: 1px solid #ebeef5; border-radius: 4px; padding: 10px; font-size: 13px; overflow: auto; }
</style>
