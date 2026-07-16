# 云渡测评实验室：Cloudflare 部署与每日测试码操作手册

> 适用项目：`Evaluation-items`  
> 最后更新：2026-07-16  
> 当前方案：GitHub 托管代码 + Cloudflare 部署 + D1 保存每日通用测试码

---

## 1. 手册目标

这份手册用于完成并长期维护以下流程：

```text
GitHub 保存网站代码
        ↓
Cloudflare 自动部署网站
        ↓
自定义域名访问网站
        ↓
客户输入当天测试码
        ↓
Cloudflare Function 查询 D1
        ↓
验证通过后进入对应测试
```

网站上线稳定后，每天只需要做两件事：

1. 在 D1 中更新每款产品当天的通用测试码。
2. 在小红书对应商品的发货内容中更新测试码。

每日修改 D1 不需要重新部署网站。

---

## 2. 当前项目状态

### 已完成

- [x] 评估测试网站首页已经完成。
- [x] 三款测试已经放入网站：
  - `solo-business`：副业 / 一人公司赛道测试
  - `love-personality`：恋爱相处人格测试
  - `workplace-madness`：打工人发疯人格测试
- [x] 网站已经部署到 Cloudflare。
- [x] GitHub 用于保存和更新网站代码。
- [x] NameSilo 域名的 Nameserver 已修改为 Cloudflare 提供的地址。
- [x] Cloudflare 正式域名已经成功绑定。
- [x] D1 数据库和每日测试码表已经创建。
- [x] `/api/verify-code` Pages Function 已在本地项目中开发完成。
- [x] 三个测试页面已删除前端固定测试码并接入统一校验接口。

### 正在进行

- [x] Cloudflare 域名状态从 `Pending` 变成 `Active`。
- [x] 在 Cloudflare Pages 项目中绑定正式域名。
- [ ] 将 D1 以变量名 `DB` 绑定到网站项目。
- [ ] 将本次代码提交并推送到 GitHub。
- [ ] 等待 Cloudflare 自动完成新版本部署。

### 尚未完成

- [x] 确认当前 Cloudflare 项目类型是 Pages 还是 Worker。
- [x] 创建 D1 数据库。
- [x] 创建每日测试码数据表。
- [ ] 确认线上项目已经读取变量名为 `DB` 的 D1 Binding。
- [ ] 完成线上正确码、错误码和过期码测试。

重要：代码已经完成，但在推送 GitHub、Cloudflare 部署成功并完成 `DB` Binding 前，线上网站仍可能运行旧版本或提示“验证服务暂不可用”。

---

## 3. 第一阶段采用的测试码规则

### 最终规则

- 每款测试每天使用一个不同的通用测试码。
- 测试码按北京时间当天有效。
- 有效时间为当天 `00:00:00–23:59:59`。
- 第二天旧码不能再开始新的测试。
- D1 使用 UTC 运行，但接口必须按 `Asia/Shanghai` 计算日期。

三款产品不能共用一个通用码，否则购买其中一款的客户可能进入其他测试。

### 推荐测试码格式

测试码应该使用随机字符，例如：

```text
SB-7K3M-Q9TX
LP-4R8N-W2CF
WM-9D5P-X7KA
```

前缀含义：

- `SB`：solo-business
- `LP`：love-personality
- `WM`：workplace-madness

不要使用以下可预测测试码：

```text
SOLO-0716
LOVE-0716
WORK-0716
```

买家可以根据日期猜出下一天的测试码。

### 当前方案的限制

- 当天购买的所有客户共享同一个码。
- 客户可以把当天码转发给别人。
- 晚上购买的客户使用时间可能不足24小时。
- 第一阶段主要防止普通用户直接进入，不能抵抗懂前端代码的人绕过页面。
- 如果客户已经进入答题页面，跨过零点后仍可能继续完成当前测试；旧码只能保证第二天不能重新验证进入。

小红书商品说明建议写清楚：

> 测试码限发货当日使用，请收到后及时完成测试。

---

## 4. 等待域名激活

### 4.1 检查 NameSilo Nameserver

进入 NameSilo：

```text
Domain Manager
→ 选择域名
→ Change Nameservers
```

确认只保留 Cloudflare 分配的两个 Nameserver，例如：

```text
xxxx.ns.cloudflare.com
yyyy.ns.cloudflare.com
```

必须使用 Cloudflare 控制台给出的真实地址，不能照抄示例。

### 4.2 检查 Cloudflare 状态

进入 Cloudflare 中的域名页面，等待状态变成：

```text
Active
```

如果24小时后仍未激活，依次检查：

1. NameSilo 中是否完整填写了两个 Cloudflare Nameserver。
2. 是否仍保留旧 Nameserver。
3. 域名是否启用了旧服务商的 DNSSEC。
4. Cloudflare 中添加的是否为根域名，而不是完整网址。

### 4.3 绑定 Pages 自定义域名

域名激活后进入：

```text
Workers & Pages
→ 网站项目
→ Custom domains
→ Set up a custom domain
```

先添加根域名：

```text
example.com
```

再添加：

```text
www.example.com
```

推荐将 `www` 跳转到根域名，后续接口统一使用：

```text
https://example.com/api/verify-code
```

---

## 5. 确认 Cloudflare 项目类型

添加 D1 前必须先确认项目类型。

进入：

```text
Cloudflare
→ Workers & Pages
→ 当前网站项目
```

根据默认域名判断：

| 默认域名 | 项目类型 | 后续接口方式 |
|---|---|---|
| `项目名.pages.dev` | Cloudflare Pages | 使用 `functions/` Pages Functions |
| `项目名.workers.dev` | Cloudflare Worker | 使用 Worker 入口文件和 Worker Binding |

本手册后续代码默认项目是 `pages.dev` 类型。

如果当前项目是 `workers.dev`：

1. 不要直接照搬 `functions/` 目录方案。
2. 可以重新创建一个连接 GitHub 的 Pages 项目。
3. 或者将校验接口改成 Worker 路由。
4. 确认项目类型后再继续，避免 D1 已创建但代码无法读取。

---

## 6. 创建 D1 数据库

### 6.1 创建数据库

进入 Cloudflare：

```text
Storage & Databases
→ D1 SQL Database
→ Create database
```

数据库名称填写：

```text
yundu-evaluation
```

区域保持自动选择。

### 6.2 创建每日测试码表

进入数据库的 `Console`，执行：

```sql
CREATE TABLE daily_codes (
  product_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  valid_date TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

查询表是否创建成功：

```sql
SELECT * FROM daily_codes;
```

暂时没有数据属于正常情况。

### 6.3 写入首批测试码

将日期和测试码替换成当天实际值：

```sql
INSERT INTO daily_codes (product_id, code, valid_date, enabled)
VALUES
  ('solo-business', 'SB-7K3M-Q9TX', '2026-07-16', 1),
  ('love-personality', 'LP-4R8N-W2CF', '2026-07-16', 1),
  ('workplace-madness', 'WM-9D5P-X7KA', '2026-07-16', 1);
```

查询确认：

```sql
SELECT product_id, code, valid_date, enabled, updated_at
FROM daily_codes
ORDER BY product_id;
```

---

## 7. 将 D1 绑定到网站项目

### 7.1 Pages 项目

进入：

```text
Workers & Pages
→ 当前 Pages 项目
→ Settings
→ Bindings
→ Add
→ D1 database bindings
```

填写：

```text
Variable name：DB
D1 database：yundu-evaluation
```

如果页面区分 `Production` 和 `Preview`：

- Production 绑定正式 D1。
- Preview 也可以绑定同一个 D1，方便预览环境测试。
- 如果担心预览测试误改正式数据，后续再创建单独测试数据库。

### 7.2 Worker 项目

进入：

```text
Workers & Pages
→ 当前 Worker 项目
→ Settings
→ Bindings
→ Add binding
→ D1 Database
```

同样使用：

```text
Variable name：DB
D1 database：yundu-evaluation
```

### 7.3 数据库无法出现在下拉框

依次检查：

1. 网站项目和 D1 是否属于同一个 Cloudflare 账号。
2. 是否从 `Workers & Pages → 项目 → Settings` 进入，而不是从域名设置进入。
3. D1 数据库是否已经真正创建成功。
4. 当前是 Pages 项目还是 Worker 项目。
5. 项目是否由 `wrangler.toml` 或 `wrangler.jsonc` 管理绑定。
6. 当前登录账号是否有编辑项目和 D1 的权限。

---

## 8. 开发测试码校验接口（代码已完成，待线上部署）

本步骤需要修改 GitHub 项目代码。

### 8.1 Pages 项目目录结构

在网站项目根目录创建：

```text
functions/
└── api/
    └── verify-code.js
```

注意：只有 Pages Git 集成或 Wrangler 部署能够正常部署 `functions/` 目录。控制台 Drag and drop 部署不能编译 `functions/` 目录。

### 8.2 接口参考代码

`functions/api/verify-code.js`：

```javascript
function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost(context) {
  let body;

  try {
    body = await context.request.json();
  } catch {
    return json({ success: false, message: "请求格式不正确" }, 400);
  }

  const productId = String(body.productId || "").trim();
  const code = String(body.code || "").trim().toUpperCase();

  if (!productId || !code) {
    return json({ success: false, message: "请输入测试码" }, 400);
  }

  const record = await context.env.DB
    .prepare(`
      SELECT product_id, valid_date
      FROM daily_codes
      WHERE product_id = ?
        AND code = ?
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
}
```

这个接口只返回校验结果，不把数据库中的正确测试码返回给浏览器。

---

## 9. 改造三个测试页面（代码已完成，待线上部署）

当前三个测试页面都存在前端固定测试码：

```javascript
const ACCESS_CODE = "...";
```

必须删除固定码比较逻辑，改成请求 `/api/verify-code`。

### 9.1 通用验证函数

每个测试页面使用对应的 `productId`：

```javascript
async function verifyAccessCode(productId, code) {
  const response = await fetch("/api/verify-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productId, code })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "测试码验证失败");
  }
}
```

### 9.2 三个页面的产品标识

| 测试页面 | productId |
|---|---|
| 副业 / 一人公司赛道测试 | `solo-business` |
| 恋爱相处人格测试 | `love-personality` |
| 打工人发疯人格测试 | `workplace-madness` |

### 9.3 点击按钮时的处理

参考逻辑：

```javascript
$("start-btn").addEventListener("click", async () => {
  const button = $("start-btn");
  const code = $("access-code").value.trim().toUpperCase();

  button.disabled = true;
  button.textContent = "正在验证...";
  $("gate-error").textContent = "";

  try {
    await verifyAccessCode("solo-business", code);
    showScreen("persona-screen");
  } catch (error) {
    $("gate-error").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "验证并开始测试";
  }
});
```

另外两款测试替换对应的 `productId` 和按钮文字。

### 9.4 删除演示码

上线前删除页面中的：

- 演示测试码文案。
- 自动将正确码填入输入框的逻辑。
- `ACCESS_CODE` 常量。
- 任何能从前端直接获得正确码的代码和注释。

---

## 10. 通过 GitHub 部署接口和页面改造

### GitHub 集成项目

完成代码修改后：

```bash
git add .
git commit -m "feat: add daily access code verification"
git push
```

Cloudflare 会自动触发新的生产部署。

如果只修改了 D1 Binding、需要触发一次部署但没有代码变化，可以执行：

```bash
git commit --allow-empty -m "chore: refresh Cloudflare bindings"
git push
```

### 控制台找不到重新部署按钮

不需要依赖控制台按钮。GitHub 推送是最稳定的重新部署方式。

部署完成后检查：

```text
Workers & Pages
→ 项目
→ Deployments
→ 最新提交状态为 Success
```

---

## 11. 首次上线验收

正式对客户发货前，必须完整测试以下场景。

### 11.1 接口测试

正确码：

```bash
curl -X POST 'https://example.com/api/verify-code' \
  -H 'Content-Type: application/json' \
  -d '{"productId":"solo-business","code":"SB-7K3M-Q9TX"}'
```

预期：

```json
{"success":true}
```

错误码：

```bash
curl -X POST 'https://example.com/api/verify-code' \
  -H 'Content-Type: application/json' \
  -d '{"productId":"solo-business","code":"WRONG-CODE"}'
```

预期返回 HTTP `403`。

### 11.2 页面测试清单

- [ ] 三款测试的正确码均可进入。
- [ ] 错误码不能进入。
- [ ] A 产品测试码不能进入 B 产品。
- [ ] 修改 `valid_date` 为昨天后不能进入。
- [ ] 手机网络下可以正常请求接口。
- [ ] 页面没有继续显示演示码。
- [ ] 浏览器控制台没有接口报错。
- [ ] Cloudflare D1 Binding 名称确实为 `DB`。

---

## 12. 每日测试码更新 SOP

### 每日操作时间

建议每天上午开始营业前统一更新，完成 D1 后再修改小红书发货内容。

### 第一步：准备三个随机码

示例：

```text
solo-business      SB-7K3M-Q9TX
love-personality   LP-4R8N-W2CF
workplace-madness  WM-9D5P-X7KA
```

不要连续多天使用同一个码，也不要使用连续日期作为核心字符。

### 第二步：更新 D1

进入：

```text
Cloudflare
→ Storage & Databases
→ D1 SQL Database
→ yundu-evaluation
→ Console
```

执行以下 SQL，将日期和测试码替换成当天实际值：

```sql
INSERT INTO daily_codes (product_id, code, valid_date, enabled, updated_at)
VALUES
  ('solo-business', 'SB-7K3M-Q9TX', '2026-07-16', 1, CURRENT_TIMESTAMP),
  ('love-personality', 'LP-4R8N-W2CF', '2026-07-16', 1, CURRENT_TIMESTAMP),
  ('workplace-madness', 'WM-9D5P-X7KA', '2026-07-16', 1, CURRENT_TIMESTAMP)
ON CONFLICT(product_id) DO UPDATE SET
  code = excluded.code,
  valid_date = excluded.valid_date,
  enabled = excluded.enabled,
  updated_at = CURRENT_TIMESTAMP;
```

### 第三步：查询确认

```sql
SELECT product_id, code, valid_date, enabled
FROM daily_codes
ORDER BY product_id;
```

逐项核对：

- 日期是北京时间当天日期。
- 三个测试码没有填错产品。
- `enabled` 均为 `1`。

### 第四步：线上验证一款测试

随机选择一款，在正式域名输入当天码，确认能进入测试。

再输入一个错误码，确认不能进入。

### 第五步：更新小红书发货内容

每款商品只填写对应产品的测试码，例如：

```text
测试入口：https://example.com/tests/solo-business/
今日测试码：SB-7K3M-Q9TX
有效期：仅限发货当日，请及时完成测试。
```

### 每日完成清单

- [ ] 生成三款随机测试码。
- [ ] 更新 D1 日期和测试码。
- [ ] 查询 D1 确认无误。
- [ ] 正确码线上验证通过。
- [ ] 错误码验证失败。
- [ ] 更新三款小红书商品发货内容。
- [ ] 保存当天测试码记录，方便售后核对。

---

## 13. 临时停用某款测试

例如临时停用恋爱人格测试：

```sql
UPDATE daily_codes
SET enabled = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE product_id = 'love-personality';
```

恢复：

```sql
UPDATE daily_codes
SET enabled = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE product_id = 'love-personality';
```

停用 D1 测试码不会隐藏首页卡片。如果测试需要完全下架，还要同步修改首页卡片状态或链接。

---

## 14. 常见故障排查

### 正确测试码也提示无效

依次检查：

1. D1 的 `valid_date` 是否为北京时间当天。
2. 测试页发送的 `productId` 是否正确。
3. D1 Binding 名称是否为 `DB`。
4. 绑定 D1 后是否重新部署过项目。
5. 最新 GitHub 提交在 Cloudflare 是否部署成功。
6. 页面是否仍执行旧的固定码逻辑。

### 接口返回 404

说明 `/api/verify-code` 没有成功部署：

1. 确认项目是 Pages。
2. 确认 `functions/api/verify-code.js` 位于部署项目根目录。
3. 确认使用 GitHub 集成或 Wrangler 部署。
4. 如果是 Drag and drop 部署，改用 GitHub/Pages 或 `_worker.js`。

### 接口返回 500

通常是 D1 Binding 问题：

1. 检查变量名是否为 `DB`。
2. 检查数据库是否与项目属于同一账号。
3. 检查 `daily_codes` 表是否存在。
4. 查看 Cloudflare Function 日志中的具体错误。

### D1 下拉框无法选择数据库

1. 检查项目和 D1 是否在同一 Cloudflare账号。
2. 检查当前进入的是项目设置，不是域名设置。
3. 检查项目类型是 Pages 还是 Worker。
4. 检查账号权限。

### 更新 D1 后网站仍使用旧码

D1 更新是即时生效的，不需要部署。检查：

1. 是否更新了正确的数据库。
2. Production 是否绑定了该数据库。
3. 是否更新了对应 `product_id`。
4. 接口响应是否被缓存；响应必须包含 `Cache-Control: no-store`。

---

## 15. 新增测试产品流程

以后增加第4款、第5款测试时：

1. 在 `tests/` 下创建新测试目录。
2. 在首页添加新测试卡片。
3. 为产品确定唯一英文 `productId`。
4. 测试页面接入 `/api/verify-code`。
5. D1 新增该产品当天测试码。
6. 更新每日测试码 SQL 模板。
7. 在小红书创建对应商品和发货内容。
8. 验证该产品码不能进入其他产品。

新增产品 SQL 示例：

```sql
INSERT INTO daily_codes (product_id, code, valid_date, enabled)
VALUES ('new-product-id', 'NP-8X2M-K7QD', '2026-07-16', 1);
```

`productId` 一旦上线不要随意修改，否则旧页面和数据库记录会失去对应关系。

---

## 16. 后续升级路线

### 第二阶段：每个订单独立测试码

当销量增加、通用码分享问题明显后，升级为：

- 每笔订单生成独立随机码。
- 第一次使用时激活。
- 激活后24小时有效。
- 记录订单号、激活时间和过期时间。
- 支持补发、禁用和售后查询。

### 第三阶段：加强产品保护

将以下内容从静态 HTML 移入 Worker：

- 题目数据。
- 计分算法。
- 结果文案。
- 报告生成逻辑。

未验证用户将无法通过查看网页源代码获得完整测试内容。

### 第四阶段：自动发货

如果未来能接入订单通知或第三方发卡平台：

```text
客户付款
→ 自动生成测试码
→ 绑定订单与产品
→ 自动发送测试入口和测试码
```

---

## 17. 官方参考文档

- Cloudflare Pages 自定义域名：<https://developers.cloudflare.com/pages/configuration/custom-domains/>
- Cloudflare D1 入门：<https://developers.cloudflare.com/d1/get-started/>
- Pages Functions Binding：<https://developers.cloudflare.com/pages/functions/bindings/#d1-databases>
- Pages GitHub 集成：<https://developers.cloudflare.com/pages/configuration/git-integration/>
- Pages Direct Upload：<https://developers.cloudflare.com/pages/get-started/direct-upload/>

---

## 18. 当前下一步

按顺序执行，不要跳步：

1. 完成 D1 Binding，变量名必须为 `DB`。
2. 将本次接口和三个页面改造提交到 GitHub。
3. 等待 Cloudflare 部署成功。
4. 打开 `https://你的域名/api/verify-code`，确认 GET 返回“仅支持 POST 请求”，而不是404。
5. 完成正确码、错误码、跨产品码和过期码测试。
6. 正式开始每日更新 D1 + 小红书发货内容。
