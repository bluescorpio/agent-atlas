# Task 3 — Venus vs Lista 稳定币 USDT 收益对比

- 领域：DeFi
- 日期：2026-09-04
- 使用的 Agent：2026-09-04 公开数据对照未走 ERC-8183。专用 seller `yield-stable-router` 现已 **live**（ERC-8004 `2209`，wallet [`0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE`](https://testnet.bscscan.com/address/0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE)，runtime `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/yieldstablerouter-FscO4qDKDv`）。ERC-8183 job **`1121`** 状态 **FUNDED**（0.1 U 托管）；`notify_funded` 已 accepted。**没有** `deliverable_url`：Pieverse `auto/free` **429 Daily request limit exceeded**。`tools.ts` 只有 Venus `supplyRatePerBlock` / `borrowRatePerBlock` 与 ERC-20 `symbol` / `decimals`，没有 Lista 合约 view。下表仍是 2026-09-04 Venus API + DefiLlama 快照，不是该 runtime 的 hire deliverable。
- 任务描述：比较 BSC 上 **USDT** 在 Venus 核心池与 Lista Lending 的供应收益。用 TVL 最大的 Lista USDT 池当主对照，避免拿 1.5 万 TVL 的高 APY 池当「Lista 官方利率」。

## 人工完成

- 时间：约 6 分钟（看 DefiLlama / Venus 市场列表，记下主池）
- 成本：0
- 输出：主对照应是 Venus core USDT vs Lista 上 TVL 最高的 USDT 市场，而不是 APY 最高的薄池。
- 质量评价：方向对；人工容易被小池 20%+ APY 带偏，必须看 TVL。

## Agent 完成

- 时间：约 2 分钟（脚本过滤 `chain=BSC`、`symbol` 含 USDT、`project` 含 venus/lista）
- 成本：0
- 输出：
  - [`raw/venus-vusdt-2026-09-04.json`](./raw/venus-vusdt-2026-09-04.json) — Venus API
  - [`raw/defillama-bsc-usdt-venus-lista-2026-09-04.json`](./raw/defillama-bsc-usdt-venus-lista-2026-09-04.json) — DefiLlama 快照

  | 来源 | 池 | TVL (USD) | APY % | 备注 |
  | --- | --- | --- | --- | --- |
  | Venus API `vUSDT` | `0xfD58…BC0255` | （API 用 cents 字段，见 raw） | **3.040** (`supplyApyDecimal`) | 核心池 |
  | DefiLlama `venus-core-pool` | `9f3a6015-…` | 52,861,396 | **3.046** | 与 API 同量级 |
  | DefiLlama `lista-lending` | `3b24b57f-…` | **2,913,552** | **1.528** | **主对照（Lista USDT TVL 最大）** |
  | DefiLlama `lista-lending` | `8b4267ba-…` | 2,766,125 | 3.665 | 另一 Lista USDT 市场 |
  | DefiLlama `lista-lending` | `80a280c8-…` | 2,240,361 | 6.601（含 reward 1.91） | 含激励 |
  | DefiLlama `lista-lending` | `d0841f19-…` | 15,689 | 28.17 | **薄池，不作主结论** |

- 质量评价：数字都带来源和时间。结论依赖「比核心 Venus vs 最大 Lista USDT 池」，不是「Lista 一定更高」。
- tx hash：无（只读）
- 链上链接：Venus vUSDT https://bscscan.com/token/0xfd5840cd36d94d7229439859c0112a4185bc0255

## 结论

同一时刻：**Venus 核心 USDT ≈ 3.04% APY，Lista 最大 USDT 池 ≈ 1.53% APY**（DefiLlama）。Agent 拉取比人工翻页快，且不容易把 1.5 万 TVL / 28% 的池当成 Lista 代表利率。ERC-8183 job `1121` 已 **FUNDED**（0.1 U escrow），但交付物未生成（Pieverse 429），所以雇佣侧对照仍不能用 chain deliverable。不要把 FUNDED 写成 SUBMITTED。
