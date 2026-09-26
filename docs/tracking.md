# Agent Atlas — Set and Earn tracking details

For Damian / Gwen. Network: **BSC Testnet, chain 97**. Deadline: 27 Sep 2026 12:00 UTC.

**One-line (launch materials):** Find, compare and hire ERC-8004 DeFi agents on BNB Smart Chain.

## Launch confirmation

| Field | Value |
| --- | --- |
| Live URL | https://agent-atlas.xyz (canonical https://www.agent-atlas.xyz) |
| Public browse | Yes — no login / invite / wallet required to list agents |
| X | https://x.com/wang_xiaolou |
| Telegram (support) | https://t.me/wang_xiaolou (`@wang_xiaolou`) |
| Brand kit | https://github.com/bluescorpio/agent-atlas/tree/main/public/brand (SVG + PNG). Brief: `docs/brand/Agent-Atlas-Logo-Brand-Kit.docx` |
| Repository | https://github.com/bluescorpio/agent-atlas |
| One-line | Find, compare and hire ERC-8004 DeFi agents on BNB Smart Chain. |

## 6. Tracking (required)

### Contract addresses (BSC testnet 97)

| Role | Address |
| --- | --- |
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ERC-8183 Commerce | `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de` |
| ERC-8183 Router | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| ERC-8183 Policy | `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea` |
| Payment token $U | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` |

Mainnet Identity / Reputation (migration after campaign, not live yet): Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`.

### Events (hire / deposit / completion / rating)

Topic0 = keccak256 of the canonical signature (indexed flags omitted).

| Quest meaning | Contract | Event | Signature | Topic0 |
| --- | --- | --- | --- | --- |
| Hire | ERC-8183 Commerce | `JobCreated` | `JobCreated(uint256,address,address,address,uint256,address)` | `0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9` |
| Deposit | ERC-8183 Commerce | `JobFunded` | `JobFunded(uint256,address,uint256)` | `0xe3fbcc1ea1bdc559ec7f0347efde7655e58b5f45a30b0e4470a583c3ef5496b3` |
| Job completion (seller delivered) | ERC-8183 Commerce | `JobSubmitted` | `JobSubmitted(uint256,address,bytes32)` | `0x80c17db79857f338a6a6df68a6883ecc0ce78e2202fe61ed979733573f40538e` |
| Job completion (evaluator closed) | ERC-8183 Commerce | `JobCompleted` | `JobCompleted(uint256,address,bytes32)` | `0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444` |
| Rating | ERC-8004 Reputation | `NewFeedback` | `NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)` | `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` |

Solidity (indexed) forms used on chain:

```
JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)
JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)
JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)
JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason)
NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)
```

Status machine: Open(0) → Funded(1) → Submitted(2) → Completed(3) / Rejected(4) / Expired(5). **Do not count Funded as Submitted.**

### Agent IDs and owner wallets

ERC-8004 Identity on chain 97. `agentId` = ERC-721 `tokenId`.

- Registration: `Registered(uint256 indexed agentId, string agentURI, address indexed owner)` topic0 `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a`
- Owner: `ownerOf(agentId)`
- Agent wallet: `getAgentWallet(agentId)`
- URI: `tokenURI(agentId)`

### Off-chain APIs (anything not a single log)

Live, no auth:

| Endpoint | Purpose | Example |
| --- | --- | --- |
| `GET https://www.agent-atlas.xyz/api/agents` | ERC-8004 catalog (chain, registries, `agent_id`, category, hireable, stale) | `?hireable=1` returns the 12 AgentCore sellers |
| `GET https://www.agent-atlas.xyz/api/hires?wallet=0x…` | That wallet’s `JobCreated` / `JobFunded` in the RPC log window | `?wallet=0x81122d2Ea08B5c61b899949fc9b9C3735C972414` |
| `GET https://www.agent-atlas.xyz/api/agents/by-owner?owner=0x…` | Identity tokens owned by that address | `?owner=0x3573e861363880f18F357Ca8258FA1393573d676` |

`/api/hires` pages `eth_getLogs` in ≤49k-block chunks. If the public RPC pruned older history, older jobs (including historical `963`) may be absent from the JSON even though they exist on chain.

### Team wallets

| Role | Address |
| --- | --- |
| **Team / prize** | `0xDdd54D4D71FF9AD625D8e90DC6DdEafEeB5632Ba` |
| ERC-8183 hire buyer (marketplace operator key) | `0x81122d2Ea08B5c61b899949fc9b9C3735C972414` |
| Grid BNB/USDT seller `2066` | `0x3573e861363880f18F357Ca8258FA1393573d676` |
| Grid ETH/USDT seller `2476` | `0x9E94A5953663ae95F35aFd4E16AFFdd41FaD79eD` |
| Grid CAKE/BNB seller `2489` | `0x6dB4951Cc7c1A5AEBDC83C0545DFCc233FC77c6C` |
| Rebalancing PCS v3 seller `2207` | `0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32` |
| Rebalancing PCS v3 ETH seller `2477` | `0xA25c59b2C52d47E244C090360B800825b24196b5` |
| Rebalancing Thena seller `2490` | `0xec379E4C61626DC68485C60295a3cAADf7c85D25` |
| HF Guard Venus seller `2208` | `0xaaBd845B763761af98eE516a2a08829AEf548Cf3` |
| HF Guard Lista seller `2479` | `0x4f9B2A5B8632e36bD6c7A88d793E40d08f84d801` |
| HF Guard Venus USDC seller `2492` | `0x10B76CA388Ed2F81320617F343dbA24040253E0D` |
| Yield Stable Router seller `2209` | `0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE` |
| Yield Venus USDT seller `2478` | `0x15969074080c033DE2Cdd7f04CCD1B8DbF4F99c2` |
| Yield Lista USDT seller `2491` | `0x94dCb2EA7A64Bccf701b70841c5771168a9F910E` |

## Hireable coverage (live `GET /api/agents?hireable=1`, 2026-09-26)

3 per category: grid `2066` / `2476` / `2489`; rebalancing `2207` / `2477` / `2490`; health factor `2208` / `2479` / `2492`; yield `2209` / `2478` / `2491`.

## Known gaps (do not send as done)

- **Quest-grade hire in all four categories:** only grid job `963` is **SUBMITTED** with a deliverable. Rebalancing `1115`, HF `1120`, yield `1121` are **FUNDED** only (Pieverse `auto/free` 429). Later probe jobs `1330`–`1332` are also FUNDED.
- **Rating write UI:** marketplace reads Reputation `feedbackCount`; it does not post `NewFeedback`. Organizers can still index the event on the Reputation registry.
- **Catalog unclassified ratio:** ~99% of identity tokens have no category in URI (global ERC-8004 set). Our 12 sellers are classified; the rest show as Unclassified.
- **Mainnet:** Phase 2 allows testnet. Mainnet is required after the campaign; not migrated.
- **`GET /api/hires` window:** may return `count: 0` for the buyer if the RPC pruned the blocks that contain older jobs.
