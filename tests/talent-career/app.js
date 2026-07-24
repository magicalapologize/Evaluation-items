(function () {
  "use strict";

  const { DIMENSIONS, TYPES, QUESTIONS, CAREERS } = window.TalentCareerData;
  const DIMENSION_KEYS = Object.keys(DIMENSIONS);
  const TYPE_KEYS = Object.keys(TYPES);
  // Calibrated against 200,000 uniformly random answer sets so neutral answer noise
  // does not make structurally similar archetypes dominate the result pool.
  const TYPE_CALIBRATION = {
    strategist: -0.034307,
    researcher: -0.089823,
    builder: -0.256349,
    solver: -0.198159,
    creator: 0.009545,
    innovator: -0.158657,
    connector: 0.187776,
    mentor: 0.229185,
    organizer: 0.149319,
    operator: -0.045868,
    pioneer: 0.140153,
    explorer: 0.067186
  };
  const $ = (id) => document.getElementById(id);
  const state = { index: 0, answers: [], resultKey: null, rawProfile: null, displayProfile: null, rankedCareers: [] };
  let activeMember = null;

  function validateData() {
    if (QUESTIONS.length !== 45) throw new Error(`题库数量错误：${QUESTIONS.length}`);
    if (TYPE_KEYS.length !== 12) throw new Error(`结果数量错误：${TYPE_KEYS.length}`);
    if (CAREERS.length !== 80) throw new Error(`职业数量错误：${CAREERS.length}`);
    const names = new Set(CAREERS.map((item) => item.name));
    if (names.size !== CAREERS.length) throw new Error("职业库存在重复名称");
    const reminders = TYPE_KEYS.map((key) => TYPES[key].reminder);
    if (new Set(reminders).size !== TYPE_KEYS.length || reminders.some((item) => !item)) throw new Error("专属提醒不完整或重复");
    QUESTIONS.forEach((question, questionIndex) => {
      if (question.options.length !== 4) throw new Error(`第 ${questionIndex + 1} 题不是四个选项`);
      question.options.forEach((option) => {
        const keys = Object.keys(option.scores);
        if (keys.length !== 2 || keys.some((key) => !DIMENSIONS[key])) throw new Error(`第 ${questionIndex + 1} 题计分维度无效`);
      });
    });
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    window.scrollTo(0, 0);
  }

  function applyMemberAccess(member) {
    activeMember = member && member.active ? member : null;
    $("member-unlock").classList.toggle("is-visible", Boolean(activeMember));
    const gateRow = document.querySelector("#home-screen .gate-row");
    const notes = document.querySelector("#home-screen .notes");
    gateRow.classList.toggle("member-access-active", Boolean(activeMember));
    notes.classList.toggle("member-access-hidden", Boolean(activeMember));
    if (activeMember) {
      $("member-plan-label").textContent = `${activeMember.planLabel} · ${YunduMember.formatExpiry(activeMember)}`;
      document.querySelector("#home-screen .gate-title").textContent = "会员通道已开启，可直接生成天赋报告";
      $("start-btn").textContent = "会员直接开始";
    }
  }

  const memberReady = window.YunduMember
    ? YunduMember.getMember().then(applyMemberAccess).catch(() => null)
    : Promise.resolve(null);

  async function verifyAccessCode(code) {
    let response;
    try {
      response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "talent-career", code })
      });
    } catch {
      throw new Error("网络连接失败，请检查网络后重试");
    }
    let result;
    try { result = await response.json(); } catch { throw new Error("验证服务返回异常，请稍后再试"); }
    if (!response.ok || !result.success) throw new Error(result.message || "测试码验证失败");
  }

  function startQuiz() {
    state.index = 0;
    state.answers = [];
    state.resultKey = null;
    showScreen("quiz-screen");
    renderQuestion();
  }

  function renderQuestion() {
    const question = QUESTIONS[state.index];
    $("question-group").textContent = question.group;
    $("question-number").textContent = state.index + 1;
    $("progress-bar").style.width = `${((state.index + 1) / QUESTIONS.length) * 100}%`;
    $("question-text").textContent = question.text;
    $("prev-btn").disabled = state.index === 0;
    $("answer-list").innerHTML = question.options.map((option, index) => `
      <button class="answer-btn${state.answers[state.index] === index ? " selected" : ""}" type="button" data-answer="${index}">
        <span>${String.fromCharCode(65 + index)}</span><span>${option.text}</span>
      </button>
    `).join("");
    $("answer-list").querySelectorAll(".answer-btn").forEach((button) => {
      button.addEventListener("click", () => selectAnswer(Number(button.dataset.answer), button));
    });
  }

  function selectAnswer(answerIndex, button) {
    state.answers[state.index] = answerIndex;
    $("answer-list").querySelectorAll(".answer-btn").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    window.setTimeout(() => {
      if (state.index < QUESTIONS.length - 1) {
        state.index += 1;
        renderQuestion();
      } else {
        calculateResult();
        renderResult();
        showScreen("result-screen");
      }
    }, 110);
  }

  function emptyProfile() {
    return Object.fromEntries(DIMENSION_KEYS.map((key) => [key, 0]));
  }

  function rawProfileForAnswers(answers) {
    const raw = emptyProfile();
    answers.forEach((answerIndex, index) => {
      const option = QUESTIONS[index].options[answerIndex];
      Object.entries(option.scores).forEach(([key, value]) => { raw[key] += value; });
    });
    return raw;
  }

  function centeredUnit(vector) {
    const values = DIMENSION_KEYS.map((key) => Number(vector[key] || 0));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const centered = values.map((value) => value - mean);
    const length = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0)) || 1;
    return centered.map((value) => value / length);
  }

  function cosine(a, b) {
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }

  function answerFingerprint(answers) {
    return answers.reduce((hash, value, index) => ((hash * 33) ^ ((value + 1) * (index + 17))) >>> 0, 2166136261);
  }

  function matchType(raw, answers) {
    const user = centeredUnit(raw);
    const fingerprint = answerFingerprint(answers);
    return TYPE_KEYS.map((key, index) => ({
      key,
      similarity: cosine(user, centeredUnit(TYPES[key].prototype)),
      adjusted: cosine(user, centeredUnit(TYPES[key].prototype)) + TYPE_CALIBRATION[key],
      tie: ((fingerprint ^ ((index + 1) * 2654435761)) >>> 0) / 4294967295
    })).sort((a, b) => (b.adjusted - a.adjusted) || (b.tie - a.tie))[0];
  }

  function displayProfile(raw) {
    const values = DIMENSION_KEYS.map((key) => raw[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;
    return Object.fromEntries(DIMENSION_KEYS.map((key) => [key, Math.round(38 + ((raw[key] - min) / spread) * 57)]));
  }

  function careerPrototype(career) {
    const profile = Object.fromEntries(DIMENSION_KEYS.map((key) => [key, 38]));
    career.dims.forEach((key, index) => { profile[key] = [96, 84, 74][index]; });
    return profile;
  }

  function rankCareers(raw) {
    const user = centeredUnit(raw);
    return CAREERS.map((item) => {
      const similarity = cosine(user, centeredUnit(careerPrototype(item)));
      return { ...item, similarity, score: Math.max(58, Math.min(96, Math.round(72 + similarity * 25))) };
    }).sort((a, b) => (b.similarity - a.similarity) || a.name.localeCompare(b.name, "zh-CN"));
  }

  function calculateResult() {
    const raw = rawProfileForAnswers(state.answers);
    const matched = matchType(raw, state.answers);
    state.rawProfile = raw;
    state.resultKey = matched.key;
    state.typeSimilarity = matched.similarity;
    state.displayProfile = displayProfile(raw);
    state.rankedCareers = rankCareers(raw);
  }

  function renderResult() {
    const result = TYPES[state.resultKey];
    const typeIndex = TYPE_KEYS.indexOf(state.resultKey) + 1;
    const matchScore = Math.max(72, Math.min(96, Math.round(76 + Math.max(0, state.typeSimilarity) * 23)));
    $("report-date").textContent = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    $("result-index").textContent = String(typeIndex).padStart(2, "0");
    $("result-name").textContent = result.name;
    $("result-alias").textContent = result.alias;
    $("result-tags").innerHTML = result.tags.map((tag) => `<span>${tag}</span>`).join("");
    $("result-summary").textContent = result.summary;
    $("top-match").textContent = `${matchScore}%`;
    $("result-portrait").textContent = result.portrait;
    $("result-strengths").textContent = result.strengths;
    $("result-risk").textContent = result.risk;
    $("result-environment").textContent = result.environment;
    $("result-avoid").textContent = result.avoid;
    $("result-reminder").textContent = `给你的提醒：${result.reminder}`;
    $("advice-list").innerHTML = result.advices.map((advice) => `<div class="advice-item">${advice}</div>`).join("");

    const dimensions = DIMENSION_KEYS.map((key) => ({ key, ...DIMENSIONS[key], value: state.displayProfile[key] })).sort((a, b) => b.value - a.value);
    $("dimension-list").innerHTML = dimensions.map((item) => `
      <div class="dimension-item"><span class="dimension-name">${item.name}</span><span class="dimension-track"><i style="width:${item.value}%"></i></span><strong class="dimension-value">${item.value}</strong></div>
    `).join("");
    renderRadar();

    $("top-careers").innerHTML = state.rankedCareers.slice(0, 3).map((careerItem, index) => `
      <article class="career-card${index === 0 ? " rank-one" : ""}">
        <div class="career-rank"><span>TOP ${index + 1} · ${careerItem.group}</span><strong class="career-score">${careerItem.score}%</strong></div>
        <h3>${careerItem.name}</h3><p>${careerItem.mode}</p>
        <div class="career-skills">${careerItem.dims.map((key) => `<span>${DIMENSIONS[key].name}</span>`).join("")}</div>
        <p class="career-entry">进入建议：${careerItem.entry}</p>
      </article>
    `).join("");
    renderCareerMap();
  }

  function radarPoint(index, value, count, center, radius) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2 / count);
    return [center + Math.cos(angle) * radius * value, center + Math.sin(angle) * radius * value];
  }

  function renderRadar() {
    const svg = $("radar-chart");
    const center = 220;
    const radius = 145;
    const count = DIMENSION_KEYS.length;
    const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
      const points = DIMENSION_KEYS.map((_, index) => radarPoint(index, scale, count, center, radius).join(",")).join(" ");
      return `<polygon points="${points}" fill="none" stroke="#d7e2f2" stroke-width="1" />`;
    }).join("");
    const axes = DIMENSION_KEYS.map((key, index) => {
      const [x, y] = radarPoint(index, 1, count, center, radius);
      const [tx, ty] = radarPoint(index, 1.22, count, center, radius);
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#d7e2f2" /><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#62708a" font-size="12">${DIMENSIONS[key].short}</text>`;
    }).join("");
    const profilePoints = DIMENSION_KEYS.map((key, index) => radarPoint(index, state.displayProfile[key] / 100, count, center, radius));
    svg.innerHTML = `${rings}${axes}<polygon points="${profilePoints.map((point) => point.join(",")).join(" ")}" fill="rgba(36,87,255,.18)" stroke="#2457ff" stroke-width="3" />${profilePoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#22d3ee" stroke="#2457ff" stroke-width="2" />`).join("")}`;
  }

  function renderCareerMap() {
    const rankByName = new Map(state.rankedCareers.map((item, index) => [item.name, { ...item, rank: index }]));
    const groups = [...new Set(CAREERS.map((item) => item.group))];
    $("career-map").innerHTML = groups.map((group) => {
      const items = CAREERS.filter((item) => item.group === group).map((item) => rankByName.get(item.name));
      return `<section class="career-group"><h3>${group}<span>8 个方向</span></h3><div class="career-grid">${items.map((item) => {
        const tier = item.rank < 16 ? ["high", "高匹配"] : item.rank < 48 ? ["explore", "值得探索"] : ["caution", "谨慎核对"];
        return `<div class="career-cell ${tier[0]}"><strong>${item.name}</strong><span>${tier[1]} · ${item.score}%</span></div>`;
      }).join("")}</div></section>`;
    }).join("");
  }

  function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const characters = Array.from(text);
    const lines = [];
    let line = "";
    characters.forEach((character) => {
      const testLine = line + character;
      if (ctx.measureText(testLine).width > maxWidth && line) { lines.push(line); line = character; } else { line = testLine; }
    });
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines || lines.length);
    if (maxLines && lines.length > maxLines) visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, -1)}…`;
    visible.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
    return y + visible.length * lineHeight;
  }

  function loadPosterImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("报告二维码加载失败"));
      image.src = src;
    });
  }

  async function createPosterImage() {
    const result = TYPES[state.resultKey];
    const qrImage = await loadPosterImage("../../assets/product-qrs/talent-career.png");
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 2520;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4f8ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#10182b";
    ctx.fillRect(0, 0, 1800, 650);
    ctx.strokeStyle = "rgba(34,211,238,.13)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 1800; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 650); ctx.stroke(); }
    for (let y = 0; y <= 650; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1800, y); ctx.stroke(); }

    roundedRect(ctx, 110, 72, 62, 62, 12, "#2457ff");
    ctx.fillStyle = "#ffffff"; ctx.font = "800 34px PingFang SC, sans-serif"; ctx.textAlign = "center"; ctx.fillText("T", 141, 115);
    ctx.textAlign = "left"; ctx.font = "800 28px PingFang SC, sans-serif"; ctx.fillText("TALENT CAREER ATLAS", 194, 112);
    ctx.fillStyle = "#22d3ee"; ctx.font = "800 24px PingFang SC, sans-serif"; ctx.fillText("你的核心天赋原型", 110, 232);
    ctx.fillStyle = "#ffffff"; ctx.font = "900 86px PingFang SC, sans-serif"; ctx.fillText(result.name, 110, 342);
    ctx.fillStyle = "#aebbd1"; ctx.font = "500 32px PingFang SC, sans-serif"; ctx.fillText(result.alias, 110, 397);
    result.tags.forEach((tag, index) => {
      roundedRect(ctx, 110 + index * 166, 447, 145, 58, 10, "rgba(34,211,238,.1)", "rgba(34,211,238,.35)");
      ctx.fillStyle = "#dffbff"; ctx.font = "800 24px PingFang SC, sans-serif"; ctx.textAlign = "center"; ctx.fillText(tag, 182 + index * 166, 485);
    });
    ctx.textAlign = "left"; ctx.fillStyle = "#c2cce0"; ctx.font = "500 27px PingFang SC, sans-serif";
    drawWrappedText(ctx, result.summary, 110, 565, 1180, 42, 2);
    ctx.fillStyle = "#22d3ee"; ctx.font = "900 82px PingFang SC, sans-serif"; ctx.textAlign = "right";
    const matchScore = Math.max(72, Math.min(96, Math.round(76 + Math.max(0, state.typeSimilarity) * 23)));
    ctx.fillText(`${matchScore}%`, 1660, 344);
    ctx.fillStyle = "#8fa1bf"; ctx.font = "500 23px PingFang SC, sans-serif"; ctx.fillText("职业画像契合度", 1660, 385);

    ctx.textAlign = "left"; ctx.fillStyle = "#13203a"; ctx.font = "900 38px PingFang SC, sans-serif"; ctx.fillText("九维天赋图谱", 110, 735);
    ctx.fillStyle = "#62708a"; ctx.font = "500 22px PingFang SC, sans-serif"; ctx.fillText("反映本次答卷内部的相对强弱", 110, 775);
    DIMENSION_KEYS.forEach((key, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 110 + column * 540;
      const y = 830 + row * 150;
      roundedRect(ctx, x, y, 500, 118, 12, "#ffffff", "#d7e2f2");
      ctx.fillStyle = "#13203a"; ctx.font = "800 25px PingFang SC, sans-serif"; ctx.textAlign = "left"; ctx.fillText(DIMENSIONS[key].name, x + 24, y + 40);
      ctx.fillStyle = "#2457ff"; ctx.font = "900 27px PingFang SC, sans-serif"; ctx.textAlign = "right"; ctx.fillText(String(state.displayProfile[key]), x + 470, y + 40);
      roundedRect(ctx, x + 24, y + 70, 452, 10, 5, "#e8eef8");
      roundedRect(ctx, x + 24, y + 70, 452 * state.displayProfile[key] / 100, 10, 5, "#2457ff");
    });

    ctx.textAlign = "left"; ctx.fillStyle = "#13203a"; ctx.font = "900 38px PingFang SC, sans-serif"; ctx.fillText("优先探索的职业方向", 110, 1345);
    state.rankedCareers.slice(0, 3).forEach((item, index) => {
      const x = 110 + index * 540;
      const y = 1390;
      roundedRect(ctx, x, y, 500, 270, 14, index === 0 ? "#10182b" : "#ffffff", index === 0 ? "#10182b" : "#d7e2f2");
      ctx.fillStyle = index === 0 ? "#22d3ee" : "#2457ff"; ctx.font = "800 21px PingFang SC, sans-serif"; ctx.textAlign = "left"; ctx.fillText(`TOP ${index + 1} · ${item.group}`, x + 24, y + 40);
      ctx.textAlign = "right"; ctx.font = "900 32px PingFang SC, sans-serif"; ctx.fillText(`${item.score}%`, x + 472, y + 42);
      ctx.textAlign = "left"; ctx.fillStyle = index === 0 ? "#ffffff" : "#13203a"; ctx.font = "900 34px PingFang SC, sans-serif"; ctx.fillText(item.name, x + 24, y + 96);
      ctx.fillStyle = index === 0 ? "#b9c6db" : "#62708a"; ctx.font = "500 22px PingFang SC, sans-serif"; drawWrappedText(ctx, item.mode, x + 24, y + 140, 450, 34, 3);
      ctx.fillStyle = index === 0 ? "#dffbff" : "#2457ff"; ctx.font = "700 20px PingFang SC, sans-serif"; ctx.fillText(item.dims.map((key) => DIMENSIONS[key].short).join(" · "), x + 24, y + 238);
    });

    ctx.fillStyle = "#13203a"; ctx.font = "900 38px PingFang SC, sans-serif"; ctx.fillText("未来 90 天行动建议", 110, 1745);
    result.advices.forEach((advice, index) => {
      const y = 1795 + index * 126;
      roundedRect(ctx, 110, y, 1580, 100, 12, "#ffffff", "#d7e2f2");
      roundedRect(ctx, 134, y + 24, 52, 52, 10, "#2457ff");
      ctx.fillStyle = "#ffffff"; ctx.font = "900 22px PingFang SC, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`0${index + 1}`, 160, y + 58);
      ctx.fillStyle = "#13203a"; ctx.font = "500 24px PingFang SC, sans-serif"; ctx.textAlign = "left"; drawWrappedText(ctx, advice, 216, y + 40, 1420, 34, 2);
    });

    roundedRect(ctx, 110, 2200, 1580, 240, 18, "#10182b");
    ctx.drawImage(qrImage, 150, 2230, 180, 180);
    ctx.fillStyle = "#ffffff"; ctx.font = "900 34px PingFang SC, sans-serif"; ctx.textAlign = "left"; ctx.fillText("测出你的天赋能力与职业方向", 390, 2282);
    ctx.fillStyle = "#22d3ee"; ctx.font = "700 25px PingFang SC, sans-serif"; ctx.fillText("长按识别二维码 · 解锁完整职业报告", 390, 2330);
    ctx.fillStyle = "#9eacc4"; ctx.font = "500 22px PingFang SC, sans-serif"; ctx.fillText("分享给正在选专业、求职或考虑转型的朋友", 390, 2375);
    ctx.textAlign = "right"; ctx.fillStyle = "#7f8ca4"; ctx.font = "500 20px PingFang SC, sans-serif"; ctx.fillText("©2026 云渡沧海", 1660, 2485);
    return canvas.toDataURL("image/png");
  }

  async function openPoster() {
    const button = $("save-poster-btn");
    button.disabled = true;
    button.textContent = "正在生成...";
    try {
      $("poster-image").src = await createPosterImage();
      $("poster-modal").classList.add("active");
    } catch (error) {
      window.alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "保存报告海报";
    }
  }

  async function copySummary() {
    const result = TYPES[state.resultKey];
    const topDimensions = DIMENSION_KEYS.map((key) => ({ name: DIMENSIONS[key].name, value: state.displayProfile[key] })).sort((a, b) => b.value - a.value).slice(0, 3);
    const text = `我的天赋原型：${result.name}\n核心天赋：${topDimensions.map((item) => `${item.name}${item.value}`).join("、")}\n优先职业方向：${state.rankedCareers.slice(0, 3).map((item) => item.name).join("、")}\n${result.reminder}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove();
    }
    const button = $("copy-result-btn");
    button.textContent = "已复制";
    window.setTimeout(() => { button.textContent = "复制结果摘要"; }, 1600);
  }

  $("start-btn").addEventListener("click", async () => {
    const button = $("start-btn");
    const code = $("access-code").value.trim().toUpperCase();
    button.disabled = true;
    button.textContent = "正在验证...";
    $("gate-error").textContent = "";
    try {
      await memberReady;
      if (!activeMember) await verifyAccessCode(code);
      startQuiz();
    } catch (error) {
      $("gate-error").textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = activeMember ? "会员直接开始" : "验证并开始";
    }
  });
  $("access-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("start-btn").click(); });
  $("prev-btn").addEventListener("click", () => { if (state.index > 0) { state.index -= 1; renderQuestion(); } });
  $("restart-btn").addEventListener("click", startQuiz);
  $("save-poster-btn").addEventListener("click", openPoster);
  $("copy-result-btn").addEventListener("click", copySummary);
  $("cashback-btn").addEventListener("click", () => $("cashback-modal").classList.add("active"));
  $("poster-close").addEventListener("click", () => $("poster-modal").classList.remove("active"));
  $("cashback-close").addEventListener("click", () => $("cashback-modal").classList.remove("active"));
  [$("poster-modal"), $("cashback-modal")].forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.remove("active"); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal.active").forEach((modal) => modal.classList.remove("active")); });

  validateData();
  window.__talentCareerTest = { rawProfileForAnswers, matchType, displayProfile, rankCareers, calculateResult, data: { DIMENSIONS, TYPES, QUESTIONS, CAREERS } };
})();
