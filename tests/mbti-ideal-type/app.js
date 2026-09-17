import { AXES, AXIS_COPY_BY_KEY, DISCLAIMER, QUESTIONS, RELATIONSHIP_STAGES, RESULTS } from "./data.mjs";
import { calculateIdealType, rankAttractions } from "./model.mjs";
import { isLocalPreviewLocation } from "./access.mjs";
import { formatAnswerOption, formatMbtiType } from "./view.mjs";

const PRODUCT_ID = "mbti-ideal-type";
const PRODUCT_TITLE = "MBTI 理想型测试";
const $ = (id) => document.getElementById(id);
const state = { index: 0, answers: [], profile: null, posterUrl: "", attemptId: null };
const isLocalPreview = isLocalPreviewLocation(window.location);

if (globalThis.YunduBackdoor) {
  globalThis.YunduBackdoor.register(PRODUCT_ID, {
    getChoices: () => RESULTS.map((result) => ({ key: result.code, label: `${result.code} · ${result.mbtiName}｜${result.name}` })),
    choose: (key) => {
      if (!RESULTS.some((result) => result.code === key)) return;
      const answers = globalThis.YunduBackdoor.findAnswerSet({
        questionCount: QUESTIONS.length,
        optionCount: 4,
        target: key,
        getResultKey: (candidate) => calculateIdealType(candidate).code
      });
      if (!answers) return;
      state.answers = answers;
      finishQuiz();
    }
  });
}

function showScreen(id) { document.querySelectorAll(".screen").forEach((screen) => { const active = screen.id === id; screen.classList.toggle("active", active); screen.setAttribute("aria-hidden", String(!active)); }); window.scrollTo({ top: 0, behavior: "smooth" }); }
function setText(id, value) { $(id).textContent = value || ""; }
function getMember() { return globalThis.YunduMember?.getMember ? globalThis.YunduMember.getMember() : Promise.resolve({ authenticated: false }); }
async function verifyAccessCode(code) {
  const response = await fetch("/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: PRODUCT_ID, code }) });
  let result; try { result = await response.json(); } catch { throw new Error("验证服务返回异常，请稍后再试"); }
  if (!response.ok || !result.success) throw new Error(result.message || "测试码验证失败");
}
function renderQuestion() {
  const question = QUESTIONS[state.index];
  setText("progress-text", `第 ${state.index + 1} / ${QUESTIONS.length} 题`);
  setText("progress-bar", ""); $("progress-bar").style.width = `${((state.index + 1) / QUESTIONS.length) * 100}%`;
  const stage = RELATIONSHIP_STAGES.find((item) => item.key === question.stage);
  setText("question-stage", stage?.name); setText("question-num", String(state.index + 1).padStart(2, "0") + "."); setText("question-text", question.text);
  const list = $("answer-list"); list.replaceChildren();
  const order = question.options.map((_, index) => index).sort((a, b) => ((state.index * 17 + a * 7) % 13) - ((state.index * 17 + b * 7) % 13));
  order.forEach((optionIndex, displayIndex) => { const button = document.createElement("button"); button.type = "button"; button.textContent = formatAnswerOption(displayIndex, question.options[optionIndex].text); button.className = state.answers[state.index] === optionIndex ? "selected" : ""; button.addEventListener("click", () => { state.answers[state.index] = optionIndex; if (state.index === QUESTIONS.length - 1) finishQuiz(); else { state.index += 1; renderQuestion(); } }); list.append(button); });
  $("prev-btn").disabled = state.index === 0; $("prev-btn").onclick = () => { if (state.index > 0) { state.index -= 1; renderQuestion(); } };
}
function renderReport(profile) {
  const result = profile.result; setText("result-code", result.code); setText("result-type", formatMbtiType(result)); setText("result-name", result.name); setText("result-summary", result.summary);
  const tags = $("result-tags"); tags.replaceChildren(); result.tags.forEach((tag) => { const span = document.createElement("span"); span.textContent = tag; tags.append(span); });
  const axes = $("axis-list"); axes.replaceChildren(); profile.axisProfiles.forEach((axisProfile, index) => { const axis = AXES[index]; const card = document.createElement("article"); card.className = "axis-card"; const title = document.createElement("h3"); title.textContent = `${axis.key.toUpperCase()} · ${axisProfile.label}`; const description = document.createElement("p"); const letter = axisProfile.direction; description.textContent = AXIS_COPY_BY_KEY[axis.key][letter === axis.left ? "left" : "right"].summary; const line = document.createElement("div"); line.className = "axis-line"; const fill = document.createElement("div"); fill.style.width = `${axisProfile.displayValue}%`; line.append(fill); const meta = document.createElement("div"); meta.className = "axis-meta"; meta.innerHTML = `<span>${axis.left} ${axis.leftLabel}</span><span>${axisProfile.status}</span><span>${axis.right} ${axis.rightLabel}</span>`; card.append(title, description, line, meta); axes.append(card); });
  const ranking = $("attraction-ranking"); ranking.replaceChildren(); (profile.attractionRanking || rankAttractions(profile.axisProfiles)).forEach((item) => { const row = document.createElement("article"); row.className = `ranking-item${item.code === result.code ? " is-top" : ""}`; const rank = document.createElement("span"); rank.className = "ranking-rank"; rank.textContent = String(item.rank).padStart(2, "0"); const main = document.createElement("div"); main.className = "ranking-main"; const heading = document.createElement("div"); heading.className = "ranking-heading"; const type = document.createElement("strong"); type.textContent = `${item.code} · ${item.mbtiName}`; const relation = document.createElement("span"); relation.textContent = item.name; heading.append(type, relation); const track = document.createElement("div"); track.className = "ranking-track"; const fill = document.createElement("i"); fill.style.width = `${item.score}%`; track.append(fill); main.append(heading, track); const score = document.createElement("strong"); score.className = "ranking-score"; score.innerHTML = `${item.score}<small>/100</small>`; row.append(rank, main, score); ranking.append(row); });
  const insights = $("insight-list"); insights.replaceChildren(); (result.insights || []).forEach((insight, index) => { const article = document.createElement("article"); article.className = "insight-card"; const header = document.createElement("div"); header.className = "insight-head"; const kicker = document.createElement("span"); kicker.textContent = `0${index + 1}`; const title = document.createElement("h3"); title.textContent = insight.title; header.append(kicker, title); const body = document.createElement("p"); body.textContent = insight.body; article.append(header, body); insights.append(article); });
  ["attraction", "security", "strength", "friction", "communication", "rhythm"].forEach((key) => setText(key, result[key]));
  const adviceList = $("advice-list"); adviceList.replaceChildren(); result.advices.forEach((advice) => { const item = document.createElement("div"); item.className = "advice"; const title = document.createElement("strong"); title.textContent = advice.title; const body = document.createElement("p"); body.textContent = advice.action; item.append(title, body); adviceList.append(item); }); setText("reminder", result.reminder);
}
function buildHistorySnapshot(profile) { return { schemaVersion: 1, attemptId: state.attemptId, productId: PRODUCT_ID, productTitle: PRODUCT_TITLE, result: { name: profile.result.code, subtitle: profile.result.name, quote: profile.result.summary, icon: "♡", image: "" }, tags: profile.result.tags, overview: [{ label: "理想型", title: profile.result.name, body: profile.result.summary }], dimensions: profile.axisProfiles.map((axis, index) => ({ name: `${AXES[index].key.toUpperCase()} ${axis.direction}`, value: axis.displayValue, left: AXES[index].leftLabel, right: AXES[index].rightLabel })), sections: [{ title: "深入解读", body: profile.result.insights.map((insight) => `${insight.title}：${insight.body}`).join("\n\n"), items: profile.result.insights.map((insight) => insight.body) }, { title: "理想伴侣画像", body: profile.result.attraction, items: [profile.result.security, profile.result.strength, profile.result.friction] }, { title: "相处建议", body: profile.result.communication, items: profile.result.advices.map((advice) => advice.action) }], disclaimer: DISCLAIMER, createdAt: new Date().toISOString() }; }
function finishQuiz() { state.profile = calculateIdealType(state.answers); state.attemptId = globalThis.crypto?.randomUUID?.() || `mbti-${Date.now()}`; showScreen("loading-screen"); setTimeout(() => { renderReport(state.profile); showScreen("result-screen"); globalThis.YunduHistory?.saveResult?.(buildHistorySnapshot(state.profile)).catch?.(() => {}); }, 500); }
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) { const chars = [...String(text)]; let line = ""; let lines = []; chars.forEach((char) => { const next = line + char; if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = char; } else line = next; }); if (line) lines.push(line); lines = lines.slice(0, maxLines); lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight)); return lines.length; }
function loadPosterImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
export async function createPosterImage(profile) {
  const qrImage = await loadPosterImage("../../assets/product-qrs/mbti-ideal-type.png");
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 2350;
  const ctx = canvas.getContext("2d");
  const margin = 120;
  const contentWidth = canvas.width - margin * 2;

  ctx.fillStyle = "#fffaf9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8d3f57";
  ctx.fillRect(0, 0, canvas.width, 480);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("MBTI 理想型", margin, 92);
  ctx.font = "700 76px Georgia";
  ctx.fillText(profile.result.code, margin, 218);
  ctx.font = "600 42px sans-serif";
  ctx.fillText(profile.result.name, margin, 285);
  ctx.font = "600 24px sans-serif";
  ctx.fillText(profile.result.tags.map((tag) => `#${tag}`).join("  "), margin, 342);
  ctx.font = "28px sans-serif";
  wrapText(ctx, profile.result.summary, margin, 405, contentWidth, 40, 2);

  ctx.fillStyle = "#3b2730";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("四条关系偏好", margin, 560);
  profile.axisProfiles.forEach((axis, index) => {
    const x = margin + (index % 2) * 810;
    const y = 625 + Math.floor(index / 2) * 205;
    const axisDef = AXES[index];
    ctx.fillStyle = "#8d3f57";
    ctx.font = "700 27px sans-serif";
    ctx.fillText(`${axisDef.key.toUpperCase()} · ${axis.label}`, x, y);
    ctx.fillStyle = "#eadcdf";
    ctx.fillRect(x, y + 30, 660, 18);
    ctx.fillStyle = "#c36b7f";
    ctx.fillRect(x, y + 30, 660 * axis.displayValue / 100, 18);
    ctx.fillStyle = "#686a77";
    ctx.font = "24px sans-serif";
    ctx.fillText(axis.status, x, y + 90);
  });

  ctx.fillStyle = "#3b2730";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("为什么会被吸引", margin, 1060);
  ctx.fillStyle = "#4f4d58";
  ctx.font = "27px sans-serif";
  wrapText(ctx, profile.result.attraction, margin, 1120, contentWidth, 40, 3);

  ctx.fillStyle = "#8d3f57";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("把偏好带回真实关系", margin, 1305);
  profile.result.advices.forEach((advice, index) => {
    const y = 1375 + index * 170;
    ctx.fillStyle = "#3b2730";
    ctx.font = "700 26px sans-serif";
    ctx.fillText(`${index + 1}. ${advice.title}`, margin + 20, y);
    ctx.font = "24px sans-serif";
    wrapText(ctx, advice.action, margin + 70, y + 42, contentWidth - 70, 34, 3);
  });

  ctx.fillStyle = "#3b2730";
  ctx.fillRect(0, 1925, canvas.width, 425);
  ctx.drawImage(qrImage, margin, 2010, 250, 250);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("MBTI 理想型测试", 450, 2080);
  ctx.font = "24px sans-serif";
  ctx.fillText("长按识别二维码 · 分享你的理想伴侣偏好", 450, 2140);
  ctx.fillText("真实关系比四个字母更丰富", 450, 2200);
  return canvas.toDataURL("image/png");
}
async function openPoster() { $("poster-modal").classList.add("open"); $("poster-status").hidden = false; $("poster-image").hidden = true; try { state.posterUrl = await createPosterImage(state.profile); $("poster-image").src = state.posterUrl; $("poster-image").hidden = false; $("poster-status").hidden = true; } catch { setText("poster-status", "报告生成失败，请稍后重试"); } }
function closeModal(id) { $(id).classList.remove("open"); }
function start() { state.index = 0; state.answers = []; renderQuestion(); showScreen("quiz-screen"); }
if (isLocalPreview) { $("access-code").hidden = true; $("access-code").setAttribute("aria-hidden", "true"); document.querySelector("#home-screen .gate-row")?.classList.add("local-preview-mode"); document.querySelector("#home-screen .gate-panel h2").textContent = "本地预览可直接开始测试"; $("start-btn").textContent = "直接开始测试"; }
$("start-btn").addEventListener("click", async () => { const button = $("start-btn"); const member = isLocalPreview ? null : await getMember().catch(() => null); if (!isLocalPreview && !member?.active) { const code = $("access-code").value.trim(); if (!code) { setText("gate-error", "请输入测试码"); return; } button.disabled = true; setText("gate-error", ""); try { await verifyAccessCode(code); } catch (error) { setText("gate-error", error.message); button.disabled = false; return; } button.disabled = false; } start(); });
$("access-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("start-btn").click(); }); $("save-poster-btn").addEventListener("click", openPoster); $("restart-btn").addEventListener("click", start); $("cashback-btn").addEventListener("click", () => $("cashback-modal").classList.add("open")); $("copy-btn").addEventListener("click", async () => { const text = `${PRODUCT_TITLE}：${formatMbtiType(state.profile.result)} ${state.profile.result.name}\n${state.profile.result.summary}`; try { await navigator.clipboard.writeText(text); $("copy-btn").textContent = "已复制"; setTimeout(() => { $("copy-btn").textContent = "复制结果摘要"; }, 1500); } catch {} }); document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal))); document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal.open").forEach((modal) => modal.classList.remove("open")); });
if (globalThis.YunduHistoryReplay?.init) globalThis.YunduHistoryReplay.init(PRODUCT_ID, (snapshot) => { const code = snapshot.result?.name; const result = RESULTS.find((item) => item.code === code); if (result) { const axisProfiles = (snapshot.dimensions || []).map((item, index) => { const axis = AXES[index]; const direction = code[index] || axis.left; return { ...item, key: axis.key, direction, label: direction === axis.left ? `${axis.left}｜${axis.leftLabel}` : `${axis.right}｜${axis.rightLabel}`, displayValue: Number(item.value), status: "历史记录" }; }); state.profile = { result, axisProfiles, attractionRanking: rankAttractions(axisProfiles) }; renderReport(state.profile); } else setText("result-summary", snapshot.overview?.[0]?.body || ""); showScreen("result-screen"); });
