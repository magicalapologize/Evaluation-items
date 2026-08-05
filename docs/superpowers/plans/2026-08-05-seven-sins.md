# 七宗罪测试产品实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有云渡测评实验室中新增一款 35 题七宗罪主导倾向测试，包含短过场、完整结果报告、分享海报、首页卡片和 D1 测试码接入。

**Architecture:** 复用现有静态 HTML 测试页、`member-auth.js`、Canvas 海报和 Worker `/api/verify-code`。题库与结果数据放在测试目录的 ES module 文件中，纯计分函数独立导出，页面只负责状态与渲染。新增产品使用稳定 `productId: seven-sins`，正式测试码只进入 D1 和备用码文档，不进入前端。

**Tech Stack:** HTML/CSS/JavaScript ES modules、Canvas、Cloudflare Worker、D1、Node built-in test runner、现有本地预览脚本。

## Global Constraints

- 35 道题按 7 个生活主题组织，每题使用 A-E 五级程度量表。
- 7 个结果对应七宗罪的中性化主导倾向，结果字段包含独立 reminder、画像、优势、风险、适配和 3 条建议。
- 计分使用语义化主维度/辅助维度矩阵、独立匹配与展示刻度，禁止按题号或选项序号轮转。
- 过场默认约 1.8 秒，支持 `prefers-reduced-motion`，不伪造长等待。
- 海报按身份区、完整七维区、3 条建议区、二维码 CTA 区生成真实 PNG。
- 新产品不复用竞品授权码 `113324`；正确码不写入前端。
- 发布前验证全选答案、10 万份随机答卷、全部结果、6 个响应式尺寸、D1 正误停用码和真实海报。

---

### Task 1: 建立计分模型的失败测试

**Files:**
- Create: `tests/seven-sins/model.test.mjs`
- Create: `tests/seven-sins/data.mjs`
- Create: `tests/seven-sins/model.mjs`

- [ ] **Step 1: 写失败测试**

覆盖题目数量、维度数量、结果字段完整性、固定答案可产生多结果、随机答卷结果稳定和所有结果可达。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/seven-sins/model.test.mjs`
Expected: 因 `data.mjs` 与 `model.mjs` 尚不存在而失败。

### Task 2: 实现题库、结果数据和纯计分函数

**Files:**
- Modify: `tests/seven-sins/data.mjs`
- Modify: `tests/seven-sins/model.mjs`

**Interfaces:**
- `QUESTIONS`: 35 个 `{ id, scene, text, options }`，每个 option 含展示文本和七维语义分数。
- `RESULTS`: 7 个结果对象，包含 `name`, `en`, `alias`, `keywords`, `prototype`, `portrait`, `strength`, `risk`, `fit`, `advices`, `reminder`。
- `calculateProfile(answerIndexes)`: 返回原始分、展示分、主导结果、第二倾向和确定性指纹。

- [ ] **Step 1: 实现 35 道具体情境题和 7 个结果原型**
- [ ] **Step 2: 实现语义矩阵累计、原型距离、并列指纹和独立展示归一化**
- [ ] **Step 3: 运行模型测试确认通过**

Run: `node --test tests/seven-sins/model.test.mjs`

### Task 3: 实现测试页面与结果过场

**Files:**
- Create: `tests/seven-sins/index.html`
- Create: `tests/seven-sins/style.css`
- Modify: `tests/seven-sins/model.mjs`

- [ ] **Step 1: 复用现有测试码入口、会员自动解锁、答题状态和结果动作**
- [ ] **Step 2: 实现首页、答题页、短过场页和完整结果页**
- [ ] **Step 3: 加入 1.8 秒七节点点亮动画和 reduced-motion 降级**
- [ ] **Step 4: 实现 Canvas 长图海报和 `seven-sins.png` 独立二维码 CTA**
- [ ] **Step 5: 使用本地预览服务器完成一次正确码到结果页流程**

### Task 4: 接入首页和 Worker 产品白名单

**Files:**
- Modify: `index.html`
- Modify: `worker.js`
- Create: `images/cards/seven-sins.svg`

- [ ] **Step 1: 首页热门轮播和全部测评网格加入 EVA/010 七宗罪卡片**
- [ ] **Step 2: 更新首页结构化数据和统计文案**
- [ ] **Step 3: 将 `seven-sins` 加入 Worker `PRODUCT_IDS`**

### Task 5: 更新备用测试码并同步远程 D1

**Files:**
- Modify: `05.我的产品/虚拟产品/测试码更新/手动换码备用测试码.md`

- [ ] **Step 1: 增加 `seven-sins` 产品对应关系和独立备用码表**
- [ ] **Step 2: 先部署静态页面和 Worker**
- [ ] **Step 3: 使用新生成的 `SS-XXXX-XXXX` 首码写入远程 D1**
- [ ] **Step 4: 查询 D1 并验证正确、错误、停用和跨产品码**

### Task 6: 完成发布前验收

- [ ] **Step 1: 运行 Node 模型测试和 10 万份随机模拟**
- [ ] **Step 2: 在 1440×900、1366×768、390×844、390×720、360×720、320×720 验收首页、答题、过场、结果和弹窗**
- [ ] **Step 3: 打开真实 PNG 检查身份、七维、建议、二维码和 CTA**
- [ ] **Step 4: 检查控制台、横向溢出、源代码中的测试码泄露和 D1 响应状态**
