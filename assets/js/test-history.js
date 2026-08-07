(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.YunduHistory = api.YunduHistory;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const LOCAL_KEY = "yundu_test_history_v1";
  const PENDING_KEY = "yundu_test_history_pending_v1";
  const MAX_LOCAL_RECORDS = 5;
  const PRODUCT_IDS = new Set([
    "solo-business", "love-personality", "workplace-madness",
    "three-kingdoms-advisor", "historical-emperor",
    "historical-heroines", "cultivation-protagonist",
    "talent-career", "love-simulation", "seven-sins"
  ]);
  const PRODUCT_PATHS = Object.freeze({
    "solo-business": "/tests/solo-business/",
    "cultivation-protagonist": "/tests/cultivation-protagonist/",
    "love-personality": "/tests/love-personality/",
    "workplace-madness": "/tests/workplace-madness/",
    "three-kingdoms-advisor": "/tests/three-kingdoms-advisor/",
    "historical-emperor": "/tests/historical-emperor/",
    "historical-heroines": "/tests/historical-heroines/",
    "talent-career": "/tests/talent-career/",
    "love-simulation": "/tests/love-simulation/",
    "seven-sins": "/tests/seven-sins/"
  });

  function assertKeys(value, allowed, label) {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) throw new Error(label + "字段无效");
    }
  }

  function text(value, label) {
    if (typeof value !== "string") throw new Error(label + "必须是文本");
    return value;
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("测试快照无效");
    }
    assertKeys(snapshot, [
      "schemaVersion", "attemptId", "productId", "productTitle", "result",
      "tags", "overview", "dimensions", "sections", "disclaimer", "createdAt"
    ], "快照");
    if (snapshot.schemaVersion !== 1) {
      throw new Error("快照版本无效");
    }
    if (!PRODUCT_IDS.has(snapshot.productId)) {
      throw new Error("测试产品无效");
    }
    if (!snapshot.attemptId || typeof snapshot.attemptId !== "string" || snapshot.attemptId.length > 80) {
      throw new Error("测试记录无效");
    }
    if (!snapshot.productTitle || typeof snapshot.productTitle !== "string" || snapshot.productTitle.length > 80) {
      throw new Error("测试名称无效");
    }
    if (!snapshot.result || typeof snapshot.result !== "object") {
      throw new Error("测试结果无效");
    }
    assertKeys(snapshot.result, ["name", "subtitle", "quote", "icon", "image", "match"], "结果");
    if (!snapshot.result.name || typeof snapshot.result.name !== "string" || snapshot.result.name.length > 100) {
      throw new Error("测试结果无效");
    }
    for (const key of ["subtitle", "quote", "icon"]) text(snapshot.result[key] || "", "结果");
    if (snapshot.result.match !== undefined &&
      (typeof snapshot.result.match !== "number" || !Number.isFinite(snapshot.result.match) ||
        snapshot.result.match < 0 || snapshot.result.match > 100)) {
      throw new Error("结果匹配度无效");
    }
    if (snapshot.result.image &&
      (typeof snapshot.result.image !== "string" ||
        !snapshot.result.image.startsWith("/images/") ||
        snapshot.result.image.includes("..") ||
        snapshot.result.image.includes(":"))) {
      throw new Error("图片路径无效");
    }
    if (!Array.isArray(snapshot.tags) || !snapshot.tags.every((item) => typeof item === "string") ||
      !Array.isArray(snapshot.overview) || !Array.isArray(snapshot.dimensions) ||
      !Array.isArray(snapshot.sections)) {
      throw new Error("测试内容无效");
    }
    for (const item of snapshot.overview) {
      if (!item || typeof item !== "object") throw new Error("总览内容无效");
      assertKeys(item, ["label", "title", "body"], "总览");
      text(item.label || "", "总览"); text(item.title || "", "总览"); text(item.body || "", "总览");
    }
    for (const item of snapshot.dimensions) {
      if (!item || typeof item !== "object") throw new Error("维度内容无效");
      assertKeys(item, ["name", "value", "left", "right"], "维度");
      text(item.name || "", "维度"); text(item.left || "", "维度"); text(item.right || "", "维度");
      if (typeof item.value !== "number" || !Number.isFinite(item.value)) throw new Error("维度数值无效");
    }
    for (const item of snapshot.sections) {
      if (!item || typeof item !== "object") throw new Error("报告内容无效");
      assertKeys(item, ["title", "body", "items"], "报告");
      text(item.title || "", "报告"); text(item.body || "", "报告");
      if (!Array.isArray(item.items) || !item.items.every((entry) => typeof entry === "string")) {
        throw new Error("报告条目无效");
      }
    }
    if (typeof snapshot.disclaimer !== "string" ||
      !snapshot.createdAt || Number.isNaN(Date.parse(snapshot.createdAt))) {
      throw new Error("完成时间无效");
    }
    const normalized = {
      schemaVersion: 1,
      attemptId: snapshot.attemptId,
      productId: snapshot.productId,
      productTitle: snapshot.productTitle,
      result: {
        name: snapshot.result.name,
        subtitle: snapshot.result.subtitle || "",
        quote: snapshot.result.quote || "",
        icon: snapshot.result.icon || "",
        image: snapshot.result.image || "",
        ...(snapshot.result.match === undefined ? {} : { match: snapshot.result.match })
      },
      tags: [...snapshot.tags],
      overview: snapshot.overview.map((item) => ({ label: item.label || "", title: item.title || "", body: item.body || "" })),
      dimensions: snapshot.dimensions.map((item) => ({ name: item.name || "", value: item.value, left: item.left || "", right: item.right || "" })),
      sections: snapshot.sections.map((item) => ({ title: item.title || "", body: item.body || "", items: [...item.items] })),
      disclaimer: snapshot.disclaimer,
      createdAt: snapshot.createdAt
    };
    if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > 65536) {
      throw new Error("快照过大");
    }
    return normalized;
  }

  function createHistoryClient(options) {
    const storage = options && options.storage;
    const getMember = options && options.getMember || (function () {
      return root.YunduMember.getMember();
    });
    const request = options && options.request || defaultRequest;
    const loadRemote = options && options.loadRemote || defaultLoadRemote;

    function read(key) {
      if (!storage) return [];
      try {
        const value = JSON.parse(storage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    }

    function write(key, records) {
      if (!storage) throw new Error("本机存储不可用");
      storage.setItem(key, JSON.stringify(records));
    }

    function createId() {
      if (root.crypto && typeof root.crypto.randomUUID === "function") {
        return root.crypto.randomUUID();
      }
      return "history-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2);
    }

    function memberIdentity(member) {
      return member && (member.id || member.memberId || member.username) || null;
    }

    async function defaultRequest(snapshot) {
      if (typeof root.fetch !== "function") {
        throw new Error("会员服务不可用");
      }
      const response = await root.fetch("/api/member/results", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot })
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("会员服务返回异常");
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "会员服务暂不可用");
      }
      return result;
    }

    async function defaultLoadRemote(id) {
      if (typeof root.fetch !== "function") {
        throw new Error("会员服务不可用");
      }
      const response = await root.fetch(`/api/member/results/${encodeURIComponent(id)}`, {
        credentials: "same-origin"
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("会员服务返回异常");
      }
      if (!response.ok || !result.success || !result.record || !result.record.snapshot) {
        throw new Error(result.message || "会员记录暂时无法读取");
      }
      return result.record.snapshot;
    }

    async function saveResult(snapshot) {
      const normalized = validateSnapshot(snapshot);
      const member = await getMember().catch(() => ({ authenticated: false }));
      if (!member || !member.authenticated) {
        const records = read(LOCAL_KEY);
        const existing = records.find((record) => record.attemptId === normalized.attemptId);
        if (existing) return existing;
        const record = { ...normalized, id: createId() };
        records.push(record);
        records.sort((left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        try {
          write(LOCAL_KEY, records.slice(0, MAX_LOCAL_RECORDS));
        } catch {
          record.saveState = "unavailable";
        }
        return record;
      }
      const identity = memberIdentity(member);
      const pending = read(PENDING_KEY);
      const existing = pending.find((record) => record.attemptId === normalized.attemptId && record.memberIdentity === identity);
      if (existing) return existing;
      const record = { ...normalized, id: createId(), memberIdentity: identity };
      try {
        await request(normalized);
      } catch (error) {
        pending.push(record);
        try {
          write(PENDING_KEY, pending);
        } catch {
          record.saveState = "unavailable";
        }
      }
      return record;
    }

    function listLocal() {
      return read(LOCAL_KEY).sort((left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    function getLocal(id) {
      return listLocal().find((record) => record.id === id) || null;
    }

    function deleteLocal(id) {
      const records = read(LOCAL_KEY);
      const next = records.filter((record) => record.id !== id);
      if (next.length === records.length) return false;
      write(LOCAL_KEY, next);
      return true;
    }

    function listPending() {
      return read(PENDING_KEY);
    }

    async function syncPending() {
      const pending = read(PENDING_KEY);
      const member = await getMember().catch(() => null);
      const identity = memberIdentity(member);
      const retained = [];
      for (const record of pending) {
        if (!member || !member.authenticated || !identity || record.memberIdentity !== identity) {
          retained.push(record);
          continue;
        }
        try {
          await request(withoutId(record));
        } catch (error) {
          retained.push(record);
        }
      }
      try {
        write(PENDING_KEY, retained);
      } catch {
        return false;
      }
      return retained.length === 0;
    }

    function historyHref(member) {
      return member && member.authenticated ? "/member/#test-history" : "/history/";
    }

    async function loadHistoryResult(expectedProductId, search) {
      const query = search == null
        ? (root.location && root.location.search || "")
        : search;
      const params = new URLSearchParams(query);
      const id = params.get("history");
      if (!id) return null;
      if (!PRODUCT_PATHS[expectedProductId]) throw new Error("测试产品无效");
      const source = params.get("source");
      if (source !== "local" && source !== "member") throw new Error("记录来源无效");

      let snapshot;
      if (source === "local") {
        const record = getLocal(id);
        if (!record) throw new Error("测试记录不存在");
        snapshot = withoutId(record);
      } else {
        snapshot = await loadRemote(id);
        if (snapshot && snapshot.snapshot) snapshot = snapshot.snapshot;
      }

      const normalized = validateSnapshot(snapshot);
      if (normalized.productId !== expectedProductId) {
        throw new Error("测试记录不属于当前测试");
      }
      return {
        source,
        snapshot: normalized,
        returnHref: source === "member" ? "/member/#test-history" : "/history/"
      };
    }

    return {
      saveResult,
      listLocal,
      getLocal,
      deleteLocal,
      listPending,
      syncPending,
      historyHref,
      historyResultHref,
      loadHistoryResult
    };
  }

  function historyResultHref(record, source) {
    const path = PRODUCT_PATHS[record && record.productId];
    if (!path) throw new Error("测试产品无效");
    if (!record.id) throw new Error("测试记录无效");
    if (source !== "local" && source !== "member") throw new Error("记录来源无效");
    return `${path}?history=${encodeURIComponent(record.id)}&source=${source}`;
  }

  function withoutId(record) {
    const { id, memberIdentity, saveState, ...snapshot } = record;
    return snapshot;
  }

  let browserStorage = null;
  try {
    browserStorage = root.localStorage;
  } catch {
    browserStorage = null;
  }
  const YunduHistory = createHistoryClient({
    storage: browserStorage,
    getMember: function () { return root.YunduMember.getMember(); }
  });

  return { YunduHistory, createHistoryClient, validateSnapshot };
});
