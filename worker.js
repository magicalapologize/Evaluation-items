const PRODUCT_IDS = new Set([
  "solo-business",
  "love-personality",
  "workplace-madness",
  "three-kingdoms-advisor",
  "historical-emperor",
  "historical-heroines",
  "cultivation-protagonist"
]);

const PLAN_LABELS = {
  monthly: "月度会员",
  quarterly: "季度会员",
  annual: "年度会员",
  lifetime: "终身会员"
};

const SESSION_COOKIE = "yundu_member_session";
const SESSION_DAYS = 30;
const MAX_ACTIVE_SESSIONS = 2;
const MAX_LOGIN_FAILURES = 10;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function parseCookies(request) {
  const cookies = {};
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sessionCookie(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isMemberActive(member, now = new Date()) {
  if (!member || member.status !== "active") return false;
  if (!member.expires_at) return true;
  return new Date(member.expires_at).getTime() > now.getTime();
}

function serializeMember(member) {
  const active = isMemberActive(member);
  return {
    authenticated: true,
    active,
    tier: "super",
    tierLabel: "超级会员",
    planType: member.plan_type,
    planLabel: PLAN_LABELS[member.plan_type] || "超级会员",
    codeHint: member.code_hint,
    activatedAt: member.activated_at,
    expiresAt: member.expires_at,
    lifetime: !member.expires_at,
    status: active ? "active" : member.status === "active" ? "expired" : member.status
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function verifyCode(request, env) {
  if (request.method !== "POST") {
    return json({ success: false, message: "仅支持 POST 请求" }, 405);
  }

  const body = await readJson(request);
  if (!body) {
    return json({ success: false, message: "请求格式不正确" }, 400);
  }

  const productId = String(body.productId || "").trim();
  const code = normalizeCode(body.code);

  if (!PRODUCT_IDS.has(productId)) {
    return json({ success: false, message: "测试项目不存在" }, 400);
  }

  if (!code || code.length > 64) {
    return json({ success: false, message: "请输入有效的测试码" }, 400);
  }

  try {
    const record = await env.DB
      .prepare(`
        SELECT 1
        FROM daily_codes
        WHERE product_id = ?
          AND UPPER(code) = ?
          AND enabled = 1
        LIMIT 1
      `)
      .bind(productId, code)
      .first();

    if (!record) {
      return json({
        success: false,
        message: "测试码无效或已停用，请检查发货信息"
      }, 403);
    }

    return json({ success: true });
  } catch (error) {
    console.error("D1 verification failed", error);
    return json({ success: false, message: "验证服务暂不可用，请稍后再试" }, 503);
  }
}

async function getMemberFromRequest(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || token.length > 128) return null;

  const tokenHash = await sha256(token);
  const member = await env.DB
    .prepare(`
      SELECT m.id, m.code_hint, m.plan_type, m.status, m.activated_at, m.expires_at,
             s.id AS session_id
      FROM member_sessions s
      JOIN members m ON m.id = s.member_id
      WHERE s.token_hash = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > ?
      LIMIT 1
    `)
    .bind(tokenHash, new Date().toISOString())
    .first();

  if (!member) return null;

  await env.DB
    .prepare("UPDATE member_sessions SET last_seen_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), member.session_id)
    .run();

  return member;
}

async function createSession(env, memberId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const sessionId = crypto.randomUUID();
  const expiresAt = addDays(now, SESSION_DAYS).toISOString();

  await env.DB.batch([
    env.DB
      .prepare(`
        INSERT INTO member_sessions
          (id, member_id, token_hash, created_at, expires_at, last_seen_at, revoked_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `)
      .bind(sessionId, memberId, tokenHash, now.toISOString(), expiresAt, now.toISOString()),
    env.DB
      .prepare(`
        UPDATE member_sessions
        SET revoked_at = ?
        WHERE member_id = ?
          AND revoked_at IS NULL
          AND id NOT IN (
            SELECT id
            FROM member_sessions
            WHERE member_id = ? AND revoked_at IS NULL
            ORDER BY created_at DESC, id DESC
            LIMIT ?
          )
      `)
      .bind(now.toISOString(), memberId, memberId, MAX_ACTIVE_SESSIONS)
  ]);

  return token;
}

function getClientKey(request) {
  return (request.headers.get("CF-Connecting-IP") || "local").slice(0, 80);
}

async function isRateLimited(request, env) {
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      FROM member_auth_attempts
      WHERE client_key = ? AND success = 0 AND attempted_at >= ?
    `)
    .bind(getClientKey(request), since)
    .first();
  return Number(result?.count || 0) >= MAX_LOGIN_FAILURES;
}

async function recordAuthAttempt(request, env, success) {
  await env.DB
    .prepare(`
      INSERT INTO member_auth_attempts (client_key, success, attempted_at)
      VALUES (?, ?, ?)
    `)
    .bind(getClientKey(request), success ? 1 : 0, new Date().toISOString())
    .run();
}

async function memberLogin(request, env) {
  if (request.method !== "POST") return json({ success: false, message: "仅支持 POST 请求" }, 405);
  if (!isSameOrigin(request)) return json({ success: false, message: "请求来源不正确" }, 403);

  const body = await readJson(request);
  const code = normalizeCode(body?.code);
  if (!code || code.length < 16 || code.length > 64) {
    return json({ success: false, message: "请输入有效的会员激活码" }, 400);
  }

  try {
    if (await isRateLimited(request, env)) {
      return json({ success: false, message: "尝试次数过多，请15分钟后再试" }, 429);
    }

    const codeHash = await sha256(code);
    let member = await env.DB
      .prepare(`
        SELECT id, code_hint, plan_type, status, activated_at, expires_at
        FROM members
        WHERE login_code_hash = ?
        LIMIT 1
      `)
      .bind(codeHash)
      .first();

    if (!member) {
      const activation = await env.DB
        .prepare(`
          SELECT id, code_hint, plan_type, duration_days
          FROM member_activation_codes
          WHERE code_hash = ? AND status = 'unused'
          LIMIT 1
        `)
        .bind(codeHash)
        .first();

      if (!activation) {
        await recordAuthAttempt(request, env, false);
        return json({ success: false, message: "激活码无效、已使用或已被禁用" }, 403);
      }

      const now = new Date();
      const memberId = crypto.randomUUID();
      const expiresAt = activation.duration_days === null
        ? null
        : addDays(now, Number(activation.duration_days)).toISOString();

      try {
        const activationResults = await env.DB.batch([
          env.DB
            .prepare(`
              INSERT INTO members
                (id, login_code_hash, code_hint, plan_type, status, activated_at, expires_at, created_at, updated_at)
              SELECT ?, ?, ?, ?, 'active', ?, ?, ?, ?
              FROM member_activation_codes
              WHERE id = ? AND status = 'unused'
            `)
            .bind(memberId, codeHash, activation.code_hint, activation.plan_type, now.toISOString(), expiresAt, now.toISOString(), now.toISOString(), activation.id),
          env.DB
            .prepare(`
              UPDATE member_activation_codes
              SET status = 'redeemed', redeemed_by = ?, redeemed_at = ?
              WHERE id = ?
                AND status = 'unused'
                AND EXISTS (SELECT 1 FROM members WHERE id = ?)
            `)
            .bind(memberId, now.toISOString(), activation.id, memberId)
        ]);

        if (Number(activationResults[0]?.meta?.changes || 0) !== 1 || Number(activationResults[1]?.meta?.changes || 0) !== 1) {
          member = await env.DB
            .prepare(`
              SELECT id, code_hint, plan_type, status, activated_at, expires_at
              FROM members WHERE login_code_hash = ? LIMIT 1
            `)
            .bind(codeHash)
            .first();
          if (!member) {
            await recordAuthAttempt(request, env, false);
            return json({ success: false, message: "该激活码已被使用，请使用首次激活的会员码登录" }, 409);
          }
        }
      } catch (error) {
        member = await env.DB
          .prepare(`
            SELECT id, code_hint, plan_type, status, activated_at, expires_at
            FROM members WHERE login_code_hash = ? LIMIT 1
          `)
          .bind(codeHash)
          .first();
        if (!member) throw error;
      }

      if (!member) {
        member = {
          id: memberId,
          code_hint: activation.code_hint,
          plan_type: activation.plan_type,
          status: "active",
          activated_at: now.toISOString(),
          expires_at: expiresAt
        };
      }
    }

    if (member.status === "disabled") {
      await recordAuthAttempt(request, env, false);
      return json({ success: false, message: "该会员已被停用，请联系店铺客服" }, 403);
    }

    const token = await createSession(env, member.id);
    await recordAuthAttempt(request, env, true);
    return json({ success: true, member: serializeMember(member) }, 200, {
      "Set-Cookie": sessionCookie(token)
    });
  } catch (error) {
    console.error("Member login failed", error);
    return json({ success: false, message: "会员服务暂不可用，请稍后再试" }, 503);
  }
}

async function memberMe(request, env) {
  if (request.method !== "GET") return json({ success: false, message: "仅支持 GET 请求" }, 405);
  try {
    const member = await getMemberFromRequest(request, env);
    if (!member) {
      return json({ success: true, member: { authenticated: false, active: false } });
    }
    return json({ success: true, member: serializeMember(member) });
  } catch (error) {
    console.error("Member status failed", error);
    return json({ success: false, message: "会员状态暂时无法读取" }, 503);
  }
}

async function memberLogout(request, env) {
  if (request.method !== "POST") return json({ success: false, message: "仅支持 POST 请求" }, 405);
  if (!isSameOrigin(request)) return json({ success: false, message: "请求来源不正确" }, 403);

  try {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) {
      const tokenHash = await sha256(token);
      await env.DB
        .prepare("UPDATE member_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
        .bind(new Date().toISOString(), tokenHash)
        .run();
    }
    return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (error) {
    console.error("Member logout failed", error);
    return json({ success: false, message: "退出失败，请稍后再试" }, 503);
  }
}

async function memberRedeem(request, env) {
  if (request.method !== "POST") return json({ success: false, message: "仅支持 POST 请求" }, 405);
  if (!isSameOrigin(request)) return json({ success: false, message: "请求来源不正确" }, 403);

  const body = await readJson(request);
  const code = normalizeCode(body?.code);
  if (!code || code.length < 16 || code.length > 64) {
    return json({ success: false, message: "请输入有效的续费激活码" }, 400);
  }

  try {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: "请先登录会员" }, 401);
    if (member.status === "disabled") return json({ success: false, message: "该会员已被停用" }, 403);
    if (!member.expires_at) return json({ success: false, message: "终身会员无需续费" }, 400);

    const codeHash = await sha256(code);
    const activation = await env.DB
      .prepare(`
        SELECT id, plan_type, duration_days
        FROM member_activation_codes
        WHERE code_hash = ? AND status = 'unused'
        LIMIT 1
      `)
      .bind(codeHash)
      .first();

    if (!activation) return json({ success: false, message: "续费码无效、已使用或已被禁用" }, 403);

    const now = new Date();
    const currentExpiry = new Date(member.expires_at);
    const base = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
    const expiresAt = activation.duration_days === null
      ? null
      : addDays(base, Number(activation.duration_days)).toISOString();

    const redeemResults = await env.DB.batch([
      env.DB
        .prepare(`
          UPDATE member_activation_codes
          SET status = 'redeemed', redeemed_by = ?, redeemed_at = ?
          WHERE id = ? AND status = 'unused'
        `)
        .bind(member.id, now.toISOString(), activation.id),
      env.DB
        .prepare(`
          UPDATE members
          SET plan_type = ?, status = 'active', expires_at = ?, updated_at = ?
          WHERE id = ?
            AND EXISTS (
              SELECT 1
              FROM member_activation_codes
              WHERE id = ? AND redeemed_by = ? AND redeemed_at = ?
            )
        `)
        .bind(activation.plan_type, expiresAt, now.toISOString(), member.id, activation.id, member.id, now.toISOString())
    ]);

    if (Number(redeemResults[0]?.meta?.changes || 0) !== 1 || Number(redeemResults[1]?.meta?.changes || 0) !== 1) {
      return json({ success: false, message: "该续费码已被使用，请更换新的激活码" }, 409);
    }

    const updated = {
      ...member,
      plan_type: activation.plan_type,
      status: "active",
      expires_at: expiresAt
    };
    return json({ success: true, member: serializeMember(updated) });
  } catch (error) {
    console.error("Member redeem failed", error);
    return json({ success: false, message: "续费服务暂不可用，请稍后再试" }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify-code") return verifyCode(request, env);
    if (url.pathname === "/api/member/login") return memberLogin(request, env);
    if (url.pathname === "/api/member/me") return memberMe(request, env);
    if (url.pathname === "/api/member/logout") return memberLogout(request, env);
    if (url.pathname === "/api/member/redeem") return memberRedeem(request, env);

    return env.ASSETS.fetch(request);
  }
};
