# Task 2 — Venus vUSDT 健康因子 / 清算参数检查

- 领域：Security（借贷清算风险）
- 日期：2026-09-04（公开 API 基线）/ 2026-09-07（hf-guard-venus 技能本地跑通；AWS AgentCore 部署）
- 使用的 Agent：`hf-guard-venus`（市场 listing **live**，ERC-8004 `2208`，wallet [`0xaaBd845B763761af98eE516a2a08829AEf548Cf3`](https://testnet.bscscan.com/address/0xaaBd845B763761af98eE516a2a08829AEf548Cf3)，runtime `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/hfguardvenus-sG614z4iLZ`）。同品类 demo listing `venus-guardian` **保持 demo**。**尚未**完成 ERC-8183 hire：没有 `job_id` / `deliverable_url`。不要把 demo listing 标成 live，也不要把「已部署」写成「已雇佣验证」。
- 任务描述：输入借款地址 + 协议（默认 Venus）+ 可选 HF 阈值；读 Venus 风险参数与账户 `getAccountLiquidity`；口语化结论 + JSON。对照：人工读文档 vs Agent 拉实时 API/RPC。

## 人工完成

- 时间：约 8 分钟（读 Venus protocol-math / vToken 文档，记下 HF 公式）
- 成本：0
- 输出：对单一市场（仅该抵押品、阈值 `LT`）：  
  `health_factor ≈ (collateral_value_usd × LT) / borrow_value_usd`  
  `HF < 1` 可清算。Venus 文档：https://docs-v4.venus.io/guides/protocol-math
- 质量评价：公式对，但**没有**代入某个真实借款地址的仓位。人工侧停在参数级。

## Agent 完成（2026-09-04 公开 API）

- 时间：约 2 分钟（HTTP GET + 过滤 `symbol=vUSDT`）
- 成本：0（公开 API，无 0.1 U 雇佣）
- 输出：[`raw/venus-vusdt-2026-09-04.json`](./raw/venus-vusdt-2026-09-04.json)

  实时字段（BSC `chainId` 56，vToken `0xfD5840Cd36d94D7229439859C0112a4185BC0255`）：

  | 字段 | API 值 | 解读 |
  | --- | --- | --- |
  | `supplyApyDecimal` | `0.0304023601` | 供应 APY ≈ **3.04%** |
  | `borrowApyDecimal` | `0.0477156322` | 借款 APY ≈ **4.77%** |
  | `collateralFactorMantissa` | `800000000000000000` | CF = **80%** |
  | `liquidationThresholdMantissa` | `800000000000000000` | LT = **80%** |

- 质量评价：市场级风险参数是活的、可复现的。当时 **pending：** 指定钱包的 `getAccountLiquidity`（BSC RPC 超时，未编造仓位）。

## Agent 完成（2026-09-07 本地 seller 技能，非链上 hire）

- 时间：约 50 秒（testnet + mainnet `pools` API + Comptroller `eth_call`）
- 成本：0（未走 ERC-8183；BNB trial 过期无法部署，没有 0.1 U 雇佣）
- 输出：[`raw/hf-guard-venus-smoke-2026-09-07.json`](./raw/hf-guard-venus-smoke-2026-09-07.json)
- 输入：空仓地址 `0x1111…1111`，阈值 1.2
- 结果（亲自跑 `runVenusHealthCheck`，信心 60%）：
  - BSC testnet Core `vUSDT`：CF **75%**，LT **80%**
  - BSC mainnet Core `vUSDT`：CF **80%**，LT **80%**，borrow APY ≈ **4.43%**
  - 该地址在两条链 Core Pool 上 `getAssetsIn` 为空 → status `no_position`（不是假的 HF 数字）
- 质量评价：比翻文档快，并且区分了「无仓位」和「在清算线」。**没有** ERC-8183 `job_id` / `deliverable_url`，因为 runtime 没上线。
- tx hash：无（只读查询）

## 结论

| 对照 | 人工 | Agent（市场雇佣） | Agent（本地技能） |
| --- | --- | --- | --- |
| 时间 | ~8 min 读文档 | **pending**（seller live，尚无 hire `job_id`） | ~50s |
| 成本 | 0 | 目标 0.1 U，未发生 | 0 |
| 质量 | 公式对，无账户 | 无 hire | 活的 CF/LT/APY + 诚实的 no_position |

在 `hf-guard-venus` 上完成一笔可公开核对的 ERC-8183 hire（`job_id` + `deliverable_url`）之前，Task 2 的「市场雇佣 vs 自己手做」雇佣侧保持 **pending**。Seller 已 live（ERC-8004 `2208` / AgentCore），但这不是 hire 证据。不宣称 Agent 已可替代风控值班，也不把 `venus-guardian` 标成 live。
