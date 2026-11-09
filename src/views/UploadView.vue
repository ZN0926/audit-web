<!--
【功能】上传代码文件并触发审计，展示"上传中 → 审计中 → 完成/失败"三段状态
【作用】系统的入口页，把文件交给后端 /api/upload（该接口同步跑完审计）
【输入】用户拖入或选择的 .java / .py 文件（≤10MB）
【输出】taskId + 语言 + 代码块数 + 违规数；点击按钮跳转报告页
【怎么用】打开首页即可，无需参数
【例子】拖入 BadDemo.java → 显示"发现 3 处问题" → 点"查看报告"进入 /#/report/6
-->
<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>上传代码文件，自动审计</span>
          <span class="hint">支持 .java / .py，单文件 ≤ 10MB</span>
        </div>
      </template>

      <!-- 拖拽区：auto-upload 交给自定义 http-request，避免默认上传行为 -->
      <el-upload
        drag
        :show-file-list="false"
        :http-request="doUpload"
        :before-upload="beforeUpload"
        :disabled="busy"
        accept=".java,.py"
      >
        <div class="drop">
          <div class="drop-icon">⬆</div>
          <div class="drop-text">把文件拖到这里，或<em>点击选择</em></div>
          <div class="drop-sub">Java / Python</div>
        </div>
      </el-upload>

      <!-- 选中的文件信息 -->
      <div v-if="file" class="file-row">
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ fmtSize(file.size) }}</span>
      </div>

      <!-- 三段状态：上传中 / 审计中 / 完成 -->
      <div v-if="stage === 'uploading'" class="stage">
        <el-progress :percentage="progress" :stroke-width="14" />
        <div class="stage-text">正在上传… {{ progress }}%</div>
      </div>

      <div v-if="stage === 'auditing'" class="stage">
        <el-progress :percentage="100" :stroke-width="14" status="success" />
        <div class="stage-text">
          <el-icon class="is-loading"><Loading /></el-icon>
          文件已上传，正在审计，请稍候（约 10–60 秒，期间请勿关闭页面）
        </div>
      </div>

      <el-result
        v-if="stage === 'done' && result"
        icon="success"
        title="审计完成"
        :sub-title="`${result.language} · 共 ${result.taskId ? '' : ''}${chunksText}`"
      >
        <template #extra>
          <div class="done-line">
            文件：<b>{{ result.fileName }}</b>
            <el-tag class="ml" type="info">{{ result.language }}</el-tag>
            <el-tag class="ml" type="danger">发现 {{ violations }} 处问题</el-tag>
          </div>
          <div class="actions">
            <el-button type="primary" @click="goReport">查看报告</el-button>
            <el-button @click="reset">再传一个</el-button>
          </div>
        </template>
      </el-result>

      <el-alert
        v-if="stage === 'error'"
        type="error"
        :closable="false"
        show-icon
        class="mt"
        :title="errorMsg"
      >
        <template #default>
          <el-button link type="primary" @click="reset">重新选择文件</el-button>
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { fmtSize } from '@/utils/format'

const router = useRouter()

const stage = ref('idle') // idle | uploading | auditing | done | error
const progress = ref(0)
const file = ref(null)
const result = ref(null)
const violations = ref(0)
const errorMsg = ref('')

// 只要有一个阶段在跑，就禁止再次选择文件
const busy = computed(() => stage.value === 'uploading' || stage.value === 'auditing')

const chunksText = computed(() =>
  result.value ? `任务 #${result.value.taskId} 已创建` : '',
)

// 本地先挡一层：后缀、大小。返回 false 会终止上传流程
function beforeUpload(f) {
  const okExt = /\.(java|py)$/i.test(f.name)
  if (!okExt) {
    ElMessage.error('只支持 .java 和 .py 文件')
    return false
  }
  if (f.size > 10 * 1024 * 1024) {
    ElMessage.error('文件超过 10MB，请拆分后再传')
    return false
  }
  file.value = f
  return true
}

// el-upload 的自定义请求：我们自己调 api.upload，好拿到进度与业务字段
async function doUpload(options) {
  stage.value = 'uploading'
  progress.value = 0
  errorMsg.value = ''
  try {
    const res = await api.upload(options.file, (p) => {
      progress.value = p
      if (p >= 100) stage.value = 'auditing' // 上传完立刻切到"审计中"
    })
    result.value = res
    // 审计完再查一次违规数（upload 只返回 taskId）
    try {
      const detail = await api.task(res.taskId)
      violations.value = detail.violations ?? 0
    } catch {
      violations.value = 0
    }
    stage.value = 'done'
  } catch (e) {
    stage.value = 'error'
    errorMsg.value = e.message
  }
}

function goReport() {
  if (result.value?.taskId) router.push(`/report/${result.value.taskId}`)
}

function reset() {
  stage.value = 'idle'
  progress.value = 0
  file.value = null
  result.value = null
  violations.value = 0
  errorMsg.value = ''
}
</script>

<style scoped>
.page { max-width: 860px; margin: 0 auto; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.hint { font-size: 12px; color: #909399; }
.drop { padding: 26px 0; }
.drop-icon { font-size: 34px; color: #c0c4cc; }
.drop-text { margin-top: 6px; color: #606266; }
.drop-text em { color: #409eff; font-style: normal; }
.drop-sub { margin-top: 4px; font-size: 12px; color: #c0c4cc; }
.file-row { margin-top: 12px; font-size: 13px; color: #606266; }
.file-name { margin-right: 10px; color: #303133; font-weight: 500; }
.stage { margin-top: 18px; }
.stage-text { margin-top: 10px; font-size: 13px; color: #606266; display: flex; align-items: center; gap: 6px; }
.done-line { margin-bottom: 14px; font-size: 14px; }
.ml { margin-left: 8px; }
.actions { display: flex; gap: 10px; justify-content: center; }
.mt { margin-top: 16px; }
</style>
