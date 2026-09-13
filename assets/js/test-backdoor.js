(function installYunduBackdoor(root, document) {
  "use strict";

  const enabled = document.querySelector("meta[name='yundu-backdoor-enabled']")?.content === "true";

  const BACKDOOR_CODE = "YUNDU-RESULT-2026";
  const adapters = new Map();
  let overlay;

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function isBackdoorCode(value) {
    return normalizeCode(value) === BACKDOOR_CODE;
  }

  function ensureStyles() {
    if (document.getElementById("yundu-backdoor-style")) return;
    const style = document.createElement("style");
    style.id = "yundu-backdoor-style";
    style.textContent = `
      .yundu-backdoor-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 20px; background: rgba(10, 12, 18, .72); }
      .yundu-backdoor-panel { width: min(560px, 100%); max-height: min(720px, 92vh); overflow: auto; padding: 24px; border: 1px solid rgba(255,255,255,.18); border-radius: 14px; color: #17202b; background: #fff; box-shadow: 0 24px 80px rgba(0,0,0,.32); }
      .yundu-backdoor-panel h2 { margin: 0 0 8px; font-size: 22px; }
      .yundu-backdoor-panel p { margin: 0 0 18px; color: #53606e; line-height: 1.6; }
      .yundu-backdoor-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
      .yundu-backdoor-list button { width: 100%; padding: 12px 14px; border: 1px solid #d6dde5; border-radius: 8px; color: #17202b; background: #f7f9fb; text-align: left; font: inherit; cursor: pointer; }
      .yundu-backdoor-list button:hover, .yundu-backdoor-list button:focus-visible { border-color: #3c70c9; background: #edf4ff; }
      .yundu-backdoor-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
      .yundu-backdoor-actions button { padding: 9px 14px; border: 1px solid #c4ccd6; border-radius: 8px; background: #fff; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  function close() {
    overlay?.remove();
    overlay = null;
  }

  function open(adapter) {
    ensureStyles();
    close();
    overlay = document.createElement("div");
    overlay.className = "yundu-backdoor-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const panel = document.createElement("div");
    panel.className = "yundu-backdoor-panel";
    const title = document.createElement("h2");
    title.textContent = "开发测试：选择结果";
    const note = document.createElement("p");
    note.textContent = "已使用通用开发测试码。此入口只用于验收页面与报告，不改变正式测试码。";
    const list = document.createElement("ul");
    list.className = "yundu-backdoor-list";
    const choices = adapter.getChoices();
    choices.forEach((choice) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        close();
        adapter.choose(choice.key);
      });
      item.appendChild(button);
      list.appendChild(item);
    });
    const actions = document.createElement("div");
    actions.className = "yundu-backdoor-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "取消";
    cancel.addEventListener("click", close);
    actions.appendChild(cancel);
    panel.append(title, note, list, actions);
    overlay.appendChild(panel);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  function register(productId, adapter) {
    if (!productId || !adapter || typeof adapter.getChoices !== "function" || typeof adapter.choose !== "function") return;
    adapters.set(productId, adapter);
  }

  function findAnswerSet({ questionCount, optionCount = 4, getResultKey, target, attempts = 6000 }) {
    if (!Number.isInteger(questionCount) || questionCount < 1 || typeof getResultKey !== "function") return null;
    let seed = 2166136261;
    const next = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
    const candidates = [0, 1, 2, 3].map((value) => Array.from({ length: questionCount }, () => value));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      candidates.push(Array.from({ length: questionCount }, () => Math.floor(next() * optionCount)));
    }
    return candidates.find((answers) => getResultKey(answers) === target) || null;
  }

  document.addEventListener("click", (event) => {
    if (!enabled) return;
    const button = event.target.closest?.("#start-btn");
    if (!button) return;
    const input = document.querySelector("#access-code");
    const productId = document.querySelector("meta[name='yundu-product-id']")?.content;
    const adapter = adapters.get(productId);
    if (!input || !adapter || !isBackdoorCode(input.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(adapter);
  }, true);

  root.YunduBackdoor = { BACKDOOR_CODE, normalizeCode, isBackdoorCode, register, findAnswerSet, close };
}(window, document));
