# Task 4 Report

状态：DONE

修改：
- `finish()` 保留原有 `0 / 1000 / 2200 / 3000ms` DOM 时间点，在 loading screen 显示后启动 `duration: 2600` 的 Glyph assembly。
- loading seed 使用与模型一致的确定性答案 fingerprint；只在既有 `3000ms` 回调内调用 `calculateProfile(state.answers)`。
- 每次 loading 重建 renderer；无 Canvas 或图片加载失败时持续展示静态 fallback，不等待加载、不阻塞三个定时器；结果切换前销毁 renderer。
- loading Glyph 容器使用稳定的 `aspect-ratio: 1`；删除已不可达的旧 `.signal-map`、ring、axis、node、core 动画 CSS，保留 loading 状态文案、进度和 reduced-motion 规则。
- 新增 3 秒 loading 时间、assembly 参数和旧 signal-map 移除的契约测试；未修改题库、计分、历史、海报或结果内容。

TDD：
- RED：`node --test tests/talent-discovery/ui-compat.test.mjs`，4 passed / 1 failed；因 `app.js` 尚未引用 `loading-glyph-canvas` 而按预期失败。
- GREEN：`node --test tests/talent-discovery/ui-compat.test.mjs`，5 passed / 0 failed。

验证：
- `node --test tests/talent-discovery/*.test.mjs`：23 passed / 0 failed。
- `node --check tests/talent-discovery/app.js`：通过。
- `git diff --check`：通过。
- 独立代码审查：无 Critical / Important / Minor 问题。

关注：
- Task 1 当前 `glyph-renderer.js` 的 `play({ mode: "assembly" })` 每帧调用完整 `renderStatic(config)`，并未按时间逐步显露字符；Task 4 已按接口正确调用 `assembly` 和 `duration: 2600`，但真正的 assembly 渐进视觉仍需在 renderer 任务中补足。
