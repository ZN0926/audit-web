/**
 * 【功能】应用入口：创建 Vue 实例，挂路由与 Element Plus
 * 【作用】一次性注册全局组件库和中文语言包，页面里就能直接用 el-xxx
 * 【输入】无
 * 【输出】把 App 渲染到 index.html 的 #app
 * 【怎么用】npm run dev / npm run build 时自动执行
 * 【例子】页面里写 <el-button type="primary">，不用再 import
 */
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(router).use(ElementPlus, { locale: zhCn }).mount('#app')
