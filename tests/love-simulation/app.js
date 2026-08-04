import { ROLES } from "./data.js";
import { calculateResult } from "./model.js";

const $ = (id) => document.getElementById(id);
const state = { roleKey: null, index: 0, answers: [], lastResult: null };
let activeMember = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyMemberAccess(member) {
  activeMember = member && member.active ? member : null;
  $("member-unlock").classList.toggle("is-visible", Boolean(activeMember));
  document.querySelector("#home-screen .gate-row").classList.toggle("member-access-active", Boolean(activeMember));
  document.querySelector("#home-screen .demo").classList.toggle("member-access-hidden", Boolean(activeMember));
  if (activeMember) {
    $("member-plan-label").textContent = `${activeMember.planLabel} · ${YunduMember.formatExpiry(activeMember)}`;
    document.querySelector(".access-head strong").textContent = "会员通道已开启";
    $("start-btn").textContent = "会员直接开始";
  }
}

const memberReady = YunduMember.getMember().then(applyMemberAccess).catch(() => null);

async function verifyAccessCode(code) {
  let response;
  try {
    response = await fetch("/api/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "love-simulation", code })
    });
  } catch {
    throw new Error("网络连接失败，请检查网络后重试");
  }
  let result;
  try { result = await response.json(); } catch { throw new Error("验证服务返回异常，请稍后再试"); }
  if (!response.ok || !result.success) throw new Error(result.message || "测试码验证失败");
}

function renderRoles() {
  $("role-grid").innerHTML = Object.entries(ROLES).map(([key, role], index) => `
    <button class="role-card" style="--role-accent:${role.accent}" type="button" data-role="${key}">
      <img src="${role.portrait}" alt="${role.name}原创角色立绘" />
      <span class="role-card-body"><span class="role-number">DATE 0${index + 1}</span><h3>${role.name}</h3><p>${role.role}</p><span class="role-card-tags">${role.tags.map((tag) => `<span>${tag}</span>`).join("")}</span></span>
    </button>
  `).join("");
  document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => selectRole(button.dataset.role)));
}

function selectRole(roleKey) {
  state.roleKey = roleKey;
  state.index = 0;
  state.answers = [];
  state.lastResult = null;
  const role = ROLES[roleKey];
  $("quiz-role-image").src = role.portrait;
  $("quiz-role-image").alt = `${role.name}原创角色立绘`;
  $("quiz-role-name").textContent = role.name;
  $("quiz-role-label").textContent = role.role;
  renderQuestion();
  showScreen("quiz-screen");
}

function renderQuestion() {
  const role = ROLES[state.roleKey];
  const current = role.questions[state.index];
  const number = state.index + 1;
  $("stage-name").textContent = current.stage;
  $("progress-text").textContent = `${number} / ${role.questions.length}`;
  $("progress-bar").style.width = `${number / role.questions.length * 100}%`;
  $("scene-name").textContent = current.scene;
  $("question-count").textContent = `LEVEL ${String(number).padStart(2, "0")}`;
  $("question-text").textContent = current.prompt;
  $("answer-list").innerHTML = current.options.map((answer, index) => `
    <button class="answer-button${state.answers[state.index] === index ? " selected" : ""}" type="button" data-answer="${index}">
      <span class="answer-letter">${String.fromCharCode(65 + index)}</span><span class="answer-text">${answer.text}</span>
    </button>
  `).join("");
  $("prev-btn").disabled = state.index === 0;
  document.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
    state.answers[state.index] = Number(button.dataset.answer);
    button.classList.add("selected");
    setTimeout(() => {
      if (state.index < role.questions.length - 1) { state.index += 1; renderQuestion(); }
      else { renderResult(); showScreen("result-screen"); }
    }, 100);
  }));
}

function radarPoint(index, value) {
  const angle = -Math.PI / 2 + index * Math.PI / 3;
  const radius = 126 * value / 100;
  return [210 + Math.cos(angle) * radius, 184 + Math.sin(angle) * radius];
}

function renderRadar(dimensions) {
  const rings = [20, 40, 60, 80, 100].map((value) => `<polygon class="radar-grid" points="${dimensions.map((_, index) => radarPoint(index, value).join(",")).join(" ")}" />`).join("");
  const axes = dimensions.map((_, index) => { const [x, y] = radarPoint(index, 100); return `<line class="radar-axis" x1="210" y1="184" x2="${x}" y2="${y}" />`; }).join("");
  const area = dimensions.map((dimension, index) => radarPoint(index, dimension.value).join(",")).join(" ");
  const dots = dimensions.map((dimension, index) => { const [x, y] = radarPoint(index, dimension.value); return `<circle class="radar-dot" cx="${x}" cy="${y}" r="5" />`; }).join("");
  const labels = dimensions.map((dimension, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const x = 210 + Math.cos(angle) * 172;
    const y = 184 + Math.sin(angle) * 172;
    const anchor = Math.cos(angle) > .2 ? "start" : Math.cos(angle) < -.2 ? "end" : "middle";
    return `<text class="radar-label" x="${x}" y="${y - 3}" text-anchor="${anchor}">${dimension.name}<tspan class="radar-value" x="${x}" dy="16">${dimension.value}%</tspan></text>`;
  }).join("");
  $("dimension-radar").innerHTML = `<title id="radar-title">六维关系雷达图</title><desc id="radar-desc">${dimensions.map((item) => `${item.name}${item.value}%`).join("，")}</desc>${rings}${axes}<polygon class="radar-area" points="${area}" />${dots}${labels}`;
}

function renderResult() {
  const role = ROLES[state.roleKey];
  const result = calculateResult(role, state.answers);
  state.lastResult = { role, ...result };
  $("result-tag").textContent = result.tier.tag;
  $("result-role-line").textContent = `你选择攻略 · ${role.name} / ${role.role}`;
  $("result-title").textContent = result.tier.title;
  $("result-comment").textContent = result.ending.comment;
  $("result-tags").innerHTML = [...role.tags, `最高维度：${result.topDimensions[0].name}`].map((tag) => `<span>${tag}</span>`).join("");
  $("result-role-image").src = role.portrait;
  $("result-role-image").alt = `${role.name}原创角色立绘`;
  $("clear-count").textContent = `${result.clearCount} / 20`;
  $("result-score").textContent = `${result.score} / 100`;
  $("result-profile").textContent = role.profile;
  $("result-strength").textContent = role.strength;
  $("result-risk").textContent = result.ending.risk;
  $("result-fit").textContent = role.fit;
  $("result-reminder").textContent = result.ending.reminder;
  $("advice-list").innerHTML = result.advice.map((item) => `<div class="advice-item">${item}</div>`).join("");
  renderRadar(result.dimensions);
  $("dimension-list").innerHTML = result.dimensions.map((dimension) => `
    <div class="dimension-item"><div class="dimension-head"><span>${dimension.name}</span><strong>${dimension.value}%</strong></div><div class="dimension-track"><div class="dimension-fill" style="width:${dimension.value}%"></div></div><div class="dimension-caption"><span>${dimension.low}</span><span>${dimension.high}</span></div></div>
  `).join("");
  $("copy-btn").dataset.summary = `我在《心动副本》选择了${role.name}，通关 ${result.clearCount}/20，关系得分 ${result.score}/100，获得称号「${result.tier.title}」。最高关系维度是${result.topDimensions.map((item) => item.name).join("、")}。`;
}

function loadPosterImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke = null) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function drawText(ctx, text, x, y, size, color, align = "left", weight = "400") {
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.font = `${weight} ${size}px sans-serif`; ctx.fillText(text, x, y);
}

function wrapLines(ctx, text, maxWidth) {
  const lines = []; let line = "";
  for (const char of text) { const trial = line + char; if (line && ctx.measureText(trial).width > maxWidth) { lines.push(line); line = char; } else line = trial; }
  if (line) lines.push(line); return lines;
}

function drawWrapped(ctx, text, x, centerY, maxWidth, lineHeight, size, color, align = "left") {
  ctx.font = `500 ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle";
  const lines = wrapLines(ctx, text, maxWidth); const first = centerY - (lines.length - 1) * lineHeight / 2;
  lines.forEach((line, index) => ctx.fillText(line, x, first + index * lineHeight)); ctx.textBaseline = "alphabetic";
}

async function createPosterImage() {
  const { role, tier, clearCount, score, dimensions, advice } = state.lastResult;
  const [qrImage, roleImage] = await Promise.all([loadPosterImage("../../assets/product-qrs/love-simulation.png"), loadPosterImage(role.portrait)]);
  const canvas = document.createElement("canvas"); const scale = 2; const width = 900; const height = 1680;
  canvas.width = width * scale; canvas.height = height * scale; const ctx = canvas.getContext("2d"); ctx.scale(scale, scale);
  ctx.fillStyle = "#171a21"; ctx.fillRect(0, 0, width, height);
  drawRoundRect(ctx, 36, 34, 828, 1610, 22, "#f4f7fb");
  drawRoundRect(ctx, 64, 62, 772, 430, 16, "#171a21");
  drawText(ctx, "YUNDU · LOVE QUEST / EVA 009", 96, 108, 17, "#55d6be", "left", "700");
  drawText(ctx, `${clearCount}/20 LEVELS`, 510, 108, 16, "#f3c849", "right", "700");
  ctx.save(); ctx.beginPath(); ctx.roundRect(548, 92, 250, 355, 8); ctx.clip(); ctx.drawImage(roleImage, 548, 92, 280, 355); ctx.restore();
  const fade = ctx.createLinearGradient(410, 0, 650, 0); fade.addColorStop(0, "#171a21"); fade.addColorStop(1, "rgba(23,26,33,0)"); ctx.fillStyle = fade; ctx.fillRect(390, 92, 280, 355);
  drawText(ctx, `我选择攻略 · ${role.name}`, 96, 175, 22, "#c8cbd3", "left", "600");
  drawText(ctx, tier.title, 96, 254, 52, "#ffffff", "left", "800");
  drawText(ctx, `${score} / 100`, 96, 324, 44, "#ff5a6f", "left", "800");
  drawText(ctx, "关系得分", 96, 352, 16, "#aeb3bf", "left", "600");
  role.tags.forEach((tag, index) => { const x = 96 + index * 112; drawRoundRect(ctx, x, 390, 102, 36, 4, "#252a35", "#535a69"); drawText(ctx, tag, x + 51, 414, 14, "#f4f7fb", "center", "600"); });
  drawRoundRect(ctx, 64, 520, 772, 402, 16, "#ffffff", "#d9deea"); drawText(ctx, "RELATION SIGNALS", 96, 566, 15, "#2864ff", "left", "700"); drawText(ctx, "我的六维关系图谱", 96, 604, 28, "#171a21", "left", "800");
  dimensions.forEach((item, index) => { const column = index % 2; const row = Math.floor(index / 2); const x = 96 + column * 365; const y = 662 + row * 82; drawText(ctx, item.name, x, y, 18, "#252a35", "left", "700"); drawText(ctx, `${item.value}%`, x + 330, y, 17, "#2864ff", "right", "700"); drawRoundRect(ctx, x, y + 15, 330, 10, 0, "#e2e6ef"); const gradient = ctx.createLinearGradient(x, 0, x + 330, 0); gradient.addColorStop(0, "#2864ff"); gradient.addColorStop(1, "#ff5a6f"); drawRoundRect(ctx, x, y + 15, 330 * item.value / 100, 10, 0, gradient); drawText(ctx, item.low, x, y + 47, 12, "#7a808d", "left", "500"); drawText(ctx, item.high, x + 330, y + 47, 12, "#7a808d", "right", "500"); });
  drawRoundRect(ctx, 64, 950, 772, 430, 16, "#171a21"); drawText(ctx, "NEXT MOVES", 96, 998, 15, "#f3c849", "left", "700"); drawText(ctx, "别再靠猜的三条建议", 96, 1037, 28, "#ffffff", "left", "800");
  advice.forEach((item, index) => { const y = 1070 + index * 94; drawRoundRect(ctx, 94, y, 712, 76, 8, "#252a35", "#424956"); drawRoundRect(ctx, 112, y + 20, 36, 36, 4, index === 0 ? "#ff5a6f" : "#2864ff"); drawText(ctx, `0${index + 1}`, 130, y + 44, 13, "#ffffff", "center", "800"); drawWrapped(ctx, item, 168, y + 38, 604, 21, 15, "#dfe2e8", "left"); });
  drawRoundRect(ctx, 64, 1410, 772, 164, 16, "#f3c849"); drawRoundRect(ctx, 92, 1434, 116, 116, 8, "#ffffff", "#171a21"); ctx.drawImage(qrImage, 100, 1442, 100, 100); drawText(ctx, "心动副本 · 恋爱模拟闯关", 242, 1467, 24, "#171a21", "left", "800"); drawText(ctx, "长按识别二维码 · 选择你的恋爱角色", 242, 1506, 17, "#353842", "left", "600"); drawText(ctx, "分享给朋友，看谁能解锁隐藏结局", 242, 1540, 16, "#2864ff", "left", "700");
  drawText(ctx, "云渡测评实验室 · YUNDU EVALUATION LAB", width / 2, 1614, 14, "#777e8b", "center", "600");
  return canvas.toDataURL("image/png");
}

$("start-btn").addEventListener("click", async () => {
  const button = $("start-btn"); const code = $("access-code").value.trim().toUpperCase();
  button.disabled = true; button.textContent = "正在验证..."; $("gate-error").textContent = "";
  try { await memberReady; if (!activeMember) await verifyAccessCode(code); showScreen("role-screen"); }
  catch (error) { $("gate-error").textContent = error.message; }
  finally { button.disabled = false; button.textContent = activeMember ? "会员直接开始" : "开始闯关"; }
});
$("access-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("start-btn").click(); });
$("role-back-btn").addEventListener("click", () => showScreen("home-screen"));
$("prev-btn").addEventListener("click", () => { if (state.index > 0) { state.index -= 1; renderQuestion(); } });
$("restart-btn").addEventListener("click", () => showScreen("role-screen"));
$("copy-btn").addEventListener("click", async () => { const button = $("copy-btn"); try { await navigator.clipboard.writeText(button.dataset.summary); button.textContent = "已复制"; } catch { button.textContent = "复制失败，请截图"; } setTimeout(() => { button.textContent = "⧉ 复制摘要"; }, 1600); });
$("save-poster-btn").addEventListener("click", async () => { if (!state.lastResult) return; const button = $("save-poster-btn"); button.disabled = true; button.textContent = "正在生成..."; try { $("poster-image").src = await createPosterImage(); $("poster-modal").classList.add("active"); } finally { button.disabled = false; button.textContent = "↓ 保存报告"; } });
$("poster-close").addEventListener("click", () => $("poster-modal").classList.remove("active"));
$("cashback-btn").addEventListener("click", () => $("cashback-modal").classList.add("active"));
$("cashback-close").addEventListener("click", () => $("cashback-modal").classList.remove("active"));
document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.remove("active"); }));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("active")); });

renderRoles();
