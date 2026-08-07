(function () {
  const list = document.getElementById("history-list");
  const message = document.getElementById("history-message");
  const note = document.getElementById("history-note");
  const params = new URLSearchParams(window.location.search);
  const memberMode = params.has("member");

  function appendText(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text == null ? "" : String(text);
    parent.append(element);
    return element;
  }

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "完成时间未知" : date.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    });
  }

  function renderList(records) {
    clear(list);
    if (!records.length) {
      appendText(list, "p", "history-empty", memberMode
        ? "还没有会员测试记录，先去完成一次测试吧。"
        : "当前设备还没有测试记录。完成测试后，最近 5 条记录会显示在这里。");
      return;
    }
    records.forEach((record) => {
      const item = document.createElement("article");
      item.className = "history-record";
      const link = document.createElement("a");
      link.className = "history-record-link";
      link.href = YunduHistory.historyResultHref(record, memberMode ? "member" : "local");
      appendText(link, "p", "history-record-product", record.productTitle || record.productId || "测试报告");
      appendText(link, "h2", "history-record-result", record.resultName || record.result?.name || "历史结果");
      appendText(link, "p", "history-record-date", formatDate(record.createdAt));
      item.append(link);
      const deleteButton = document.createElement("button");
      deleteButton.className = "history-delete";
      deleteButton.type = "button";
      deleteButton.textContent = "删除";
      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        deleteRecord(record.id);
      });
      item.append(deleteButton);
      list.append(item);
    });
  }

  async function requestJson(path, options) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    if (!(response.headers.get("content-type") || "").includes("application/json")) {
      throw new Error("测试记录服务响应异常，请确认网站后端已完成更新");
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("测试记录服务响应异常，请稍后再试");
    }
    if (!response.ok || !payload.success) throw new Error(payload.message || "会员记录暂时无法读取");
    return payload;
  }

  async function deleteRecord(id) {
    if (!window.confirm("确定删除这条测试记录吗？删除后无法恢复。")) return;
    try {
      if (memberMode) {
        await requestJson(`/api/member/results/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadRecords();
      } else if (YunduHistory.deleteLocal(id)) {
        renderList(YunduHistory.listLocal());
      }
    } catch (error) {
      message.textContent = error.message;
    }
  }

  async function loadRecords() {
    message.textContent = "";
    if (memberMode) {
      note.textContent = "会员记录保存在云端，登录同一会员账号即可查看。";
      await YunduHistory.syncPending();
      const payload = await requestJson("/api/member/results");
      renderList(payload.records || []);
      return;
    }
    renderList(YunduHistory.listLocal());
  }

  async function init() {
    try {
      await loadRecords();
      if (params.get("error") === "missing") {
        message.textContent = "这条记录不存在、已被删除或暂时无法读取。";
      }
    } catch (error) {
      clear(list);
      message.textContent = error.message;
    }
  }

  init();
})();
