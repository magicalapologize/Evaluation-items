(function () {
  const section = document.getElementById("test-history");
  const list = document.getElementById("member-history-list");
  const message = document.getElementById("member-history-message");

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function appendText(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("zh-CN");
  }

  async function request(path, options) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || "测试记录暂时无法读取");
    return payload;
  }

  function render(records) {
    clear(list);
    if (!records.length) {
      appendText(list, "p", "member-history-empty", "还没有测试记录，完成一次测试后会自动保存在这里。");
      return;
    }
    records.forEach((record) => {
      const item = document.createElement("article");
      item.className = "member-history-item";
      const link = document.createElement("a");
      link.className = "member-history-link";
      link.href = YunduHistory.historyResultHref(record, "member");
      appendText(link, "p", "member-history-product", record.productTitle || record.productId);
      appendText(link, "h3", "member-history-result", record.resultName || "历史结果");
      appendText(link, "p", "member-history-date", formatDate(record.createdAt));
      item.append(link);
      const button = document.createElement("button");
      button.className = "member-history-delete";
      button.type = "button";
      button.textContent = "删除";
      button.addEventListener("click", () => deleteRecord(record.id));
      item.append(button);
      list.append(item);
    });
  }

  async function loadMemberRecords() {
    try {
      message.textContent = "";
      const payload = await request("/api/member/results");
      render(payload.records || []);
    } catch (error) {
      message.textContent = error.message;
    }
  }

  async function deleteRecord(id) {
    if (!window.confirm("确定删除这条测试记录吗？删除后无法恢复。")) return;
    try {
      await request(`/api/member/results/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadMemberRecords();
    } catch (error) {
      message.textContent = error.message;
    }
  }

  document.addEventListener("yundu:member", async (event) => {
    const member = event.detail;
    section.hidden = !member?.authenticated;
    if (!member?.authenticated) return;
    await YunduHistory.syncPending();
    await loadMemberRecords();
  });
})();
