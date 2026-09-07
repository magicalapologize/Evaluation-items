# 天赋挖掘测试 Glyph 视觉改造设计

**日期：** 2026-09-07  
**状态：** 已确认 B 方案，待进入实现计划  
**范围：** `tests/talent-discovery/` 的首页、结果页和完成测试过场

## 1. 目标与非目标

### 目标

把现有天赋挖掘测试的主视觉改造成参考图所示的 ASCII/Glyph 风格：用字符密度表现图像明暗，用天赋专属颜色表达结果信号，同时保留中文 DOM 信息层的清晰阅读和可操作性。

成功标准：

- 首页、结果页和过场均出现非空、稳定的字符视觉；重要中文信息不绘制在 Canvas 中。
- 结果页根据 `profile.bestKey` 使用对应天赋素材和天赋颜色；八项天赋仍按分数从高到低排列。
- 完成测试过场总时长固定为 3 秒，计分、历史保存和进入结果页时机不改变。
- Canvas 不可用、素材加载失败、用户开启减少动画或设备性能不足时，不出现空白页面和卡死流程。
- 在 `1440 × 900`、`1366 × 768`、`390 × 844`、`390 × 720`、`360 × 720`、`320 × 720` 下无横向溢出、无 DOM 遮挡和控制台错误。

### 非目标

- 不重写题库、计分模型、结果文案、测试码验证、历史回放、海报生成和二维码承接。
- 不把中文标题、题目、分数、按钮或报告正文绘制进 Canvas。
- 不引入 WebGL、第三方渲染库或新的运行时依赖。
- 不将 Canvas 字符图作为唯一的信息表达；颜色不能成为唯一的排名或状态编码。

## 2. 现有边界与页面信息架构

产品当前由 `index.html` 提供四个状态：`home-screen`、`quiz-screen`、`loading-screen`、`result-screen`。本次只在三个视觉状态插入 Canvas，答题页结构不改。

### 首页

- 保留现有品牌、标题“天赋挖掘测试｜找到你的天赋领域”、40 道题/8 项维度/9 个报告模块、测试码输入和验证按钮。
- 在首页右侧主视觉区域加入 `canvas#home-glyph-canvas`，源图使用 `home-hero.png`。
- 桌面端 Canvas 置于入口卡片或主视觉列中，不能盖住输入框、错误提示和按钮；移动端按单列顺序放在标题与入口之间或入口之后，首屏仍优先显示标题和测试码入口。
- Canvas 使用低亮度的多色天赋信号，避免抢过白色信息层。

### 答题页

- 不加入 Glyph，保留现有题号、进度、选项、上一题和自动跳题逻辑。
- `finish()` 的答案收集、`calculateProfile()`、历史保存和结果渲染顺序保持兼容。

### 完成测试过场

- 保留现有 3 秒时间点：`0ms` 初始化、`1000ms` 显示 `05 / 08`、`2200ms` 显示 `08 / 08`、`3000ms` 进入结果页。
- 将现有环形节点主视觉替换为 `canvas#loading-glyph-canvas`，旁边的 `loading-state`、`loading-detail`、`loading-count` 和进度条继续使用 DOM，确保读屏和低性能设备可读。
- 过场字符按三个阶段组装：`0–800ms` 稀疏暗部字符，`800–1800ms` 形成八个颜色区域，`1800–2600ms` 收束为完整图像，`2600–3000ms` 稳定显示后切换。
- 过场不得在动画期间提前计算或保存不同于现有正式流程的结果；可以使用答案临时画像选择颜色，但最终仍在 3000ms 回调中调用现有 `calculateProfile()` 并保存。

### 结果页

- 保留顶部最佳天赋、辅助天赋、标签、摘要，以及 9 个报告模块、雷达图、动作按钮、历史入口和弹窗。
- 在结果顶部加入 `canvas#result-glyph-canvas`；源图按 `profile.bestKey` 从八个素材中选择：`language.png`、`logic.png`、`spatial.png`、`body.png`、`music.png`、`interpersonal.png`、`introspection.png`、`nature.png`。
- 结果 Glyph 使用最佳天赋的专属颜色；现有 `--talent-color` 仍控制标题、维度名称、进度条、雷达标签和海报相关色彩。
- Glyph 仅作为视觉证据，最佳天赋名称、分数和报告正文继续由真实 DOM 呈现。

## 3. Glyph 渲染器边界

新增 `tests/talent-discovery/glyph-renderer.js`，不耦合题库和报告数据。渲染器负责源图加载、采样、亮度转换、字符绘制、动画调度、Canvas 尺寸和 fallback。

建议公开接口：

```js
export function createGlyphRenderer(canvas, options = {})
// 返回：
// { load(source), renderStatic(config), play(config), pause(), destroy() }
```

`config` 至少包含：

```js
{
  source: string | HTMLImageElement,
  palette: string[],
  background: string,
  mode: "static" | "assembly",
  duration: number,
  seed: number
}
```

渲染器不读取全局 `state`，由 `app.js` 在首页、结果页和过场初始化时传入配置。渲染器销毁时取消 `requestAnimationFrame`、移除 `ResizeObserver`/事件监听并释放图像引用，避免重复测试积累动画。

## 4. 采样、字符密度与颜色管线

### 采样网格

- 根据 Canvas CSS 宽度和设备像素比动态计算网格，不固定列数。
- 桌面端目标约 `96–120` 列、`56–72` 行；移动端目标约 `52–72` 列、`32–46` 行。
- 以字体实际宽高比修正单元格纵横比，避免人物或插画被拉扁。
- Canvas 实际像素尺寸为 CSS 尺寸乘以 `min(devicePixelRatio, 2)`，避免高 DPR 手机产生过大绘制成本。

### 线性光与 Gamma

Canvas 源图像的 sRGB 通道不能直接作为亮度。每个采样像素按以下管线处理：

1. 将 sRGB 通道解码为线性 RGB：`c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`。
2. 使用相对亮度：`Y = 0.2126R + 0.0722G + 0.0722B`。
3. 对本次图像的有效亮度做黑点/白点归一化，并限制在 `[0, 1]`。
4. 使用可调 gamma（默认 `0.88`）调整字符密度，让暗部保留轮廓、亮部不过曝。
5. 字符颜色在目标线性颜色与背景线性颜色之间混合，再编码回 sRGB，避免彩色字符整体发灰。

### 字符映射

默认从稀疏到密集使用：

```text
. : - = + * # % @
```

亮度映射必须单调：亮度越高，字符索引不能降低。每个单元格同时保留 `opacity` 和颜色，低于可见阈值的像素不绘制或使用低透明度 `.`，以保持暗部空间。

### 调色

基础颜色沿用现有设计系统：深海蓝 `#142A43`、青绿色 `#2CB7A5`、珊瑚橙 `#FF8A65`、暖黄色 `#F5C451`、米白 `#F5F8F6`。结果页和过场从八项天赋色中选择颜色；颜色经过相对亮度限制后再绘制，避免青绿、紫色或棕色在深色背景中失去可读性。

## 5. 动画与生命周期

- 静态渲染使用一次绘制；动画只在 `mode: "assembly"` 时申请 `requestAnimationFrame`。
- 首页和结果页默认使用轻微的字符漂移/亮度呼吸，时间常数不超过 4 秒，避免干扰阅读。
- 过场使用确定性 `seed` 生成字符出现顺序，同一答卷在相同设备上不会出现明显跳变。
- 使用 `document.visibilityState`：页面隐藏时暂停帧循环，重新可见时继续；不延长 3 秒过场的业务计时。
- 监听 `matchMedia("(prefers-reduced-motion: reduce)")`。减少动画时直接渲染最终静态 Glyph，并保留 DOM 进度文字与 3 秒流程时序。
- Canvas 失败时显示对应原图作为背景或图片 fallback：首页 `home-hero.png`，结果页最佳天赋素材，过场使用静态 `home-hero.png` 或已有深色结构。

## 6. 性能、响应式与无障碍

- 单帧只处理当前网格，不创建每个字符的 DOM 节点。
- 图片只加载一次并缓存 Promise；重复进入结果页复用已加载素材。
- 当 Canvas CSS 宽度小于 `320px`、设备内存/并发帧表现异常或绘制耗时连续超过约 `32ms` 时降级到静态渲染。
- Canvas 设置 `aria-hidden="true"`；所有重要信息均存在于可聚焦 DOM。
- 保留现有键盘焦点、按钮语义、错误 `role="alert"` 和进度条 ARIA 属性。
- Canvas 使用 `pointer-events: none`，不截获输入框、按钮或报告操作。
- 断点沿用现有 `760px`，移动端缩小视觉区域和字符密度，不缩小题目与结果正文到不可读尺寸。

## 7. 文件变更范围

```text
tests/talent-discovery/index.html       # 三个 Canvas 挂载点和 fallback 容器
tests/talent-discovery/style.css        # Glyph 布局、尺寸、移动端与降级样式
tests/talent-discovery/app.js           # 初始化渲染器、结果素材/颜色选择、过场生命周期
tests/talent-discovery/glyph-renderer.js # 新增，采样、Gamma、字符绘制与动画
tests/talent-discovery/glyph-renderer.test.mjs # 新增，纯函数和生命周期契约测试
tests/talent-discovery/ui-compat.test.mjs      # 增补 Canvas、fallback、3 秒契约
```

不改 `data.mjs`、`model.mjs` 的题库和计分算法；只有在测试需要稳定的素材映射时，才允许增加不影响结果计算的只读元数据。

## 8. 测试计划

### 单元测试

- sRGB ↔ 线性 RGB 转换输出在 `[0, 1]`，不产生 `NaN` 或无穷值。
- 亮度到字符索引单调，边界亮度分别得到稀疏和密集字符。
- 颜色混合输出为合法 RGB/RGBA，透明度被限制在 `[0, 1]`。
- 固定 `seed` 生成稳定的字符出现顺序。
- `prefers-reduced-motion` 分支不启动帧循环；`destroy()` 后不再调度帧。

### 现有回归

```bash
node --test tests/talent-discovery/*.test.mjs
node --check tests/talent-discovery/app.js
node --check tests/talent-discovery/glyph-renderer.js
git diff --check
```

### 浏览器验收

使用真实页面完成：正确码/错误码、40 道题、上一题修改、结果页、历史回放、保存海报、复制摘要、好评返现和重新测试。逐一检查六个目标 viewport：

- Canvas 像素非空，Glyph 未被 CSS 隐藏或裁切；
- 首页测试码入口、结果页最佳天赋名称和过场状态文字清晰；
- 过场从显示到结果切换实际持续 3 秒；
- 页面 `document.documentElement.scrollWidth <= window.innerWidth`；
- 控制台无错误，Canvas 失败时仍能看到图片或深色 fallback；
- 结果页八项天赋仍按分数降序，雷达、海报和报告文案未回归。

## 9. 发布验收标准

发布前必须同时满足：

1. 13 项现有测试及新增 Glyph 测试全部通过。
2. 三处 Canvas 均有可见内容，且不承载必要文字。
3. 过场固定 3 秒，最终结果仍由正式 `calculateProfile()` 生成并保存。
4. 8 个最佳天赋素材映射正确，颜色与 DOM 标题和维度展示一致。
5. `prefers-reduced-motion`、图片加载失败、Canvas 不可用和页面隐藏均有可验证降级行为。
6. 桌面与移动六种尺寸无横向溢出、遮挡和明显掉帧。
7. 不引入新依赖，不写入测试码，不改变现有报告业务和商品承接流程。
