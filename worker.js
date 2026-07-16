const PRODUCT_IDS = new Set([
  "solo-business",
  "love-personality",
  "workplace-madness"
]);

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

async function verifyCode(request, env) {
  if (request.method !== "POST") {
    return json({ success: false, message: "仅支持 POST 请求" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: "请求格式不正确" }, 400);
  }

  const productId = String(body.productId || "").trim();
  const code = String(body.code || "").trim().toUpperCase();

  if (!PRODUCT_IDS.has(productId)) {
    return json({ success: false, message: "测试项目不存在" }, 400);
  }

  if (!code || code.length > 64) {
    return json({ success: false, message: "请输入有效的测试码" }, 400);
  }

  try {
    const record = await env.DB
      .prepare(`
        SELECT valid_date
        FROM daily_codes
        WHERE product_id = ?
          AND UPPER(code) = ?
          AND enabled = 1
        LIMIT 1
      `)
      .bind(productId, code)
      .first();

    if (!record || record.valid_date !== getShanghaiDate()) {
      return json({
        success: false,
        message: "测试码无效或已过期，请检查发货信息"
      }, 403);
    }

    return json({ success: true });
  } catch (error) {
    console.error("D1 verification failed", error);
    return json({ success: false, message: "验证服务暂不可用，请稍后再试" }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify-code") {
      return verifyCode(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
