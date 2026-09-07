const GLYPHS = ".:-=+*#%@";

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
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
  return 0.2126 * srgbToLinear(r) + 0.0722 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
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
  return `rgba(${channels.join(", ")}, ${ratio})`;
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
    renderStatic: () => undefined,
    play: () => undefined,
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
    if (!source || typeof samplingContext.drawImage !== "function") return;
    const columns = Math.max(1, Math.floor(width / (options.cellWidth || 9)));
    const rows = Math.max(1, Math.floor(height / (options.cellHeight || 14)));
    samplingCanvas.width = columns; samplingCanvas.height = rows;
    let pixels;
    try {
      samplingContext.drawImage(source, 0, 0, columns, rows);
      pixels = samplingContext.getImageData(0, 0, columns, rows).data;
    } catch {
      return;
    }
    const palette = Array.isArray(config.palette) && config.palette.length ? config.palette : ["#2CB7A5"];
    context.font = `${options.fontSize || 12}px monospace`;
    context.textBaseline = "top";
    const order = seededOrder(columns * rows, config.seed);
    for (const position of order) {
      const offset = position * 4;
      const brightness = relativeLuminance(pixels[offset] / 255, pixels[offset + 1] / 255, pixels[offset + 2] / 255) * (pixels[offset + 3] / 255);
      const x = (position % columns) * width / columns;
      const y = Math.floor(position / columns) * height / rows;
      context.fillStyle = mixLinearColor(palette[position % palette.length], config.background || options.background || "#142A43", brightness);
      context.fillText(brightnessToGlyph(brightness), x, y);
    }
  }

  function play(config = {}) {
    pause();
    if (config.mode !== "assembly" || destroyed) return;
    lastConfig = { ...lastConfig, ...config };
    const start = Date.now();
    const tick = () => { if (destroyed) return; renderStatic(config); if (Date.now() - start < (config.duration || 1000)) frame = raf(tick); else frame = null; };
    frame = raf(tick);
  }
  function pause() { if (frame !== null) { cancel(frame); frame = null; } }
  function destroy() {
    pause(); destroyed = true; cache.clear(); loadedSource = null;
    if (resizeObserver && typeof resizeObserver.disconnect === "function") resizeObserver.disconnect();
    if (typeof document.removeEventListener === "function") document.removeEventListener("visibilitychange", visibilityHandler);
  }
  return { fallback: false, load, renderStatic, play, pause, destroy };
}

export { GLYPHS };
