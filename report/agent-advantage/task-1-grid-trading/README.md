# Task 1 — 10-level BNB/USDT grid plan

- 领域：Trading
- 日期：2026-09-03 (negotiate) / 2026-09-04 (human ladder + this write-up)
- 使用的 Agent：Grid BNB / USDT (`grid-bnb-usdt`), ERC-8004 agent_id `2066`, wallet [`0x3573e861363880f18F357Ca8258FA1393573d676`](https://testnet.bscscan.com/address/0x3573e861363880f18F357Ca8258FA1393573d676)
- 任务描述：搭一个 **10 层** BNB/USDT 网格，价格区间 **500–600 USDT**。人工手算梯子 vs 已部署 seller 的 A2A `negotiate` 报价（目标 deliverable：`grid plan with prices and sizes`）。

## 人工完成

- 时间：约 3 分钟（等差 10 档，含两端）
- 成本：0（无付费 API）
- 输出：[`raw/human-grid-10-levels-500-600.csv`](./raw/human-grid-10-levels-500-600.csv)  
  档位：500.00, 511.11, 522.22, 533.33, 544.44, 555.56, 566.67, 577.78, 588.89, 600.00 USDT（步长 `100/9`）。
- 质量评价：只有价格梯子，**没有**按现货和预算拆 size。未接盘口。适合当对照基线，不是可下单计划。

## Agent 完成

- 时间：**pending（墙钟未测）**。链上留下的 negotiate 时间戳是 `negotiated_at` = `1788425214` = **2026-09-03T08:46:54Z**。报价里 `estimated_completion_seconds` = 600，那是 seller 声明的交付窗口，**不是**实测耗时。
- 成本：报价 **0.1 U**（`100000000000000000` wei，currency `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`）。**尚未支付**（无 ERC-8183 `fund`）。
- 输出：
  - 已完成：签名报价 [`raw/negotiate-2026-09-03.json`](./raw/negotiate-2026-09-03.json)  
    `negotiation_hash` `0xca67d9ad9015e4fd45e726d403a2dea8514176b45266c21c73a42d855432f1b3`，`chain_id` 97，`verifying_contract` `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de`。
  - **pending：** `deliverable_url` / 网格 size 计划。第 3 节买家 `fund → notify_funded → SUBMITTED` 未在本仓库留下收据（缺少 `ERC8183_BUYER_PRIVATE_KEY` 的完整雇佣）。
- 质量评价：negotiate 证明 seller 在线、会签 0.1 U 报价、任务描述对得上。**不能**评价网格质量，因为计划还没提交上链。
- tx hash：**不是 fund tx。** 买家地址曾收到 2 U 的 testnet 转账（为雇佣备资，不是 `createJob/fund`）：  
  `0xb584049be11d26cc1a79cba2ad75ccbf01d5dffee6d6555e330815ebdd6becfa`
- 链上链接：https://testnet.bscscan.com/tx/0xb584049be11d26cc1a79cba2ad75ccbf01d5dffee6d6555e330815ebdd6becfa  
  **pending：** ERC-8183 `fund` tx / `JobSubmitted`。

## 结论

人工 3 分钟就能排出 10 档价格，但没有 size；Agent 侧目前只有 **真实 negotiate + 备资转账**，雇佣与 deliverable 仍是 **pending**。在 fund 完成前，不能声称 Agent 比人工更快或更便宜地交出网格计划。
