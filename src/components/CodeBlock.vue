<!--
【功能】渲染一段代码，带行号和语法高亮
【作用】报告页里把"第 N 行"和实际代码视觉对齐，评委一眼能看懂
【输入】code（代码文本）、language（java/python）、startLine（首行行号，1-based）
【输出】左侧行号 + 右侧高亮代码
【怎么用】<CodeBlock :code="f.codeSnippet" :language="task.language" :start-line="f.startLine" />
【例子】startLine=11 时，第一行左侧显示 11
-->
<template>
  <div class="code-block">
    <pre><code v-html="html" /></pre>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)

const props = defineProps({
  code: { type: String, default: '' },
  language: { type: String, default: 'java' },
  // 只用于展示：把原始行号标在左侧（见下方 lines 计算）
  startLine: { type: Number, default: 1 },
})

// 每一行前面补上行号，再用 highlight.js 整体染色
const html = computed(() => {
  const raw = props.code || ''
  const lang = props.language === 'python' ? 'python' : 'java'
  let highlighted
  try {
    highlighted = hljs.highlight(raw, { language: lang }).value
  } catch {
    highlighted = raw.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
  }
  const hlLines = highlighted.split('\n')
  const rawLines = raw.split('\n')
  const width = String(props.startLine + rawLines.length - 1).length
  return hlLines
    .map((line, i) => {
      const no = String(props.startLine + i).padStart(width, ' ')
      return `<span class="ln">${no}</span>${line || ' '}`
    })
    .join('\n')
})
</script>

<style scoped>
.code-block {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: auto;
  max-height: 420px;
}
.code-block pre { margin: 0; padding: 12px 14px; }
.code-block code { font-family: Consolas, "Courier New", monospace; font-size: 13px; line-height: 1.7; }
.code-block :deep(.ln) {
  display: inline-block;
  width: 2.6em;
  margin-right: 10px;
  color: #b1b3b8;
  text-align: right;
  user-select: none;
  border-right: 1px solid #e4e7ed;
  padding-right: 8px;
}
</style>
