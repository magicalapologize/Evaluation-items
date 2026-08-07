(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.YunduHistoryReplay = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  function sectionMap(snapshot) {
    return new Map((snapshot.sections || []).map((section) => [section.title, section]));
  }

  function dimensionTuples(snapshot) {
    return (snapshot.dimensions || []).map(({ name, value, left, right }) => [name, value, left, right]);
  }

  function clear(element) {
    if (!element) return;
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function appendText(parent, tag, className, value) {
    const element = root.document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value == null ? "" : String(value);
    parent.append(element);
    return element;
  }

  function renderTags(container, tags) {
    clear(container);
    (tags || []).forEach((tag) => appendText(container, "span", "chip", tag));
  }

  function renderDimensions(container, dimensions) {
    clear(container);
    dimensionTuples({ dimensions }).forEach(([name, value, left, right]) => {
      const item = root.document.createElement("div");
      const head = root.document.createElement("div");
      head.className = "dimension-head";
      appendText(head, "span", "", name);
      appendText(head, "span", "", `${value}% 偏向${value >= 50 ? right : left}`);
      item.append(head);
      const track = root.document.createElement("div");
      track.className = "dimension-track";
      const fill = root.document.createElement("div");
      fill.className = "dimension-fill";
      fill.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
      track.append(fill);
      item.append(track);
      const caption = root.document.createElement("div");
      caption.className = "dimension-caption";
      appendText(caption, "span", "", left);
      appendText(caption, "span", "", right);
      item.append(caption);
      container.append(item);
    });
  }

  function renderItems(container, items, className) {
    clear(container);
    (items || []).forEach((item) => appendText(container, "div", className || "advice-item", item));
  }

  function renderOverview(container, overview) {
    clear(container);
    (overview || []).forEach((item) => {
      const card = root.document.createElement("div");
      card.className = "mini-card";
      appendText(card, "span", "", item.label);
      appendText(card, "strong", "", item.title);
      appendText(card, "p", "", item.body);
      container.append(card);
    });
  }

  function hideUnavailableControls() {
    ["restart-btn", "cashback-btn"].forEach((id) => {
      const button = root.document.getElementById(id);
      if (button) button.hidden = true;
    });
  }

  async function init(expectedProductId, render, showResult) {
    try {
      const loaded = await root.YunduHistory.loadHistoryResult(expectedProductId);
      if (!loaded) return false;
      render(loaded.snapshot, loaded);
      root.document.documentElement.classList.add("history-result-mode");
      hideUnavailableControls();
      const link = root.document.querySelector("[data-history-link]");
      if (link) {
        link.href = loaded.returnHref;
        link.textContent = "返回测试记录";
      }
      showResult();
      return true;
    } catch (error) {
      if (root.console && typeof root.console.error === "function") root.console.error("历史结果回放失败", error);
      const query = new URLSearchParams(root.location && root.location.search || "");
      const member = query.get("source") === "member";
      root.location.replace(member ? "/history/?member=&error=missing" : "/history/?error=missing");
      return false;
    }
  }

  return { sectionMap, dimensionTuples, renderTags, renderDimensions, renderItems, renderOverview, init };
});
