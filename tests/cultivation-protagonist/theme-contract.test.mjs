import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("提供可记忆且可访问的青玉/玄夜主题切换", () => {
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /aria-pressed=/);
  assert.match(html, /cultivation-protagonist-theme/);
  assert.match(html, /html\[data-theme="dark"\]/);
  assert.match(html, /meta\[name="theme-color"\]/);
});

test("暗色主题单独适配角色立绘并保留既定透明度", () => {
  assert.match(html, /html\[data-theme="dark"\]\s+\.result-character-art\s*\{/);
  assert.match(html, /html\[data-theme="dark"\]\s+\.result-character-art img\s*\{/);
  assert.match(html, /\.result-character-art\s*\{\s*opacity:\s*\.5;\s*\}/);
  assert.match(html, /@media\s*\(max-width:\s*680px\)\s*\{\s*\.result-character-art\s*\{\s*opacity:\s*\.45;/);
});
