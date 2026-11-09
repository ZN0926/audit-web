<!--
【功能】全站外框：左侧菜单 + 顶栏（标题和后端状态灯）+ 右侧路由出口
【作用】所有页面共用，避免每页重复写导航
【输入】无
【输出】渲染当前路由对应的页面
【怎么用】不用手动引，main.js 挂载 App，路由自动填充 <router-view />
【例子】点"任务列表"→ 地址变 /#/tasks → 右侧显示 TaskListView
-->
<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="brand">智能代码审计</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/">上传审计</el-menu-item>
        <el-menu-item index="/tasks">任务列表</el-menu-item>
        <el-menu-item index="/rules">规则库</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <span class="title">基于大语言模型的智能代码审计系统</span>
        <span class="status">
          <i class="dot" :class="online ? 'ok' : 'bad'" />
          {{ online ? '后端已连接' : '后端未连接' }}
        </span>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'

const route = useRoute()
const online = ref(false)
let timer = null

// 报告页不属于菜单项，让它高亮"任务列表"
const activeMenu = ref('/')

// 每 20 秒探一次活，答辩演示时能直观看到后端是否还活着
async function checkHealth() {
  try {
    const r = await api.ping()
    online.value = r.db === 'connected'
  } catch {
    online.value = false
  }
}

onMounted(() => {
  activeMenu.value = route.path.startsWith('/report') ? '/tasks' : route.path
  checkHealth()
  timer = setInterval(checkHealth, 20000)
})

onBeforeUnmount(() => timer && clearInterval(timer))
</script>

<style scoped>
.layout { height: 100vh; }
.aside { background: #1f2d3d; color: #fff; }
.brand { height: 56px; line-height: 56px; text-align: center; font-size: 16px; color: #fff; letter-spacing: 1px; }
.menu { border-right: none; background: transparent; }
.menu :deep(.el-menu-item) { color: #c0c4cc; }
.menu :deep(.el-menu-item.is-active) { color: #fff; background: #263445; }
.header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 1px solid #ebeef5; }
.title { font-size: 15px; color: #303133; }
.status { font-size: 13px; color: #606266; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.dot.ok { background: #67c23a; }
.dot.bad { background: #f56c6c; }
.main { background: #f5f7fa; padding: 20px; overflow-y: auto; }
</style>
