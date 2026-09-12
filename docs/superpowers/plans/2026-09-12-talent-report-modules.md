# 天赋报告模块化视觉优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将天赋挖掘测试结果页的章节序号弱化为古罗马小标，并把各结果板块整理为清晰、可读、响应式的模块容器。

**Architecture:** 保留现有结果页 DOM 顺序、数据渲染和颜色系统，只为章节标题增加语义化的小标记元素，并通过结果页专用 CSS 建立模块背景、边框、间距和移动端重排。雷达图、天赋排序、结果文案、海报和按钮逻辑不变。

**Tech Stack:** HTML、CSS、现有原生 JavaScript、Node.js `node:test`、本地预览浏览器验收。

## Global Constraints

- 不修改题库、计分模型、结果文案、测试码、历史记录、二维码和海报逻辑。
- 继续使用现有 navy / pale mist / teal 配色，不引入参考图中的红色标注。
- 章节标题序列仍可被屏幕阅读器理解，但视觉上使用低对比度古罗马小标。
- 桌面和手机端都不能出现横向溢出或内容截断。

---

### Task 1: 建立结果页视觉契约

**Files:**
- Modify: `tests/talent-discovery/ui-compat.test.mjs:79-90`

**Interfaces:**
- Consumes: 现有结果页章节标题和 CSS 结构。
- Produces: 可验证的古罗马章节标记、模块容器和响应式约束。

- [x] **Step 1: Write the failing test**

增加断言：章节标题包含 `report-section-index` 标记；CSS 定义古罗马标记样式、模块背景/边框/圆角；结果板块不再只依赖底部 border；移动端保持模块间距。

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL，因为当前 HTML 没有 `report-section-index`，CSS 仍使用连续分割线。

### Task 2: 改造结果页章节标题结构

**Files:**
- Modify: `tests/talent-discovery/index.html:34-42`

**Interfaces:**
- Consumes: 现有 9 个结果板块标题。
- Produces: 每个标题包含 `<span class="report-section-index" aria-hidden="true">I</span>` 和可读标题文本。

- [x] **Step 1: Replace numeric prefixes with semantic index spans**

将 `01｜你的最佳天赋评估` 改为 `<h2><span class="report-section-index" aria-hidden="true">I</span><span>你的最佳天赋评估</span></h2>`，依次使用 `I` 到 `IX`。标题文本本身不再包含阿拉伯数字或竖线。

- [x] **Step 2: Keep section order and IDs unchanged**

不改章节顺序、动态内容容器 ID 和任何结果数据字段，确保历史回放及脚本继续工作。

### Task 3: 应用模块化结果页样式

**Files:**
- Modify: `tests/talent-discovery/style.css:50-61`

**Interfaces:**
- Consumes: Task 2 生成的 `.report-section-index` 标记。
- Produces: 桌面和移动端的结果模块视觉层级。

- [x] **Step 1: Style section shells**

把 `.report-section` 改为 `margin-block` + `padding` + `border` + `border-radius` 的独立模块，背景使用 `var(--paper)` 或白色，移除贯穿式 `border-bottom`。

- [x] **Step 2: Style section headings and Roman index**

章节标题使用 flex 对齐；小标使用低对比度 teal/navy、较小字号、窄字宽和细竖线分隔，标题文字保持主层级。

- [x] **Step 3: Preserve nested data cards without excessive nesting**

保留天赋排序、活跃天赋、职业赛道和策略条目的现有卡片，但调整背景、间距和边框，使其成为板块内部的内容层，而不是与章节容器争夺层级。

- [x] **Step 4: Add responsive module rules**

在 `max-width:760px` 下减小模块内边距和标题字号，保持列表单列、文本可换行和 `scrollWidth <= innerWidth`。

### Task 4: 验证视觉与回归

**Files:**
- Test: `tests/talent-discovery/ui-compat.test.mjs`
- Runtime: `tests/talent-discovery/index.html`, `style.css`, `app.js`

- [x] **Step 1: Run automated checks**

Run: `node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && git diff --check`

Expected: 全部测试通过，JavaScript 语法检查通过，diff 无空白错误。

- [x] **Step 2: Run Impeccable detector**

Run: `node /Users/yunfan/.codex/skills/impeccable/scripts/detect.mjs --json tests/talent-discovery/index.html tests/talent-discovery/style.css`

Expected: 无未解释的严重布局或可访问性问题。

- [x] **Step 3: Browser acceptance**

在本地预览中打开结果页，检查 `1440×900`、`390×844`、`390×720`、`360×720`、`320×720`：章节小标弱化、模块边界清楚、内容不溢出，且结果数据与按钮功能未受影响。
