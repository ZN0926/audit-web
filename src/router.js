/**
 * 【功能】定义 4 条路由：上传页、任务列表、报告页、规则库
 * 【作用】地址栏变了就换组件，不用刷新页面
 * 【输入】无
 * 【输出】router 实例，在 main.js 里 app.use(router)
 * 【怎么用】页面里 const router = useRouter(); router.push('/report/6')
 * 【例子】<router-link to="/tasks">任务列表</router-link>
 */
import { createRouter, createWebHashHistory } from 'vue-router'

// 用 hash 模式（地址带 #），这样打包塞进 Spring Boot static 后，
// 刷新页面不会因为后端没有对应路由而 404。
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'upload', component: () => import('@/views/UploadView.vue') },
    { path: '/tasks', name: 'tasks', component: () => import('@/views/TaskListView.vue') },
    {
      path: '/report/:id',
      name: 'report',
      component: () => import('@/views/ReportView.vue'),
      props: true, // 让组件通过 props 拿到 id
    },
    { path: '/rules', name: 'rules', component: () => import('@/views/RulesView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
