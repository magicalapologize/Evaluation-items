import { DIMENSIONS, SCENES, QUESTIONS, RESULTS } from "./data.mjs";
import { calculateProfile } from "./model.mjs";
import { createParticleRenderer } from "./glyph-renderer.js";

const PRODUCT_ID = "talent-discovery";
const PRODUCT_TITLE = "天赋挖掘测试｜找到你的天赋领域";
const RESULT_GLYPH_ASSETS = {
  language: "language.png",
  logic: "logic.png",
  spatial: "spatial.png",
  body: "body.png",
  music: "music.png",
  interpersonal: "interpersonal.png",
  introspection: "introspection.png",
  nature: "nature.png",
};
const $ = (id) => document.getElementById(id);
const state = { index: 0, answers: [], profile: null, historyAttemptId: null, posterUrl: null };
const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
const isLocalPreview = window.location.hostname === "127.0.0.1" && window.location.port === "8765";
let homeParticleRenderer = null;
let loadingParticleRenderer = null;
let resultParticleRenderer = null;
let answerAdvanceTimer = null;
let activeMember = null;

YunduBackdoor.register(PRODUCT_ID, {
  getChoices: () => RESULTS.map((result) => ({ key: result.key, label: result.name })),
  choose: (key) => {
    const answers = YunduBackdoor.findAnswerSet({ questionCount: QUESTIONS.length, optionCount: 4, target: key, getResultKey: (candidate) => calculateProfile(candidate).result.key });
    if (!answers) return;
    state.answers = answers; state.profile = calculateProfile(answers); renderResult(); saveHistory(); show("result-screen");
  }
});

function answerFingerprint(answers) {
  let hash = 2166136261;
  for (const answer of answers) {
    hash ^= Number(answer) + 31;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const TALENT_WORDS = DIMENSIONS.map((dimension) => dimension.short || dimension.name.replace(/天赋$/, ""));

function renderHomeParticles() {
  homeParticleRenderer?.destroy();
  homeParticleRenderer = createParticleRenderer($("home-particle-canvas"), { palette: DIMENSIONS.map((dimension) => dimension.color), talentWords: TALENT_WORDS, background: "#05070B", count: 3200, seed: 17 });
  homeParticleRenderer.play();
}

function renderResultParticles(profile) {
  const canvas = $("result-particle-canvas");
  const asset = RESULT_GLYPH_ASSETS[profile.bestKey];
  const color = DIMENSIONS.find((dimension) => dimension.key === profile.bestKey)?.color || "#2CB7A5";
  const image = $("result-visual-image");
  if (image && asset) image.src = asset;
  resultParticleRenderer?.destroy();
  resultParticleRenderer = createParticleRenderer(canvas, { palette: DIMENSIONS.map((dimension) => dimension.color), talentWords: TALENT_WORDS, bestKey: profile.bestKey, bestColor: color, background: "#05070B", count: 3000, seed: 29 + answerFingerprint(state.answers) });
  resultParticleRenderer.play();
}

function renderLoadingParticles(seed) {
  const canvas = $("loading-glyph-canvas");
  loadingParticleRenderer?.destroy();
  loadingParticleRenderer = createParticleRenderer(canvas, { palette: DIMENSIONS.map((dimension) => dimension.color), talentWords: TALENT_WORDS, background: "#05070B", count: 3400, seed, mode: "loading" });
  loadingParticleRenderer.play({ mode: "loading", highlightWords: ["天赋"], bestColor: "#FF4D6D" });
}

function initializeGlyphs() {
  renderHomeParticles();
}

function stopRenderer(rendererName) {
  if (rendererName === "home") {
    homeParticleRenderer?.destroy();
    homeParticleRenderer = null;
  } else if (rendererName === "loading") {
    loadingParticleRenderer?.destroy();
    loadingParticleRenderer = null;
  } else if (rendererName === "result") {
    resultParticleRenderer?.destroy();
    resultParticleRenderer = null;
  }
}

function show(id) {
  if (id !== "home-screen") stopRenderer("home");
  if (id !== "loading-screen") stopRenderer("loading");
  if (id !== "result-screen") stopRenderer("result");
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  window.scrollTo(0, 0);
}
async function verify(code) { const response = await fetch("/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: PRODUCT_ID, code }) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.success) throw new Error(data.message || "测试码验证失败"); }

function applyMemberAccess(member) {
  activeMember = member && member.active ? member : null;
  $("member-unlock").classList.toggle("is-visible", Boolean(activeMember));
  const gateRow = document.querySelector("#home-screen .gate-row");
  const gateNote = document.querySelector("#home-screen .gate-note");
  gateRow.classList.toggle("member-access-active", Boolean(activeMember));
  gateNote.classList.toggle("member-access-hidden", Boolean(activeMember));
  if (activeMember) {
    $("member-plan-label").textContent = `${activeMember.planLabel} · ${globalThis.YunduMember.formatExpiry(activeMember)}`;
    document.querySelector("#home-screen .gate-title").textContent = "会员通道已开启，可直接读取天赋线索";
    $("start-btn").textContent = "会员直接开始";
  }
}

const memberReady = globalThis.YunduMember?.getMember
  ? globalThis.YunduMember.getMember().then(applyMemberAccess).catch(() => null)
  : Promise.resolve(null);

if (isLocalPreview) {
  $("access-code").hidden = true;
  $("access-code").setAttribute("aria-hidden", "true");
  document.querySelector("#home-screen .gate-row")?.classList.add("local-preview-mode");
  document.querySelector("#home-screen .gate-title").textContent = "本地预览可直接开始测试";
  $("start-btn").textContent = "直接开始测试";
}

function renderQuestion() {
  if (answerAdvanceTimer) { window.clearTimeout(answerAdvanceTimer); answerAdvanceTimer = null; }
  const activeElement = document.activeElement;
  if (activeElement && $("answer-list").contains(activeElement)) activeElement.blur();
  const question = QUESTIONS[state.index]; $("question-group").textContent = question.scene; $("question-number").textContent = String(state.index + 1); $("progress-bar").style.width = `${((state.index + 1) / QUESTIONS.length) * 100}%`; $("question-text").textContent = question.text; $("prev-btn").disabled = state.index === 0;
  $("answer-list").innerHTML = question.options.map((option, index) => `<button class="answer-btn${state.answers[state.index] === index ? " selected" : ""}" data-answer="${index}" type="button"><span class="answer-letter">${String.fromCharCode(65 + index)}</span>${esc(option.text)}</button>`).join("");
}

function radar(profile) {
  const svg = $("radar-svg"); const center = 180; const radius = 126; const count = DIMENSIONS.length;
  const point = (index, value) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / count; return `${center + Math.cos(angle) * value},${center + Math.sin(angle) * value}`; };
  const rings = [0.33, 0.66, 1].map((scale) => `<polygon points="${DIMENSIONS.map((_, index) => point(index, radius * scale)).join(" ")}" fill="none" stroke="#dbe6e2" stroke-width="1"/>`).join("");
  const axes = DIMENSIONS.map((dimension, index) => { const [x, y] = point(index, radius).split(","); const [lx, ly] = point(index, radius + 22).split(","); return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#dbe6e2"/><text x="${lx}" y="${ly}" text-anchor="middle" font-size="11" font-weight="800" fill="${dimension.color}">${dimension.short}</text>`; }).join("");
  const shape = DIMENSIONS.map((dimension, index) => point(index, radius * Number(profile.displayScores[dimension.key] || 0) / 100)).join(" "); svg.innerHTML = `${rings}${axes}<polygon points="${shape}" fill="#2CB7A533" stroke="#2CB7A5" stroke-width="3"/>`;
}

function rankedDimensions(profile) {
  const ranking = profile.ranking || Object.entries(profile.displayScores).sort((left, right) => right[1] - left[1]).map(([key]) => key);
  return ranking.map((key) => DIMENSIONS.find((dimension) => dimension.key === key)).filter(Boolean);
}

function talentLevel(score) {
  const value = Number(score) || 0;
  if (value >= 80) return { key: "high", label: "非常擅长" };
  if (value >= 65) return { key: "steady", label: "比较擅长" };
  if (value >= 50) return { key: "developing", label: "有些擅长" };
  return { key: "quiet", label: "暂不突出" };
}

function renderResult(profile = state.profile) {
  const result = profile.result; const best = DIMENSIONS.find((dimension) => dimension.key === profile.bestKey); const support = DIMENSIONS.find((dimension) => dimension.key === profile.supportKey);
  renderResultParticles(profile);
  document.querySelector(".report-hero").style.setProperty("--talent-color", best?.color || "#2CB7A5"); $("report-date").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); $("result-name").textContent = result.name; $("result-support").textContent = support?.name || "综合天赋"; $("result-tags").innerHTML = result.tags.map((tag) => `<span>${esc(tag)}</span>`).join(""); $("result-summary").textContent = result.summary; $("best-talent-reading").textContent = result.assessment ? `${result.assessment} ${result.portrait} ${result.strength}` : `${best?.description || ""} ${result.strength}`; $("best-scenes").innerHTML = `<span>${esc(result.bestScene)}</span>`; radar(profile);
  $("dimension-list").innerHTML = rankedDimensions(profile).map((dimension, index) => { const score = profile.displayScores[dimension.key]; const level = talentLevel(score); return `<div class="dimension-item" style="--talent-color:${dimension.color}"><span class="dimension-rank">${String(index + 1).padStart(2, "0")}</span><strong>${esc(dimension.short)}</strong><div class="dimension-track"><i style="width:${score}%"></i></div><b>${score}</b><span class="dimension-level dimension-level-${level.key}">${level.label}</span></div>`; }).join("");
  $("active-talent-list").innerHTML = profile.activeKeys.map((key) => { const dimension = DIMENSIONS.find((item) => item.key === key); const copy = result.activeTalentCopy[key]; return `<article class="talent-card" style="--talent-color:${dimension.color}"><img src="${key}.png" alt="" loading="lazy"><div><h3>${esc(dimension.name)}</h3><p>${esc(copy.scene)}</p><p>${esc(copy.strength)}</p><p>${esc(copy.boundary)}</p><small>${esc(copy.action)}</small></div></article>`; }).join("");
  const hidden = DIMENSIONS.find((dimension) => dimension.key === profile.awakeningKey); $("hidden-potential").innerHTML = `<h3 style="color:${hidden?.color || "var(--ink)"}">${esc(hidden?.name || "潜在天赋")}</h3><p>${esc(result.hiddenPotential)}</p><p class="action-note">30 天验证：在一个真实小任务中刻意使用它，记录过程与反馈。</p>`; $("bottleneck").textContent = `${result.risk} ${result.bottleneck}`;
  $("career-track-list").innerHTML = profile.careerTracks.slice(0, 5).map((career) => `<article class="career-card"><h3>${esc(career.name)}</h3><p>${esc(career.why)}</p><small>${esc(career.tryAction)}</small></article>`).join(""); $("strategy-list").innerHTML = result.advices.map((advice) => `<div class="strategy-item">${esc(advice)}</div>`).join(""); $("competitive-edge").textContent = result.edge; $("growth-plan").innerHTML = result.growth.map((item) => `<div class="growth-item">${esc(item)}</div>`).join(""); $("result-reminder").textContent = result.reminder; $("copy-result-btn").dataset.summary = `我的最佳天赋是「${result.name}」。${result.summary} 辅助天赋：${support?.name || "综合天赋"}。`;
}

function buildHistorySnapshot(profile) {
  state.historyAttemptId ||= (crypto.randomUUID ? crypto.randomUUID() : `talent-discovery-${Date.now()}`); const result = profile.result;
  const ranked = rankedDimensions(profile);
  return { schemaVersion: 1, attemptId: state.historyAttemptId, productId: PRODUCT_ID, productTitle: PRODUCT_TITLE, result: { name: result.name, subtitle: `最佳天赋：${result.name}`, quote: result.summary, icon: "✦", image: "/images/cards/talent-discovery.webp", match: profile.displayScores[profile.bestKey] }, tags: result.tags, overview: [{ label: "最佳天赋", title: result.name, body: `辅助天赋：${DIMENSIONS.find((item) => item.key === profile.supportKey)?.name || "综合天赋"}` }], dimensions: ranked.map((dimension) => ({ name: dimension.name, value: profile.displayScores[dimension.key], left: "较少使用", right: "更常使用" })), sections: [
    { title: "01｜你的最佳天赋评估", body: result.assessment || `${DIMENSIONS.find((item) => item.key === profile.bestKey)?.description || ""} ${result.strength}`, items: [] }, { title: "02｜8 项天赋综合解读", body: "分数按本次答卷的相对强弱排列，先看排名靠前的天赋，再结合雷达图观察组合。", items: ranked.map((dimension) => `${dimension.name}：${profile.displayScores[dimension.key]} 分`) }, { title: "03｜4 项活跃天赋深入分析", body: "", items: profile.activeKeys.map((key) => `${DIMENSIONS.find((item) => item.key === key)?.name}：${result.activeTalentCopy[key].strength}`) }, { title: "04｜解锁隐藏天赋潜能", body: `${DIMENSIONS.find((item) => item.key === profile.awakeningKey)?.name}：${result.hiddenPotential}`, items: [] }, { title: "05｜规避潜在发展瓶颈", body: `${result.risk} ${result.bottleneck}`, items: [] }, { title: "06｜锁定优势职业赛道", body: "赛道用于探索和验证，不是固定职业结论。", items: profile.careerTracks.slice(0, 5).map((career) => `${career.name}：${career.why}`) }, { title: "07｜掌握天赋拓展策略", body: "", items: result.advices }, { title: "08｜定位个人竞争力", body: result.edge, items: [] }, { title: "09｜获取进阶成长方案", body: result.reminder, items: result.growth }
  ], disclaimer: "本测试用于职业探索和自我观察，不构成心理诊断、能力等级、职业资格判断或职业决策保证。", createdAt: new Date().toISOString() };
}
function saveHistory() { Promise.resolve(globalThis.YunduHistory?.saveResult?.(buildHistorySnapshot(state.profile))).catch(() => {}); }

function wrapText(ctx, text, x, y, width, lineHeight, maxLines = 3) { const lines = []; let line = ""; for (const character of Array.from(String(text || ""))) { const next = line + character; if (ctx.measureText(next).width > width && line) { lines.push(line); line = character; } else line = next; } if (line) lines.push(line); const visible = lines.slice(0, maxLines); if (lines.length > maxLines) visible[maxLines - 1] = `${visible[maxLines - 1].slice(0, -1)}…`; visible.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight)); return y + visible.length * lineHeight; }
function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("报告二维码加载失败")); image.src = src; }); }
async function createPosterImage() {
  const profile = state.profile; const result = profile.result; const best = DIMENSIONS.find((dimension) => dimension.key === profile.bestKey); const qr = await loadImage("../../assets/product-qrs/talent-discovery.png"); const canvas = document.createElement("canvas"); canvas.width = 1800; canvas.height = 2500; const ctx = canvas.getContext("2d"); ctx.fillStyle = "#F5F8F6"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#142A43"; ctx.fillRect(0, 0, 1800, 620); ctx.fillStyle = "#F5C451"; ctx.font = "800 26px sans-serif"; ctx.fillText("MULTIPLE TALENT MAP", 110, 100); ctx.fillStyle = "#FFFFFF"; ctx.font = "800 32px sans-serif"; ctx.fillText("天赋挖掘测试", 110, 165); ctx.fillStyle = best?.color || "#2CB7A5"; ctx.font = "900 84px sans-serif"; ctx.fillText(result.name, 110, 310); ctx.fillStyle = "#C8D8D5"; ctx.font = "500 30px sans-serif"; wrapText(ctx, result.summary, 110, 390, 1120, 42, 3); ctx.fillStyle = "#F5C451"; ctx.font = "800 25px sans-serif"; ctx.fillText(`辅助天赋：${DIMENSIONS.find((item) => item.key === profile.supportKey)?.name || "综合天赋"}`, 110, 545);
  ctx.fillStyle = "#19323A"; ctx.font = "900 40px sans-serif"; ctx.fillText("8 项天赋综合解读", 110, 710); rankedDimensions(profile).forEach((dimension, index) => { const column = index % 2; const row = Math.floor(index / 2); const x = 110 + column * 790; const y = 770 + row * 150; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, y, 730, 112); ctx.fillStyle = "#19323A"; ctx.font = "800 25px sans-serif"; ctx.fillText(`${String(index + 1).padStart(2, "0")}  `, x + 24, y + 38); ctx.fillStyle = dimension.color; ctx.fillText(dimension.name, x + 82, y + 38); ctx.fillStyle = dimension.color; ctx.font = "900 28px sans-serif"; ctx.textAlign = "right"; ctx.fillText(String(profile.displayScores[dimension.key]), x + 700, y + 38); ctx.textAlign = "left"; ctx.fillStyle = "#DDE7E4"; ctx.fillRect(x + 24, y + 70, 682, 12); ctx.fillStyle = dimension.color; ctx.fillRect(x + 24, y + 70, 682 * profile.displayScores[dimension.key] / 100, 12); });
  ctx.fillStyle = "#19323A"; ctx.font = "900 40px sans-serif"; ctx.fillText("掌握天赋拓展策略", 110, 1445); result.advices.forEach((advice, index) => { const y = 1510 + index * 120; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(110, y, 1580, 90); ctx.fillStyle = "#FF8A65"; ctx.font = "900 25px sans-serif"; ctx.fillText(`0${index + 1}`, 140, y + 55); ctx.fillStyle = "#19323A"; ctx.font = "500 24px sans-serif"; wrapText(ctx, advice, 220, y + 38, 1400, 32, 2); });
  ctx.fillStyle = "#142A43"; ctx.fillRect(110, 1910, 1580, 400); ctx.drawImage(qr, 155, 2020, 220, 220); ctx.fillStyle = "#FFFFFF"; ctx.font = "900 36px sans-serif"; ctx.fillText("把报告发给朋友，一起对照天赋线索", 445, 2045); ctx.fillStyle = "#2CB7A5"; ctx.font = "700 27px sans-serif"; ctx.fillText("长按识别二维码 · 开始你的天赋挖掘", 445, 2110); ctx.fillStyle = "#C8D8D5"; ctx.font = "500 23px sans-serif"; wrapText(ctx, "结果用于自我观察与发展启发，具体选择请结合真实经历和反馈。", 445, 2170, 1000, 34, 2); ctx.fillStyle = "#9EB5B1"; ctx.font = "500 20px sans-serif"; ctx.fillText("© 云渡测评实验室", 1430, 2270); return canvas.toDataURL("image/png");
}

function renderHistorySnapshot(snapshot) { const result = RESULTS.find((item) => item.name === snapshot.result?.name); if (!result) throw new Error("测试结果不存在"); const scoreMap = Object.fromEntries(snapshot.dimensions.map((item) => [DIMENSIONS.find((dimension) => dimension.name === item.name)?.key, Number(item.value)]).filter(([key]) => key)); const ranking = Object.entries(scoreMap).sort((a, b) => b[1] - a[1]).map(([key]) => key); const profile = { result, bestKey: ranking[0], supportKey: ranking[1], activeKeys: ranking.slice(0, 4), awakeningKey: ranking[4], displayScores: scoreMap, careerTracks: [] }; renderResult(profile); const sections = globalThis.YunduHistoryReplay.sectionMap(snapshot); $("report-date").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(snapshot.createdAt)); $("bottleneck").textContent = sections.get("05｜规避潜在发展瓶颈")?.body || ""; $("competitive-edge").textContent = sections.get("08｜定位个人竞争力")?.body || ""; $("growth-plan").innerHTML = (sections.get("09｜获取进阶成长方案")?.items || []).map((item) => `<div class="growth-item">${esc(item)}</div>`).join(""); $("result-reminder").textContent = sections.get("09｜获取进阶成长方案")?.body || ""; $("active-talent-list").innerHTML = (sections.get("03｜4 项活跃天赋深入分析")?.items || []).map((item) => `<article class="talent-card"><p>${esc(item)}</p></article>`).join(""); $("career-track-list").innerHTML = (sections.get("06｜锁定优势职业赛道")?.items || []).map((item) => `<article class="career-card"><p>${esc(item)}</p></article>`).join(""); $("strategy-list").innerHTML = (sections.get("07｜掌握天赋拓展策略")?.items || []).map((item) => `<div class="strategy-item">${esc(item)}</div>`).join(""); }
function start() { state.index = 0; state.answers = []; state.profile = null; state.historyAttemptId = null; renderQuestion(); show("quiz-screen"); }
function finish() {
  const loadingSeed = answerFingerprint(state.answers);
  $("loading-state").textContent = "正在整理答题线索";
  $("loading-detail").textContent = "归纳你在不同情境中的选择";
  $("loading-count").textContent = "00 / 08";
  $("loading-progress-bar").style.transform = "scaleX(0)";
  $("loading-progress-bar").parentElement.setAttribute("aria-valuenow", "0");
  show("loading-screen");
  renderLoadingParticles(loadingSeed);
  window.setTimeout(() => { $("loading-state").textContent = "正在校准八项天赋"; $("loading-detail").textContent = "对比各维度在本次答卷中的相对倾向"; $("loading-count").textContent = "05 / 08"; $("loading-progress-bar").style.transform = "scaleX(.62)"; $("loading-progress-bar").parentElement.setAttribute("aria-valuenow", "62"); }, 1000);
  window.setTimeout(() => { $("loading-state").textContent = "正在生成天赋报告"; $("loading-detail").textContent = "整理你的优势组合与成长建议"; $("loading-count").textContent = "08 / 08"; $("loading-progress-bar").style.transform = "scaleX(1)"; $("loading-progress-bar").parentElement.setAttribute("aria-valuenow", "100"); }, 2200);
  window.setTimeout(() => { state.profile = calculateProfile(state.answers); renderResult(); saveHistory(); loadingParticleRenderer?.destroy(); loadingParticleRenderer = null; show("result-screen"); }, 3000);
}

$("answer-list").addEventListener("click", (event) => {
  const button = event.target.closest(".answer-btn");
  if (!button || !$("answer-list").contains(button) || answerAdvanceTimer) return;
  state.answers[state.index] = Number(button.dataset.answer);
  button.classList.add("selected"); button.blur();
  answerAdvanceTimer = window.setTimeout(() => {
    answerAdvanceTimer = null;
    if (state.index < QUESTIONS.length - 1) { state.index += 1; renderQuestion(); } else finish();
  }, 80);
});
$("start-btn").addEventListener("click", async () => { const button = $("start-btn"); $("gate-error").textContent = ""; button.disabled = true; try { await memberReady; if (!activeMember && !isLocalPreview) { const code = $("access-code").value.trim(); if (!code) { $("gate-error").textContent = "请输入测试码"; return; } await verify(code); } start(); } catch (error) { $("gate-error").textContent = error.message; } finally { button.disabled = false; button.textContent = activeMember ? "会员直接开始" : (isLocalPreview ? "直接开始测试" : "验证并开始"); } });
$("access-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("start-btn").click(); }); $("prev-btn").addEventListener("click", () => { if (state.index > 0) { state.index -= 1; renderQuestion(); } }); $("restart-btn").addEventListener("click", start);
$("copy-result-btn").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("copy-result-btn").dataset.summary || ""); $("copy-result-btn").textContent = "已复制"; window.setTimeout(() => { $("copy-result-btn").textContent = "复制结果摘要"; }, 1600); } catch { $("copy-result-btn").textContent = "请手动复制"; } }); $("cashback-btn").addEventListener("click", () => $("cashback-modal").classList.add("is-open"));
$("save-poster-btn").addEventListener("click", async () => { const button = $("save-poster-btn"); button.disabled = true; button.textContent = "正在生成..."; try { state.posterUrl = await createPosterImage(); $("poster-image").src = state.posterUrl; $("poster-modal").classList.add("is-open"); } catch (error) { window.alert(error.message); } finally { button.disabled = false; button.textContent = "保存报告海报"; } }); document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => $(button.dataset.closeModal).classList.remove("is-open"))); document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.remove("is-open"); }));
initializeGlyphs();
if (globalThis.YunduHistoryReplay?.init) globalThis.YunduHistoryReplay.init(PRODUCT_ID, renderHistorySnapshot, () => show("result-screen"));
