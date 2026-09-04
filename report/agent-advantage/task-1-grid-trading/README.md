# Task 1 — 10-level BNB/USDT grid plan

- 领域：Trading
- 日期：2026-09-03 (negotiate) / 2026-09-04 (human ladder + ERC-8183 hire verified)
- 使用的 Agent：Grid BNB / USDT (`grid-bnb-usdt`), ERC-8004 agent_id `2066`, wallet [`0x3573e861363880f18F357Ca8258FA1393573d676`](https://testnet.bscscan.com/address/0x3573e861363880f18F357Ca8258FA1393573d676)
- 任务描述：搭一个 **10 层** BNB/USDT 网格，价格区间 **500–600 USDT**。人工手算梯子 vs 已部署 seller 的 A2A `negotiate` 报价（目标 deliverable：`grid plan with prices and sizes`）。

## Status: Complete (verified 2026-09-04)

- Job: 963（BSC testnet, chain 97）
- Client: `0xc4dedeC81d9285DDD66c4A29f1B268A478fFEd95`
- Provider: `0x3573e861363880f18F357Ca8258FA1393573d676`
- Budget: 0.1 U | Status: **SUBMITTED**（未 settle；24h 争议窗口未过，不作 COMPLETED 声称）
- Deliverable: https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json （公开可读，内容已核实）
- 结果：10 档 BNB/USDT 网格，500–600 USDT，步长 ≈11.11，单档 0.166 BNB，500–544.44 Buy / 555.56–600 Sell

## 人工完成

- 时间：约 3 分钟（等差 10 档，含两端）
- 成本：0（无付费 API）
- 输出：[`raw/human-grid-10-levels-500-600.csv`](./raw/human-grid-10-levels-500-600.csv)  
  档位：500.00, 511.11, 522.22, 533.33, 544.44, 555.56, 566.67, 577.78, 588.89, 600.00 USDT（步长 `100/9`）。
- 质量评价：只有价格梯子，**没有**按现货和预算拆 size。未接盘口。适合当对照基线，不是可下单计划。

## Agent 完成

- 时间：2026-09-04 完整雇佣（negotiate → fund → `notify_funded` → `SUBMITTED`）。Activate POST 墙钟约 **43s**（含链上四笔 + seller 提交）。更早的 negotiate 时间戳 `negotiated_at` = `1788425214` = **2026-09-03T08:46:54Z** 是另一份报价，不是 job 963。
- 成本：**0.1 U** 已作为 job 963 `budget` 锁定（`100000000000000000` wei，currency `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`）。
- 输出：
  - 签名报价 [`raw/negotiate-2026-09-03.json`](./raw/negotiate-2026-09-03.json)（2026-09-03 那次 negotiate；job 963 用的是 2026-09-04 新报价，`negotiation_hash` `0x1313a713e1f66daa85fe1781e4a0d0d21268e341074a97e6f098b65fd7af9921`）。
  - Deliverable（job 963）：https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json
- 质量评价：10 档价格与人工梯子相同（500–600，步长 `100/9`）。Agent 额外给了每档 **0.166 BNB** 和买卖方向（500–544.44 Buy / 555.56–600 Sell）。未接盘口；size 是均匀名义，不是按现货深度拆的。
- tx hash（备资，**不是** fund tx）：买家曾收到 2 U  
  `0xb584049be11d26cc1a79cba2ad75ccbf01d5dffee6d6555e330815ebdd6becfa`  
  https://testnet.bscscan.com/tx/0xb584049be11d26cc1a79cba2ad75ccbf01d5dffee6d6555e330815ebdd6becfa  
  雇佣收据以 **job 963** `SUBMITTED` + 上列 deliverable URL 为准。Activate 现返回 `200` `{ jobId, status, deliverableUrl }`；未记录 fund tx hash，不编造。

## 结论

人工 3 分钟排出同价梯子但没有 size。Agent 在 job 963 上以 **0.1 U** 交出带 size 的 10 档计划，链上状态 **SUBMITTED**（不是 COMPLETED / settled）。价格算术与人工一致；size/方向是规则网格，不是盘口优化。
