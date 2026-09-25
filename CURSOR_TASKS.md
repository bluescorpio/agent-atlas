# Agent Atlas — Phase 2 · Cursor 执行任务书（Set & Earn）

> **用途**：把本文件整份交给 Cursor（建议存为仓库根目录 `CURSOR_TASKS.md`，然后让 Cursor 逐条执行）。 **仓库**：github.com/bluescorpio/agent-atlas **Deadline**：2026-09-27 12:00 UTC（北京 20:00） **本轮目标**：在 deadline 前满足 BNB Chain Phase 2「Set and Earn」全部**技术**要求，并产出可提交的 tracking details。

---

## 0. 直接粘贴给 Cursor 的开场指令

```plaintext
你是本仓库（agent-atlas，Next.js 15 + TypeScript + viem/wagmi）的资深工程师。
请先完整阅读 CURSOR_TASKS.md 全文，再严格按「任务 0 → 任务 6」的顺序执行；
每完成一个任务，运行该任务的「验收」，把命令与输出贴回，然后 git commit。

不可违反的硬性约束：
1. 只上真实链上数据：禁止 mock、禁止硬编码 agent 列表、禁止 seeded demo 记录。
2. 不猜测 ABI 或事件签名；一切以「第 2 节 · 已确认链上事实」为准。
3. 不把任何 secret / 私钥 / AWS 凭证写入代码或 Git；一律走环境变量。
4. 严格区分 FUNDED 与 SUBMITTED，不得把未完成的事写成已完成。
5. 站点在数据 stale 或 agent 无响应时必须明示，不得隐藏。
6. 遇到本文件未覆盖的不确定项，先列出来问我，不要自行编造 ABI / 地址 / 交易哈希。
```

---

## 1. 铁律（执行前必读）

- **真实优先**：agent 必须从 ERC-8004 Identity Registry（chain 56 / 97）真实读取；页面展示所读合约地址、每个 agent 的 registry ID、tx hash、freshness.

- **不猜**：ABI、事件签名、合约地址一律用第 2 节已核对值；不凭记忆写。

- **不泄密**：私钥、Cognito secret、AWS 凭证只进环境变量（Vercel / `.env.local`），永不进 Git。

- **不夸大**：job `963` = `SUBMITTED`;jobs `1115` / `1120` / `1121` = `FUNDED`（deliverable 因 Pieverse `auto/free` 429 未生成）。材料里继续保持这个区分。

- **每个任务独立 commit**,commit message 说清改了什么。

---

## 2. 已确认链上事实（BSC Testnet, chain_id 97）— 直接用，不要再猜

### 2.1 合约地址

| 用途 | 地址 |
| --- | --- |
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ERC-8183 Commerce | `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de` |
| ERC-8183 Router | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| ERC-8183 Policy | `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea` |
| 支付代币 $U | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` |

**BSC Mainnet 备用地址**（迁移时用）：Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`、Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`。

### 2.2 ABI 来源（不要凭记忆写 ABI）

- ERC-8004 官方 ABI:`github.com/erc-8004/erc-8004-contracts` 的 `abis/IdentityRegistry.json`、`abis/ReputationRegistry.json`。 Identity 需含：`register`、`setAgentURI`、`ownerOf`、`tokenURI`、`getAgentWallet`、`getMetadata`、`getVersion`。

- ERC-8183：已在用 `@bnbagent/sdk/erc8183` 的 `ERC8183Client`，其内部自带 ABI；**从 SDK 取，别重写**。

- 待填文件：`lib/chain/abi/erc8004.ts` 现在是空数组 `[]`，必须填入上面的官方 ABI。

### 2.3 枚举方式（关键）

- **优先用 **<strong>`Registered`</strong>** 事件日志（**<strong>`getLogs`</strong>**）枚举 agentId**——这是最稳的方式。

- **不要假设合约实现了 ERC-721 Enumerable**；`totalSupply() / tokenByIndex(i)` 只有确认合约支持时才用。先看 ABI 有没有这两个函数，没有就走事件日志。

### 2.4 事件签名（tracking 用，已核对）

**ERC-8004 Identity**

```plaintext
Registered(uint256 indexed agentId, string agentURI, address indexed owner)
Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
```

**ERC-8004 Reputation**

```plaintext
NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)
```

**ERC-8183 Commerce**

```plaintext
JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)
JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)
JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)
JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason)
PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount)
```

**状态机**：`Open(0) → Funded(1) → Submitted(2) → Completed(3) / Rejected(4) / Expired(5)`

---

## 3. 当前仓库真实状态（2026-09-25 已核对，勿被旧缓存误导）

### 3.1 数据与代码

- `lib/registry.json`：**4 live + 7 demo**.live 的 ERC-8004 ID 与钱包：

| Manifest ID | Category | ERC-8004 ID | Seller wallet | AgentCore runtime |
| --- | --- | --- | --- | --- |
| `grid-bnb-usdt` | grid_trading | `2066` | `0x3573e861363880f18F357Ca8258FA1393573d676` | `gridbnbusdt-bohsdVE5Pv` |
| `rebalancing-pcs-v3` | rebalancing | `2207` | `0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32` | `rebalancingpcsv3-P5Q200A9kZ` |
| `hf-guard-venus` | health_factor | `2208` | `0xaaBd845B763761af98eE516a2a08829AEf548Cf3` | `hfguardvenus-sG614z4iLZ` |
| `yield-stable-router` | yield | `2209` | `0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE` | `yieldstablerouter-FscO4qDKDv` |

Buyer / operator 钱包：`0x81122d2Ea08B5c61b899949fc9b9C3735C972414`。价格 `0.10 U / task`。

- `lib/chain/erc8004.ts`：**仍是 mock / fail-closed**。live 模式下 `getAgentIdentity` / `getAgentReputation` / `getRegisteredAgentCount` 直接 `throw ...NOT_IMPLEMENTED_UNTIL_OFFICIAL_ABI_IS_CONFIRMED`；`listAgentsByIds` live 分支仍是过滤本地 mock 列表（`a.source === 'live'`）。**链上读取尚未实现。**

- `lib/chain/abi/erc8004.ts`：`identityRegistryAbi = []`、`reputationRegistryAbi = []`（空）。

- README：**没有线上 live URL**（只有 `http://127.0.0.1:3000`）。

- 线上 `agent-atlas-eight.vercel.app`：4 live + 7 demo;`/api/activate` 曾返回 `A2A_AUTH_REQUIRED: 401 Claim 'iss' value mismatch with configuration.`

- ERC-8183 hire:job `963`（grid）`SUBMITTED` 有 deliverable;jobs `1115` / `1120` / `1121` `FUNDED`,deliverable 因 Pieverse `auto/free` 429 未生成。

### 3.2 关键文件地图（Cursor 直接定位）

```plaintext
app/
  page.tsx                       # 首页
  layout.tsx  globals.css
  a/[agentId]/page.tsx           # agent 详情页
  c/[category]/page.tsx          # 分类页
  compare/page.tsx               # 对比页
  me/page.tsx                    # 我的 agent
  api/activate/route.ts          # hire 入口（server）
components/
  ActivateAgent.tsx  ConnectButton.tsx  Providers.tsx
lib/
  chain/
    erc8004.ts                   # ← 任务 1 主战场（现为 mock/fail-closed）
    abi/erc8004.ts               # ← 现为空数组，需填官方 ABI
    mock.ts                      # ← 硬编码指标，需清理
    addresses.ts  cache.ts  client.ts
    studio/status.ts  wallet/config.ts
  erc8183/
    a2a.ts  agentcore-oauth.ts   # ← 任务 3 认证排查
    negotiate.ts  notify.ts  poll.ts  resume.ts  task.ts  envelope.ts  constants.ts
    activate.ts  *.test.ts
  x402/activate.ts
  registry.json                  # ← 4 live + 7 demo
  types.ts
agents/                          # 每个 seller 一个目录
  grid-bnb-usdt/  rebalancing-pcs-v3/  hf-guard-venus/  yield-stable-router/
    agentcore/{agentcore.json, aws-targets.json}
    app/agent/src/{agentCard.ts, executor.ts, model.ts, requestLimits.ts, sellerCore.ts}
report/agent-advantage/task-1-grid-trading/raw/
scripts/
docs/screenshots/
```

---

## 4. 任务清单（按执行顺序）

> 建议顺序：**任务 0（DNS 有生效延迟，先起）→ 任务 1 → 任务 3 → 任务 6 → 任务 2（最耗时，可并行）→ 任务 4 → 任务 5**。 每个任务完成后 commit，并跑「验收」。

---

### 任务 0 · 自有域名 `agent-atlas.xyz`（✅ 已购买并上线，只剩 README URL）

**为什么**：官方明确写 “Platform subdomains \(vercel.app, pages.dev, ……\) aren‘t sufficient”,URL 必须是自己的。

**步骤**

1. ✅ **域名已购买**：`agent-atlas.xyz`（用户已完成，无需再注册）。确认可登录域名 DNS 管理后台，直接进入下一步。

2. Vercel → 项目 `agent-atlas` → Settings → Domains → Add，填入 `agent-atlas.xyz` 与 `www.agent-atlas.xyz`。

3. DNS 二选一：

   - **A 记录**：`@` → `76.76.21.21`；`www` → CNAME `cname.vercel-dns.com`

   - **或** nameserver 改为 `ns1.vercel-dns.com` / `ns2.vercel-dns.com`

4. 等 SSL 自动签发，确认 `https://agent-atlas.xyz` 与 `https://www.agent-atlas.xyz` 都能打开。

5. 保留旧 `agent-atlas-eight.vercel.app`（重定向到新域名，别断）。

6. **README 顶部加 Live URL**（当前完全没有，属违规项）。

**验收**：`curl -I https://agent-atlas.xyz` 返回 200，且不是 `*.vercel.app`。

---

### 任务 1 · 链上读取层（ERC-8004, chain 97）——**核心，最大工作量**

**现状**：`lib/chain/erc8004.ts` live 模式抛 `NOT_IMPLEMENTED`；`lib/chain/abi/erc8004.ts` 是空数组；全站数据来自 `lib/registry.json` + `lib/chain/mock.ts` 写死的指标。违反 “No mock data, no hardcoded agent lists, no seeded demo records”。

**1.1 取得真实 ABI**

- 从 `github.com/erc-8004/erc-8004-contracts` 的 `abis/IdentityRegistry.json` / `abis/ReputationRegistry.json` 取 ABI，填入 `lib/chain/abi/erc8004.ts`（identity + reputation 两个常量）。**不要凭记忆写。**

**1.2 实现枚举（ERC-8004 = ERC-721,agentId = tokenId）**

- 首选 `Registered` 事件 `getLogs` 枚举 agentId;`tokenURI(agentId)` = `agentURI`（指向链下注册 JSON）；`ownerOf(agentId)` = owner;`getAgentWallet(agentId)`。

- 实现并替换 mock 分支：

  - `listAgentsByIds()`：真实读链，不再走 mock。

  - `getAgentIdentity(agentId)`：`ownerOf` + `tokenURI` + `getAgentWallet` → 拉注册文件 JSON（name / description / services / capabilities / category）。

  - `getAgentReputation(agentId)`：读 Reputation Registry（可后置，P1）。

  - `getRegisteredAgentCount()`：读真实总数（`totalSupply()` 或事件计数），**删除硬编码 200000**。

**1.3 分类**（requirement 4：必须有分类，大量 Unclassified 会扣分）

- 自建 agent 的注册文件写 `category`（`grid_trading` / `rebalancing` / `yield` / `health_factor`）与 `protocols`。

- 第三方 agent：优先读注册文件里的分类 / tag；读不到标 `Unclassified`，并**统计并展示**该比例。

**1.4 证据与 freshness**（requirement 3） 每个 agent 卡片 / 详情页展示：所读 **registry 合约地址** + `chain_id`；`agent_id`、owner、agent wallet；**注册 tx hash**（取自 `Registered` 事件）；**last-updated / freshness**。数据 stale 或 agent 无响应时**在页面明示**（“data stale” / “agent not responding”）。

**1.5 删除 mock**

- 删除 `lib/registry.json` 中所有 `source: "demo"` 条目（7 个）。

- 清理 `lib/chain/mock.ts` 里写死的指标值，改为真实来源或明确标注“来源不可得”。

- 站点“200,000+ / Demo data”等宣传位同步改成真实数字。

**1.6 环境变量**（`.env.example` 已含变量名，填值即可）

```plaintext
ERC8004_IDENTITY_REGISTRY=0x8004A818BFB912233c491871b3d84c89A494BD9e
ERC8004_REPUTATION_REGISTRY=0x8004B663056A597Dffe9eCcC1965A193B7388713
BSC_TESTNET_RPC_URL=<你的 testnet RPC>
MOCK_DATA=false
NEXT_PUBLIC_CHAIN_ID=97
```

**验收**：把 `MOCK_DATA=false` 后，站点仍能从链上列出 agent；页面可见合约地址 + 每个 agent 的 registry ID + tx + freshness；`grep -r "source.*demo" lib/` 无结果。

---

### 任务 2 · Agent 覆盖：每类 ≥ 3（共 ≥ 12 个真实 agent）

**现状**：每类仅 1 个 live，共 4 个。需**至少再补 8 个真实 agent**（每类 +2）。

每个新 agent 必须：**独立钱包 + 独立 AgentCore runtime + 独立 ERC-8004 注册**（注册文件带 `category`）。

**命名建议**

| 类别 | 现有 | 新增 1 | 新增 2 |
| --- | --- | --- | --- |
| grid_trading | `grid-bnb-usdt` | `grid-eth-usdt` | `grid-cake-bnb` |
| rebalancing | `rebalancing-pcs-v3` | `rebalancing-pcs-v3-eth` | `rebalancing-thena` |
| yield | `yield-stable-router` | `yield-venus-usdt` | `yield-lista-usdt` |
| health_factor | `hf-guard-venus` | `hf-guard-lista` | `hf-guard-venus-usdc` |

**每个新 agent 的 runbook**（以 Phase 1 踩过的坑为准）

1. **复制样板**：`cp -r agents/grid-bnb-usdt agents/<new>`，改 slug / name / `app/agent/src/` 里的能力与 limits。

2. **清残留**（rebalancing 曾踩坑）：`agents/<new>/agentcore/agentcore.json`、`studio.toml`、`.env*` 里不能残留任何旧 runtime ARN、旧 wallet、旧 identity、旧 trial slug.

3. **新钱包**：为每个 agent 生成全新 seller 钱包，写入 `platform_exposed_addresses`，**不复用**。

4. **部署**：`bag deploy --provider aws --yes --allow-multiple`，记录新 runtime ARN.

5. **ERC-8004 注册**：`bag erc8004 register`（gasless 时 `tx=null` 属正常），用 `bag erc8004 show` 确认身份存在，记 `agent_id`。

6. **注册文件**：agentURI 指向 JSON，写 `category` / `services`（A2A endpoint）/ `protocols`。

7. **A2A / Cognito**：为每个 runtime 记 client_id，并在 Vercel 配对应 secret（不进 Git，见任务 3）。

8. **不要写进硬编码列表**：这些 agent 必须由任务 1 的链上读取层从 ERC-8004 枚举出来。

> 策略：先把**每类第 2 个**跑通（4 个），再补第 3 个；至少保证每类 ≥1 个可端到端 hire。

**验收**：链上按 `category` 查询每类 ≥ 3；详情页信息足够决策（做什么 / 怎么调用 / 权限 / track record）。

---

### 任务 3 · 修复端到端 hire（线上 400）

**现状**：线上 `/api/activate` 返回 `A2A_AUTH_REQUIRED: 401 Claim 'iss' value mismatch with configuration.`

**排查清单**

1. 检查 `lib/erc8183/agentcore-oauth.ts` 与 `lib/erc8183/a2a.ts` 取 A2A Bearer token 的逻辑，确认用的是与 AgentCore authorizer **同一个 Cognito user pool / domain**：

   - Token endpoint:`https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token`

   - 期望 issuer（`iss`）：`https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu`

   - Scope:`bnbagent-seller/invoke`

2. 按 agent 选择对应 Cognito client（client id 已固定在 `lib/erc8183/agentcore-oauth.ts`）。

3. Vercel 配置各 runtime 的 client secret（**不进 Git**）：

   ```plaintext
   GRID_A2A_CLIENT_SECRET=
   REBALANCING_A2A_CLIENT_SECRET=
   HF_A2A_CLIENT_SECRET=
   YIELD_A2A_CLIENT_SECRET=
   ```

   注意：**不要**设 `AGENT_CLIENT_SECRET`（那是 bnbagent-api 的，AgentCore 会拒绝它的 iss）。

4. 缺失 secret 时返回明确配置错误，不要用假 token。

5. 重新部署后，用线上同源 fetch 复测，直到返回 `SUBMITTED` + `deliverableUrl`。

**验收**：从线上站连接钱包 → 激活 → 真实返回 `job_id` / `SUBMITTED` / `deliverable_url`。

---

### 任务 4 · Scoped 权限 / spend cap / revoke

- hire 时**只 approve 精确金额**（`approveFloor = rawBudget`），**禁止 blanket approval**。

- **spend cap**（激活时设定的资金上限）必须真实生效，不能只写在文案里。

- 提供 **revoke 路径**且可用（用户可撤销授权 / 终止）。

**验收**：链上可见精确额度的 approve；超上限被拒；revoke 能执行。

---

### 任务 5 · README + 站点合规展示

- README 顶部加 **Live URL**（`https://agent-atlas.xyz`）；删掉与线上矛盾/过时的表述。

- 站点明确展示：**网络（BSC Testnet / chain 97）**、**所读合约地址**、每个 agent 的 registry ID / tx / freshness.

- 删除 demo 条目后，同步清理引导文案（如 “Hire …… Grid or Venus Guardian”）。

- 更新 Roadmap 勾选状态与截图（`docs/screenshots/`）。

**验收**：README 首屏可见 live URL；站点首屏可见网络 + 合约地址。

---

### 任务 6 · Tracking API（供主办方验证）

实现并给出真实路径 + 示例响应：

```plaintext
GET /api/agents                       # 从 ERC-8004 读取的 agent 列表
GET /api/hires?wallet=0x...           # 某钱包的 hire 记录（链上无法直接聚合的部分）
GET /api/agents/by-owner?owner=0x...  # 某 owner 名下的 agent
```

**验收**：三个端点线上可访问且返回真实数据（非 mock）。

---

## 5. 交付物（交给主办方的 tracking details）

完成后按下表整理并提交（对应英文提交文档已就绪，只需补最后的实际值）：

| 项 | 内容 |
| --- | --- |
| Contract addresses | 第 2.1 节地址（BSC testnet 97） |
| Hire / Deposit / Completion / Rating 事件及签名 | 第 2.4 节 |
| agent ID / owner wallet 记录方式 | ERC-8004 `Registered(agentId, agentURI, owner)` + `ownerOf` / `getAgentWallet` |
| 非链上信息 API endpoint | 任务 6 的三个端点（填真实路径 + 示例响应） |
| 团队钱包地址 | 4 个 seller 钱包 + buyer 钱包 + **团队主钱包（待补）** |
| Live URL | `https://agent-atlas.xyz` |
| Socials | X / Telegram（待补） |
| Brand kit | Logo 源文件（待补） |

> 仍需人工补齐：X、Telegram、团队主钱包、logo/brand kit。Cursor 不负责这些，但**不要**在代码/文档里编造。

---

## 6. 验收清单（提交前逐条自查）

- [ ] 自有域名可访问，非 `vercel.app`

- [ ] 无需登录可浏览

- [ ] 网络明确标注（BSC Testnet / chain 97）

- [ ] agent 全部来自 ERC-8004 链上读取（无 mock / 无硬编码 / 无 demo）

- [ ] 页面展示所读合约地址

- [ ] 每 agent 有 registry ID + tx hash + freshness

- [ ] stale / 无响应在页面明示

- [ ] 四类齐全，**每类 ≥ 3**，分类完整

- [ ] 端到端 hire 可用

- [ ] hire 命名具体 agent

- [ ] 精确 approve（无 blanket）

- [ ] spend cap + revoke 可用

- [ ] tracking API 可用

- [ ] README 含 live URL

- [ ] 公开 repo + 安装说明 + 真实 commit 历史

- [ ] 仓库无任何 secret / 私钥

---

## 7. 禁止事项 / 安全

- 不提交私钥、Cognito secret、AWS 凭证到 Git；只用环境变量。

- 不猜测 ABI、事件签名、合约地址、tx hash、job id、deliverable URL.

- 不把 `FUNDED` 写成 `SUBMITTED`。

- 不把未实现的功能（rating / revoke / spend cap / 新 agent）在提交材料里写成“已完成”。

- 站点数据 stale 或 agent 不响应时，明示而非隐藏。