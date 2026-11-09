<!--
【功能】展示全部审计任务，带状态标签、代码块进度，并支持点击进入报告
【作用】历史任务可回看，答辩演示不必现场调模型
【输入】无（从 /api/audit/tasks 拉取）
【输出】表格；行点击跳转 /#/report/:id
【怎么用】左侧菜单点"任务列表"
【例子】看到 BadDemo.java / java / 完成 / 3/3，点它进入报告页
-->
<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>审计任务<el-tag v-if="runningCount" type="warning" class="ml"> {{ runningCount }} 个进行中 </el-tag></span>
          <div>
            <el-switch v-model="autoRefresh" active-text="自动刷新" class="mr" />
            <el-button :loading="loading" @click="load">刷新</el-button>
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
        description="任务列表加载失败，请确认后端是否启动后点「刷新」"
      />

      <el-table
        v-loading="loading"
        :data="tasks"
        stripe
        highlight-current-row
        :empty-text="loadError ? '加载失败，请确认后端是否启动' : '还没有审计记录，去「上传审计」传一个 .java 或 .py 文件'"
        @row-click="openReport"
        class="table"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="language" label="语言" width="90">
          <template #default="{ row }">
            <el-tag :type="row.language === 'java' ? 'warning' : 'success'" size="small">
              {{ row.language }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="percent(row)"
              :status="row.status === 'FAILED' ? 'exception' : undefined"
              :stroke-width="10"
            />
            <span class="chunk">{{ row.doneChunks }}/{{ row.totalChunks }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="150">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="{ row }">{{ cost(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openReport(row)">看报告</el-button>
            <el-tooltip v-if="row.status === 'FAILED'" :content="row.errorMsg || '未知错误'" placement="top">
              <el-button link type="danger" @click.stop>原因</el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { fmtTime, statusText, statusType } from '@/utils/format'

const router = useRouter()

const tasks = ref([])
const loading = ref(false)
const loadError = ref('')
const autoRefresh = ref(true)
let timer = null

const runningCount = computed(() => tasks.value.filter((t) => t.status === 'RUNNING').length)

function percent(row) {
  if (row.status === 'FAILED') return 100
  if (!row.totalChunks) return row.status === 'DONE' ? 100 : 0
  return Math.min(100, Math.round((row.doneChunks / row.totalChunks) * 100))
}

function cost(row) {
  if (!row.createdAt || !row.finishedAt) return '-'
  const s = Math.round((new Date(row.finishedAt) - new Date(row.createdAt)) / 1000)
  return s < 60 ? `${s} 秒` : `${(s / 60).toFixed(1)} 分`
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    tasks.value = await api.tasks()
    loadError.value = ''
  } catch (e) {
    loadError.value = e.message
    if (!silent) ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function openReport(row) {
  router.push(`/report/${row.id}`)
}

// 轮询：有 RUNNING 且开关打开时才每 3 秒拉一次，避免空转
function syncTimer() {
  if (timer) { clearInterval(timer); timer = null }
  if (autoRefresh.value && runningCount.value > 0) {
    timer = setInterval(() => load(true), 3000)
  }
}

watch([runningCount, autoRefresh], syncTimer)

onMounted(async () => {
  await load()
  syncTimer()
})

onBeforeUnmount(() => timer && clearInterval(timer))
</script>

<style scoped>
.page { max-width: 1180px; margin: 0 auto; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.ml { margin-left: 8px; }
.mr { margin-right: 12px; }
.table { cursor: pointer; }
.chunk { font-size: 12px; color: #909399; }
</style>
