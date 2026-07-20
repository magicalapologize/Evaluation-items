(function () {
  const listeners = new Set();
  let cachedMember = null;
  let pending = null;

  async function request(path, options) {
    let response;
    try {
      response = await fetch(path, {
        credentials: "same-origin",
        ...options
      });
    } catch {
      throw new Error("会员服务连接失败，请检查网络后重试");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("会员服务返回异常，请稍后再试");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "会员服务暂不可用");
    }
    return result;
  }

  function publish(member) {
    cachedMember = member;
    listeners.forEach((listener) => listener(member));
    document.dispatchEvent(new CustomEvent("yundu:member", { detail: member }));
    return member;
  }

  async function getMember(force) {
    if (!force && cachedMember) return cachedMember;
    if (!force && pending) return pending;

    pending = request("/api/member/me")
      .then((result) => publish(result.member))
      .finally(() => { pending = null; });
    return pending;
  }

  async function register(code, username, password) {
    const result = await request("/api/member/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, username, password })
    });
    return publish(result.member);
  }

  async function login(username, password) {
    const result = await request("/api/member/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    return publish(result.member);
  }

  async function redeem(code) {
    const result = await request("/api/member/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    return publish(result.member);
  }

  async function logout() {
    await request("/api/member/logout", { method: "POST" });
    return publish({ authenticated: false, active: false });
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (cachedMember) listener(cachedMember);
    return () => listeners.delete(listener);
  }

  function formatExpiry(member) {
    if (!member || !member.active) return "";
    if (member.lifetime) return "长期有效";
    const date = new Date(member.expiresAt);
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  window.YunduMember = {
    getMember,
    register,
    login,
    redeem,
    logout,
    subscribe,
    formatExpiry
  };
})();
