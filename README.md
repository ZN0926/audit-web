# audit-web · 基于大语言模型的智能代码审计系统（前端）

> 后端仓库：[graduation-audit](https://github.com/ZN0926/graduation-audit)（Spring Boot，端口 8080）
> 两个仓库分开，靠 HTTP 接口对接；接口清单见后端仓库的 `docs/接口说明.md`。

上传一段 Java / Python 源码，页面会展示"审计进行到第几块"，完成后给出：
合规率、问题分类分布、逐条违规定位（带高亮代码 + 原因 + 修复建议），并可下载 Markdown 报告或投屏 HTML 报告。

---

## 1. 四个页面

| 路由 | 页面 | 做什么 |
|---|---|---|
| `/` | 上传审计 | 拖拽或点选文件 → 上传进度 → "正在审计" → 结果卡（本次发现几处、合规率）→ 点进报告 |
| `/tasks` | 任务列表 | 所有审计任务，四态标签（排队/审计中/完成/失败），审计中的任务每 3 秒自动刷新，点行进入报告 |
| `/report/:id` | 审计报告 | 合规率环 + 一句话结论 + 分类饼图/条形图 + 逐条违规（代码高亮、行号、原因、修复建议）+ 下载 Markdown / 打开 HTML / 重算 |
| `/rules` | 规则库 | 四张统计卡（总数 / Java / Python / 跨语言归组）+ 分类柱状图 + 语言筛选 + 规则表格 + 详情抽屉（正反例、检测提示） |

左侧菜单只有 3 项，报告页从上传页或任务列表点进去，不单独占菜单项。

---

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vue 3.5（`<script setup>` 组合式 API） |
| 构建 | Vite 8 |
| UI | Element Plus 2.14 |
| 图表 | ECharts 5.6 |
| 请求 | axios 1.21（`baseURL: '/api'`，走 Vite 代理） |
| 路由 | vue-router 4（**hash 模式**，打进 Spring Boot 的 `static/` 后刷新不会 404） |
| 代码高亮 | highlight.js 11（只注册 java / python，减小体积） |

不引入 TypeScript、Pinia、Tailwind：页面只有四个，状态用 `ref` + 轮询足够，少一层就少一处出错。

---

## 3. 怎么跑

```powershell
# 1) 先把后端起起来（另一个窗口）
cd graduation-audit
mvn spring-boot:run            # 看到 Started ... in x seconds

# 2) 再起前端
cd audit-web
npm install                    # 首次
npm run dev                    # http://localhost:5173
```

`vite.config.js` 已把 `/api` 代理到 `http://localhost:8080`，所以代码里一律写 `axios.get('/api/ping')`，
**不要写域名**——分仓开发时靠代理，合并交付时靠同源，两种场景都不用改代码。

---

## 4. 和后端的约定（改代码前先看这条）

| 约定 | 说明 |
|---|---|
| 字段名 | 一律**驼峰**，如 `complianceRate`、`positiveExample`、`detectionHint`；不要写成下划线 |
| 路径 | 全部相对 `/api`，不出现 `http://localhost:8080` |
| 错误体 | 统一 `{timestamp, status, error}`，展示 `error` 字段 |
| 超时 | 上传是**同步审计**，一次 10–60 秒，`timeout` 必须 ≥ 120000 |
| 上传字段名 | `file`（FormData），单文件 ≤ 10MB，仅 `.java` / `.py` |

接口封装都在 `src/api.js`（13 个方法），新增接口先在那儿加，不要在页面里裸写 axios。

---

## 5. 目录

```
src/
├── main.js              入口：挂 router、Element Plus（中文语言包）
├── App.vue              布局：左侧菜单 + 顶部 ping 状态灯 + 右侧 router-view
├── api.js               13 个接口封装 + 响应拦截器（统一取 error）
├── router.js            4 条路由 + 兜底重定向
├── style.css            全局样式
├── components/
│   └── CodeBlock.vue    代码块：highlight.js 高亮 + 行号
└── views/
    ├── UploadView.vue   上传页
    ├── TaskListView.vue 任务列表
    ├── ReportView.vue   报告页
    └── RulesView.vue    规则库
```

---

## 6. 一次上传在页面上发生什么

```
拖入文件
  └─ 本地校验（后缀 / 大小）── 不合格则直接提示，不发请求
      └─ POST /api/audit（FormData，进度条走上传阶段）
          └─ 返回 taskId
              └─ 轮询 GET /api/audit/tasks/{id}，直到 status=DONE
                  ├─ 取 violations 数量 → 结果卡
                  ├─ POST /api/report/{id} → 报告生成
                  └─ 跳转 /report/{id}（合规率、图表、明细）
```
上传 100% ≠ 审计完成，页面会区分"正在上传"和"正在审计"两个阶段。

---

## 7. 展示约定

| 项 | 约定 |
|---|---|
| 严重级色 | HIGH `#f56c6c` / MEDIUM `#e6a23c` / LOW `#909399` / INFO `#409eff` |
| 置信度 | < 0.5 时在卡片上标"待人工确认" |
| 任务状态 | PENDING 排队 / RUNNING 审计中 / DONE 已完成 / FAILED 失败 |
| 行号写法 | 单行 `第 12 行`；区间 `第 12–20 行` |
| 百分比 | 保留 1 位小数 |

---

## 8. 构建与交付

```powershell
npm run build                                  # 产物在 dist/
# 把 dist 里全部内容拷到后端
Copy-Item dist\* ..\graduation-audit\src\main\resources\static\ -Recurse -Force
cd ..\graduation-audit
mvn clean package -DskipTests                  # 得到 55 MB 左右的单 jar
java -jar target\graduation-audit-0.0.1-SNAPSHOT.jar
```

运行时只需 JDK 21 + MySQL；前端已被打进 jar 的 `BOOT-INF/classes/static/`。

---

## 9. 常见问题

| 现象 | 原因 / 解决 |
|---|---|
| 页面能开但所有请求 404 | 后端没起，或没起在 8080；先看 `http://localhost:8080/api/ping` |
| 跨域报错 | 没走代理。检查 `vite.config.js` 的 `server.proxy`，或直接用 5173 访问 |
| 上传一直转圈 | 审计是同步的，20 秒以上正常；超过 60 秒看后端日志有没有模型超时 |
| 打包后刷新页面 404 | 路由必须是 `createWebHashHistory`，不要改成 history 模式 |
| 图表不显示 | ECharts 需要在 `nextTick` 之后 init，且容器有宽高 |
| 规则库页全 0 | 后端规则表还是空的，先跑 `docs/seed/manual-rules.json` 导入 |
