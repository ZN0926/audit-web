# audit-web · 智能代码审计系统前端

后端在 `F:\毕业设计\graduation-audit`（Spring Boot，8080），本仓库是它的前端（Vue 3 + Vite，5173）。
两个仓库分开，靠 HTTP 接口对接；接口清单见后端仓库的 `docs\接口说明.md`。

## 怎么跑

```powershell
# 1) 先起后端（另一个窗口）
cd F:\毕业设计\graduation-audit
mvn spring-boot:run          # 看到 Started ... in x seconds 即可

# 2) 再起前端
cd F:\毕业设计\audit-web
npm install                  # 首次
npm run dev                  # http://localhost:5173
```

`vite.config.js` 已把 `/api` 代理到 `http://localhost:8080`，所以代码里写 `axios.get('/api/ping')` 就行，不用拼域名，也不会有跨域问题。

## 目录约定

```
src/
├── main.js          入口：挂 router、Element Plus
├── App.vue          布局：左侧菜单 + 右侧 router-view
├── api.js           13 个接口的封装（照后端 docs/接口说明.md 第 10.1 节）
├── router.js        4 条路由
├── components/      复用组件（代码块、统计卡片等）
└── views/
    ├── UploadView.vue      上传 + 进度 + "审计中"
    ├── TaskListView.vue    任务列表 + 轮询
    ├── ReportView.vue      合规率 + 明细 + 图表
    └── RulesView.vue       规则库统计 + 列表
```

## 已经装好的依赖

| 包 | 用途 |
|---|---|
| vue 3.5 / vue-router 4 | 页面与路由 |
| element-plus 2 | UI 组件（表格、上传、抽屉、进度条） |
| echarts 5 | 报告页与规则库页的图表 |
| axios | 请求 |
| highlight.js 11 | 报告页代码高亮 |

## 注意

- 上传接口是**同步审计**：一次请求可能要 10–60 秒，axios 的 `timeout` 必须 ≥120000。
- 后端返回的错误统一是 `{timestamp, status, error}`，直接展示 `error` 字段即可。
- 答辩交付时：`npm run build` → 把 `dist/` 拷到后端的 `src/main/resources/static/` → `mvn package`，得到一个 jar。
