const GLYPHS = ".:-=+*#%@";

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export function calculateGlyphGrid(width, height, viewportWidth = width, options = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || safeWidth);
  const mobile = safeViewportWidth <= 760;
  const minColumns = mobile ? 52 : 96;
  const maxColumns = mobile ? 72 : 120;
  const cellWidth = Number(options.cellWidth) > 0 ? Number(options.cellWidth) : 9;
  const cellHeight = Number(options.cellHeight) > 0 ? Number(options.cellHeight) : 14;
  const densityCellWidth = Number(options.cellWidth) > 0 ? cellWidth : (mobile ? 5 : 5.2);
  const columns = Math.max(minColumns, Math.min(maxColumns, Math.round(safeWidth / densityCellWidth)));
  const minRows = mobile ? 32 : 56;
  const maxRows = mobile ? 46 : 72;
  const rowScale = Number(options.rowScale) > 0 ? Number(options.rowScale) : (mobile ? 0.65 : 0.9);
  const aspectRows = columns * (safeHeight / safeWidth) * (cellWidth / cellHeight) * rowScale;
  const rows = Math.max(minRows, Math.min(maxRows, Math.round(aspectRows)));
  return { columns, rows };
}

export function srgbToLinear(channel) {
  const value = clamp(channel);
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(channel) {
  const value = clamp(channel);
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function relativeLuminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function brightnessToGlyph(value, glyphs = GLYPHS) {
  const set = typeof glyphs === "string" && glyphs.length ? glyphs : GLYPHS;
  const index = Math.round(clamp(value) * (set.length - 1));
  return set[index];
}

function parseHexColor(color) {
  const value = String(color || "").trim().replace(/^#/, "");
  const hex = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  if (!/^[\da-f]{6}$/i.test(hex)) return [0, 0, 0];
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
}

export function mixLinearColor(foreground, background, amount) {
  const ratio = clamp(amount);
  const fg = parseHexColor(foreground).map(srgbToLinear);
  const bg = parseHexColor(background).map(srgbToLinear);
  const channels = fg.map((value, index) => Math.round(clamp(linearToSrgb(value * ratio + bg[index] * (1 - ratio))) * 255));
  return `rgba(${channels.join(", ")}, 1)`;
}

function seededOrder(length, seed) {
  let state = (Number(seed) >>> 0) || 1;
  const order = Array.from({ length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

function noOpRenderer() {
  return {
    fallback: true,
    load: async (source) => source,
    renderStatic: () => false,
    play: () => false,
    pause: () => undefined,
    destroy: () => undefined,
  };
}

export function createGlyphRenderer(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== "function" || typeof document === "undefined") return noOpRenderer();
  const context = canvas.getContext("2d");
  if (!context || typeof document.createElement !== "function") return noOpRenderer();

  const samplingCanvas = document.createElement("canvas");
  const samplingContext = samplingCanvas.getContext && samplingCanvas.getContext("2d", { willReadFrequently: true });
  if (!samplingContext) return noOpRenderer();
  const cache = new Map();
  let frame = null;
  let destroyed = false;
  let loadedSource = null;
  let lastConfig = {};
  let wasPlaying = false;
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (callback) => setTimeout(callback, 16);
  const cancel = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    if (!destroyed) renderStatic(lastConfig);
  }) : null;
  const visibilityHandler = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      wasPlaying = lastConfig.mode === "assembly" && frame !== null;
      pause();
    } else if (wasPlaying) {
      play(lastConfig);
    } else if (lastConfig.source || loadedSource) {
      renderStatic(lastConfig);
    }
  };
  if (resizeObserver && typeof resizeObserver.observe === "function") resizeObserver.observe(canvas);
  if (typeof document.addEventListener === "function") document.addEventListener("visibilitychange", visibilityHandler);

  function load(source) {
    if (cache.has(source)) return cache.get(source);
    const promise = new Promise((resolve, reject) => {
      if (source && typeof source === "object" && typeof source.width === "number") return resolve(source);
      if (typeof Image === "undefined") return resolve(null);
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    }).then((value) => { loadedSource = value; return value; });
    cache.set(source, promise);
    return promise;
  }

  function renderStatic(config = {}) {
    if (destroyed) return;
    lastConfig = { ...lastConfig, ...config };
    const source = config.source || loadedSource;
    const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = config.background || options.background || "#142A43";
    context.fillRect(0, 0, width, height);
    if (!source || typeof samplingContext.drawImage !== "function") return false;
    const { columns, rows } = calculateGlyphGrid(width, height, (typeof window !== "undefined" && window.innerWidth) || width, options);
    samplingCanvas.width = columns; samplingCanvas.height = rows;
    let pixels;
    try {
      samplingContext.drawImage(source, 0, 0, columns, rows);
      pixels = samplingContext.getImageData(0, 0, columns, rows).data;
    } catch {
      return false;
    }
    const palette = Array.isArray(config.palette) && config.palette.length ? config.palette : ["#2CB7A5"];
    context.font = `700 ${Math.min(options.fontSize || 12, height / rows)}px monospace`;
    context.textBaseline = "top";
    const order = seededOrder(columns * rows, config.seed);
    const assemblyProgress = config.mode === "assembly" ? clamp(config.progress ?? 1) : 1;
    const visibleCount = Math.max(1, Math.floor(order.length * assemblyProgress));
    for (let orderIndex = 0; orderIndex < visibleCount; orderIndex += 1) {
      const position = order[orderIndex];
      const offset = position * 4;
      const brightness = relativeLuminance(pixels[offset] / 255, pixels[offset + 1] / 255, pixels[offset + 2] / 255) * (pixels[offset + 3] / 255);
      const x = (position % columns) * width / columns;
      const y = Math.floor(position / columns) * height / rows;
      const stageOpacity = config.mode === "assembly" ? 0.4 + assemblyProgress * 0.6 : 1;
      context.globalAlpha = stageOpacity;
      context.fillStyle = mixLinearColor(palette[position % palette.length], config.background || options.background || "#142A43", brightness);
      context.fillText(brightnessToGlyph(brightness), x, y);
    }
    context.globalAlpha = 1;
    return true;
  }

  function play(config = {}) {
    pause();
    if (config.mode !== "assembly" || destroyed) return false;
    lastConfig = { ...lastConfig, ...config };
    if (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return renderStatic({ ...config, mode: "static" });
    }
    if (!renderStatic({ ...config, progress: 0.12 })) return false;
    const start = Date.now();
    const tick = () => {
      if (destroyed) return;
      const elapsed = Date.now() - start;
      const duration = config.duration || 1000;
      const progress = Math.min(1, elapsed / duration);
      renderStatic({ ...config, progress });
      if (progress < 1) frame = raf(tick); else frame = null;
    };
    frame = raf(tick);
    return true;
  }
  function pause() { if (frame !== null) { cancel(frame); frame = null; } }
  function destroy() {
    pause(); destroyed = true; cache.clear(); loadedSource = null;
    if (resizeObserver && typeof resizeObserver.disconnect === "function") resizeObserver.disconnect();
    if (typeof document.removeEventListener === "function") document.removeEventListener("visibilitychange", visibilityHandler);
  }
  return { fallback: false, load, renderStatic, play, pause, destroy };
}

export function createParticleRenderer(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== "function" || typeof document === "undefined") {
    return { fallback: true, renderStatic: () => false, play: () => false, pause: () => undefined, destroy: () => undefined };
  }
  const context = canvas.getContext("2d");
  if (!context) return { fallback: true, renderStatic: () => false, play: () => false, pause: () => undefined, destroy: () => undefined };
  const requestedCount = Number(options.count) || 3200;
  const palette = Array.isArray(options.palette) && options.palette.length ? options.palette : ["#2CB7A5"];
  const background = options.background || "#05070B";
  const words = Array.isArray(options.talentWords) && options.talentWords.length ? options.talentWords : ["语言", "逻辑", "空间", "身体", "音乐", "人际", "内在", "自然"];
  const glyphs = ".:·×▫+=*#%@";
  const bestKey = String(options.bestKey || "");
  const bestIndex = { language: 0, logic: 1, spatial: 2, body: 3, music: 4, interpersonal: 5, introspection: 6, nature: 7 }[bestKey];
  const bestColor = options.bestColor || (Number.isInteger(bestIndex) ? palette[bestIndex % palette.length] : null);
  let frame = null;
  let destroyed = false;
  let width = 1;
  let height = 1;
  let seed = (Number(options.seed) >>> 0) || 1;
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (callback) => setTimeout(() => callback(Date.now()), 16);
  const cancel = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const mobile = typeof window !== "undefined" && Number(window.innerWidth) <= 760;
  const signalMode = options.mode === "signal";
  const count = signalMode
    ? Math.max(mobile ? 220 : 320, Math.min(mobile ? 480 : 900, requestedCount))
    : Math.max(mobile ? 1400 : 2800, Math.min(mobile ? 2200 : 4200, requestedCount));
  const matrix = Array.from({ length: count }, (_, index) => ({
    x: random(), y: random(), phase: random() * Math.PI * 2, drift: 0.2 + random() * 0.8,
    brightness: 0.14 + random() * 0.6, colorIndex: index % palette.length, revealOrder: random(),
  }));
  const fragments = Array.from({ length: Math.max(18, Math.min(48, words.length * 5)) }, (_, index) => ({
    text: String(words[index % words.length] || "").slice(index % 2, (index % 2) + 1) || "·",
    x: random(), y: random(), phase: random() * Math.PI * 2, drift: 0.1 + random() * 0.25,
    colorIndex: index % palette.length, alpha: 0.16 + random() * 0.26,
  }));
  const orbs = Array.from({ length: 4 }, (_, index) => ({ x: 0.16 + random() * 0.68, y: 0.16 + random() * 0.68, radius: 0.12 + random() * 0.22, phase: index * 1.7 + random() * 2 }));
  const resize = () => {
    width = Math.max(1, canvas.clientWidth || canvas.width || 1);
    height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  const visibilityHandler = () => { if (document.hidden) pause(); };
  if (resizeObserver?.observe) resizeObserver.observe(canvas);
  document.addEventListener?.("visibilitychange", visibilityHandler);
  function renderStatic(time = 0, runtime = {}) {
    if (destroyed) return false;
    resize(); context.clearRect(0, 0, width, height); if (background !== "transparent") { context.fillStyle = background; context.fillRect(0, 0, width, height); }
    const now = Number(time) || 0;
    const loadingMode = runtime.mode === "loading" || options.mode === "loading";
    const progress = loadingMode ? Math.max(0, Math.min(1, Number.isFinite(runtime.progress) ? runtime.progress : 0)) : 1;
    const activeWords = Array.isArray(runtime.highlightWords) && runtime.highlightWords.length ? runtime.highlightWords : (Array.isArray(options.highlightWords) && options.highlightWords.length ? options.highlightWords : words);
    const activeBestColor = runtime.bestColor || bestColor || palette[0];
    const shape = runtime.shape || options.shape || "field";
    const colorFor = (index) => palette[index % palette.length];
    const orbEnergy = (x, y) => orbs.reduce((total, orb) => {
      const dx = x - orb.x; const dy = (y - orb.y) * 0.72; const distance = Math.sqrt(dx * dx + dy * dy);
      return total + Math.max(0, 1 - distance / orb.radius) ** 2;
    }, 0);
    for (const cell of matrix) {
      const wave = loadingMode ? 0 : Math.sin(now * 0.00035 * cell.drift + cell.phase);
      const xRatio = loadingMode ? cell.x : ((cell.x + wave * 0.012) % 1 + 1) % 1;
      const yRatio = loadingMode ? cell.y : ((cell.y + Math.cos(now * 0.00022 * cell.drift + cell.phase) * 0.01) % 1 + 1) % 1;
      const dx = xRatio - 0.5;
      const dy = (yRatio - 0.5) * 1.1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ring = shape === "talent-map" ? Math.exp(-((distance - 0.22) ** 2) / 0.0028) : 0;
      const core = shape === "talent-map" ? Math.exp(-(((dx + 0.055) ** 2) + ((dy + 0.02) ** 2)) / 0.018) : 0;
      const reveal = loadingMode ? Math.max(0, Math.min(1, progress * 1.45 - cell.revealOrder * 0.95)) : 1;
      const energy = loadingMode ? Math.min(1, 0.04 + cell.brightness * 0.2 + reveal * (0.5 + ring * 0.55 + core * 0.32)) : Math.min(1, cell.brightness + orbEnergy(xRatio, yRatio) * 0.5 + (wave + 1) * 0.06 + ring * 0.46 + core * 0.3);
      const glyph = glyphs[Math.max(0, Math.min(glyphs.length - 1, Math.floor(energy * (glyphs.length - 1))))];
      context.globalAlpha = Math.min(0.7, 0.12 + energy * 0.48);
      const matrixColorIndex = Number.isInteger(bestIndex) && cell.colorIndex % 3 === 0 ? bestIndex : cell.colorIndex;
      context.fillStyle = ring > 0.35 || core > 0.35 ? activeBestColor : colorFor(matrixColorIndex);
      const x = xRatio * width; const y = yRatio * height;
      if (typeof context.fillText === "function") {
        context.font = `${Math.max(8, Math.min(13, width / 95))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textBaseline = "top";
        context.fillText(glyph, x, y);
      } else if (typeof context.beginPath === "function" && typeof context.arc === "function" && typeof context.fill === "function") {
        context.beginPath(); context.arc(x, y, 0.7 + energy * 1.3, 0, Math.PI * 2); context.fill();
      }
    }
    if (typeof context.fillText === "function") {
      context.font = `${Math.max(12, Math.min(20, width / 46))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "middle";
      for (const fragment of fragments) {
        const drift = loadingMode ? 0 : Math.sin(now * 0.0002 * fragment.drift + fragment.phase);
        const x = (loadingMode ? fragment.x : ((fragment.x + drift * 0.04) % 1 + 1) % 1) * width;
        const y = (loadingMode ? fragment.y : ((fragment.y + Math.cos(now * 0.00017 * fragment.drift + fragment.phase) * 0.025) % 1 + 1) % 1) * height;
        const focus = bestColor && fragment.colorIndex === bestIndex ? 1.45 : 1;
        context.globalAlpha = loadingMode ? Math.min(0.3, fragment.alpha * 0.75 + progress * 0.12) : Math.min(0.62, fragment.alpha * focus + orbEnergy(x / width, y / height) * 0.12);
        context.fillStyle = colorFor(Number.isInteger(bestIndex) && fragment.colorIndex === bestIndex ? bestIndex : fragment.colorIndex);
        context.fillText(fragment.text, x, y);
      }
      if (runtime.highlightWords?.length || options.highlightWords?.length) {
        const highlightChars = Array.from(activeWords.join(""));
        if (signalMode || runtime.mode === "signal") {
          context.font = `${Math.max(8, Math.min(13, width / 95))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          const step = Math.max(12, width / Math.max(12, highlightChars.length));
          const offset = (now * 0.035) % Math.max(step, width * 0.24);
          highlightChars.forEach((character, index) => {
            const x = ((index * step - offset) % (width + step) + width + step) % (width + step) - step;
            const y = height * (0.26 + ((index % 3) * 0.24));
            context.globalAlpha = 0.48 + 0.34 * ((Math.sin(now * 0.002 + index) + 1) * 0.5);
            context.fillStyle = index % 2 ? activeBestColor : "#F5F8F6";
            context.fillText(character, x, y);
          });
        } else if (loadingMode) {
          context.font = `${Math.max(13, Math.min(22, width / 40))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          const radius = Math.min(width, height) * 0.21;
          highlightChars.forEach((character, index) => {
            const angle = -Math.PI * 0.82 + index * 0.42;
            const x = width * 0.5 + Math.cos(angle) * radius;
            const y = height * 0.5 + Math.sin(angle) * radius * 0.7;
            const reveal = Math.max(0, Math.min(1, progress * 1.7 - index / Math.max(1, highlightChars.length) * 1.1));
            context.globalAlpha = 0.08 + reveal * 0.82;
            context.fillStyle = index % 2 ? activeBestColor : "#F5F8F6";
            context.fillText(character, x, y);
          });
        } else {
          context.font = `${Math.max(13, Math.min(22, width / 40))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          highlightChars.forEach((character, index) => {
            const angle = -Math.PI * 0.82 + index * 0.42 + now * 0.00012;
            const radius = Math.min(width, height) * 0.21;
            const x = width * 0.5 + Math.cos(angle) * radius;
            const y = height * 0.5 + Math.sin(angle) * radius * 0.7;
            context.globalAlpha = 0.48 + 0.3 * ((Math.sin(now * 0.002 + index) + 1) * 0.5);
            context.fillStyle = index % 2 ? activeBestColor : "#F5F8F6";
            context.fillText(character, x, y);
          });
        }
      }
    }
    if (!loadingMode && typeof context.beginPath === "function" && typeof context.moveTo === "function" && typeof context.lineTo === "function" && typeof context.stroke === "function") {
      const scanY = ((now * 0.000035) % 1) * height;
      context.globalAlpha = 0.12;
      context.strokeStyle = bestColor || palette[0];
      context.lineWidth = 1;
      context.beginPath(); context.moveTo(0, scanY); context.lineTo(width, scanY); context.stroke();
    }
    context.globalAlpha = 1; return true;
  }
  function pause() { if (frame !== null) { cancel(frame); frame = null; } }
  function play(runtime = {}) {
    pause(); if (destroyed) return false;
    const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (runtime.mode === "loading" || options.mode === "loading") { runtime.startedAt = Date.now(); runtime.duration = Number(runtime.duration) || 2600; runtime.progress = reduced ? 1 : 0; }
    renderStatic(Date.now(), runtime); if (reduced) return true;
    const tick = (time) => { if (destroyed) return; if (runtime.mode === "loading" || options.mode === "loading") runtime.progress = Math.max(0, Math.min(1, (time - runtime.startedAt) / runtime.duration)); renderStatic(time, runtime); frame = raf(tick); };
    frame = raf(tick); return true;
  }
  function destroy() { pause(); destroyed = true; resizeObserver?.disconnect?.(); document.removeEventListener?.("visibilitychange", visibilityHandler); }
  return { fallback: false, renderStatic, play, pause, destroy };
}

export { GLYPHS };
