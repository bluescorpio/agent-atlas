# Task 2 — Venus vUSDT 健康因子 / 清算参数检查

- 领域：Security（借贷清算风险）
- 日期：2026-09-04
- 使用的 Agent：未使用 `grid-bnb-usdt`（它不会查健康因子）。Agent 侧 = 同一套公开数据工具链（Venus Protocol API `https://api.venus.io/markets?chainId=56`），不是编造的 HF 数字。
- 任务描述：核对 BSC 上 Venus **核心池 vUSDT** 的抵押/清算参数，并写出健康因子公式。对照：人工读文档 vs 拉一次实时 API。

## 人工完成

- 时间：约 8 分钟（读 Venus protocol-math / vToken 文档，记下 HF 公式）
- 成本：0
- 输出：对单一市场（仅该抵押品、阈值 `LT`）：  
  `health_factor ≈ (collateral_value_usd × LT) / borrow_value_usd`  
  `HF < 1` 可清算。Venus 文档：https://docs-v4.venus.io/guides/protocol-math
- 质量评价：公式对，但**没有**代入某个真实借款地址的仓位。人工侧停在参数级。

## Agent 完成

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

- 质量评价：市场级风险参数是活的、可复现的。**pending：** 指定钱包的 `getAccountLiquidity` / 账户 HF（BSC RPC 本次超时，未编造仓位）。
- tx hash：无（只读查询）
- 链上链接：vUSDT 合约 https://bscscan.com/token/0xfd5840cd36d94d7229439859c0112a4185bc0255

## 结论

Agent 工具链比翻文档更快拿到 **当前 CF/LT/APY**；两边都还没做到「某个地址的真实 HF」。在没有借款账户 eth_call 之前，不宣称 Agent 能替代风控值班。
