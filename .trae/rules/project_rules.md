# 项目规则 · audit-web（前端）

> 这些规则对 Trae 的所有对话自动生效。每条都是硬约定，违反即错。

## 1. 技术边界

- Vue 3.5 + Vite 8 + Element Plus 2.14 + ECharts 5.6 + axios 1.21 + vue-router 4 + highlight.js 11。
- **不要新增依赖**，确需新增先在对话里说明理由与替代方案。
- 不用 TypeScript、不用 Pinia、不用 Tailwind（这个项目规模不需要，引入只会增加答辩时的解释成本）。
- 组件一律 `<script setup>` + 组合式 API，不用 Options API。

## 2. 与后端对齐（最容易出错的地方）

- 字段名照抄后端 JSON（驼峰）：`fileName / language / status / doneChunks / totalChunks / complianceRate / summaryText / codeSnippet / startLine / endLine / ruleId / severity / confidence / reason / fixSuggestion / sourceDoc / sourceRef / evidenceQuote / detectionHint / canonicalKey`。**不许自创下划线字段名。**
- 所有请求走 `/api/...` 相对路径，**不写 `http://localhost:8080`**——开发靠 Vite 代理，打包后靠同源。
- 错误响应统一是 `{ timestamp, status, error }`，展示用 `error` 字段。
- 审计是同步接口，`timeout` 必须 ≥ 120000 毫秒。
- 上传是 `multipart/form-data`，字段名固定 `file`。

## 3. 代码风格

- 缩进 2 空格，单引号，语句不加分号（与现有文件一致）。
- 方法/函数用动词开头：`loadTasks`、`drawChart`、`openDetail`。
- 模板里不写复杂表达式；超过一行的计算提到 `computed` 里。
- 图表：`echarts.init` 必须在 `await nextTick()` 之后；组件卸载时 `dispose()`；窗口 `resize` 时 `resize()`。

## 4. 文件头注释（每个新建文件必须有）

固定六段，缺一段就算没写完：

```
【功能】这个文件做什么
【作用】它在整个系统里承担什么职责
【输入】谁调用它、传什么
【输出】产出什么
【怎么用】一行示例
【例子】一个真实的小例子
```

## 5. 工作方式

- **一次只做一个块**（F0→F5 顺序），做完对照该块「验收打勾清单」逐条给证据，再进下一块。
- 每个块的第一步：先只读、复述要改哪些文件，不要直接写。
- 不许"顺手优化"到别的块；不许改后端仓库（`F:\毕业设计\graduation-audit`）。
- 改完必须告诉你改了哪几个文件、每个文件改了什么。

## 6. 展示约定

- 严重程度色：HIGH `#f56c6c`、MEDIUM `#e6a23c`、LOW `#909399`、INFO `#409eff`。
- `confidence < 0.5` 的条目必须显示「待人工确认」角标。
- 状态四态：`PENDING` 排队中 / `RUNNING` 审计中 / `DONE` 已完成 / `FAILED` 失败。
- 行号写法：单行 `第 11 行`，区间 `第 11–13 行`。
- 百分比保留 1 位小数。
