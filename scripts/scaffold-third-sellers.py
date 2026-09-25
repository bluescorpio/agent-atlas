#!/usr/bin/env python3
"""Copy Task-2 second-of-category sellers into third-of-category workspaces."""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

ROOT = Path("/Users/edy/mycursor/agent-atlas")
SKIP_DIRS = {".cursor", ".claude", ".studio", "node_modules", "dist", ".git", ".next"}

COPIES = [
    {
        "src": "grid-eth-usdt",
        "dst": "grid-cake-bnb",
        "pairs": [
            ("grid-eth-usdt", "grid-cake-bnb"),
            ("gridethusdt", "gridcakebnb"),
            ("Grid ETH / USDT", "Grid CAKE / BNB"),
            ("ETH/USDT", "CAKE/BNB"),
            ("ETH / USDT", "CAKE / BNB"),
        ],
        "readme": (
            "BNB Agent Studio seller for marketplace listing `grid-cake-bnb`.\n\n"
            "PancakeSwap CAKE/BNB grid. Parameters: gridCount, lowerPrice, upperPrice, budgetCap.\n\n"
            "Independent wallet + AgentCore runtime + ERC-8004 registration. "
            "Do not reuse sibling sellers' keys or ARNs.\n"
        ),
    },
    {
        "src": "rebalancing-pcs-v3-eth",
        "dst": "rebalancing-thena",
        "pairs": [
            ("rebalancing-pcs-v3-eth", "rebalancing-thena"),
            ("rebalancingpcsv3eth", "rebalancingthena"),
            ("Rebalancing PCS v3 ETH", "Rebalancing Thena"),
            ("ETH pair", "Thena pair"),
        ],
        "readme": (
            "BNB Agent Studio seller for marketplace listing `rebalancing-thena`.\n\n"
            "Read-only PancakeSwap V3-style pool snapshot (Thena listing). "
            "Does not mint, burn, or move LP.\n\n"
            "Independent wallet + AgentCore runtime + ERC-8004 registration. "
            "Do not reuse sibling sellers' keys or ARNs.\n"
        ),
    },
    {
        "src": "yield-venus-usdt",
        "dst": "yield-lista-usdt",
        "pairs": [
            ("yield-venus-usdt", "yield-lista-usdt"),
            ("yieldvenususdt", "yieldlistausdt"),
            ("Yield Venus USDT", "Yield Lista USDT"),
            ("Venus USDT", "Lista USDT"),
        ],
        "readme": (
            "BNB Agent Studio seller for marketplace listing `yield-lista-usdt`.\n\n"
            "Read-only yield-rate snapshot. tools.ts currently exposes Venus vToken "
            "supply/borrow views; no Lista-specific contracts are invented.\n\n"
            "Independent wallet + AgentCore runtime + ERC-8004 registration. "
            "Do not reuse sibling sellers' keys or ARNs.\n"
        ),
    },
    {
        "src": "hf-guard-lista",
        "dst": "hf-guard-venus-usdc",
        "pairs": [
            ("hf-guard-lista", "hf-guard-venus-usdc"),
            ("hfguardlista", "hfguardvenususdc"),
            ("HF Guard Lista", "HF Guard Venus USDC"),
        ],
        "readme": (
            "BNB Agent Studio seller for marketplace listing `hf-guard-venus-usdc`.\n\n"
            "Read-only health-factor check for a USDC-named listing. "
            "Tools are Comptroller/vToken views; does not repay or add collateral.\n\n"
            "Independent wallet + AgentCore runtime + ERC-8004 registration. "
            "Do not reuse sibling sellers' keys or ARNs.\n"
        ),
    },
]


def rewrite(text: str, pairs: list[tuple[str, str]]) -> str:
    for old, new in pairs:
        text = text.replace(old, new)
    return text


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)

    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = Path(root).relative_to(src)
        target_dir = dst / rel
        target_dir.mkdir(parents=True, exist_ok=True)
        for name in files:
            if name.endswith(".tsbuildinfo"):
                continue
            shutil.copy2(Path(root) / name, target_dir / name)


def scrub_studio_toml(path: Path) -> None:
    text = path.read_text()
    lines = []
    skip_identity = False
    for line in text.splitlines(True):
        if line.startswith("[identity]"):
            skip_identity = True
            continue
        if skip_identity and line.startswith("[") and not line.startswith("[identity]"):
            skip_identity = False
        if line.startswith("[deploy]"):
            in_deploy = True
        elif line.startswith("["):
            in_deploy = False
        if skip_identity:
            continue
        if in_deploy and line.startswith("provider ="):
            continue
        if line.startswith("runtime_arn"):
            continue
        if line.startswith("invoke_url"):
            continue
        if line.startswith("oauth_client_id"):
            continue
        if line.startswith("oauth_discovery_url"):
            continue
        if line.startswith("address ="):
            continue
        if line.startswith("platform_exposed_addresses"):
            lines.append("platform_exposed_addresses = []\n")
            continue
        if line.startswith("key_hash"):
            continue
        lines.append(line)
    path.write_text("".join(lines))


def scrub_agentcore(path: Path, core: str) -> None:
    data = json.loads(path.read_text())
    data["name"] = core
    for runtime in data.get("runtimes") or []:
        runtime["name"] = core
        auth = runtime.get("authorizerConfiguration", {}).get("customJwtAuthorizer", {})
        if "allowedClients" in auth:
            auth["allowedClients"] = []
    path.write_text(json.dumps(data, indent=2) + "\n")


def rewrite_tree(root: Path, pairs: list[tuple[str, str]]) -> None:
    for dirpath, _, files in os.walk(root):
        for name in files:
            path = Path(dirpath) / name
            if path.suffix in {".png", ".jpg", ".zip", ".wasm"}:
                continue
            try:
                text = path.read_text()
            except UnicodeDecodeError:
                continue
            new = rewrite(text, pairs)
            if new != text:
                path.write_text(new)


def copy_env(src: Path, dst: Path) -> None:
    env = src / ".studio" / ".env.local"
    if not env.exists():
        return
    target = dst / ".studio"
    target.mkdir(parents=True, exist_ok=True)
    shutil.copy2(env, target / ".env.local")


def main() -> None:
    for spec in COPIES:
        src = ROOT / "agents" / spec["src"]
        dst = ROOT / "agents" / spec["dst"]
        copy_tree(src, dst)
        rewrite_tree(dst, spec["pairs"])
        core = spec["pairs"][1][1]
        scrub_studio_toml(dst / "app" / "agent" / "studio.toml")
        scrub_agentcore(dst / "agentcore" / "agentcore.json", core)
        (dst / "README.md").write_text(f"# {spec['dst']}\n\n{spec['readme']}")
        copy_env(src, dst)
        print(f"copied {spec['src']} -> {spec['dst']} core={core}")


if __name__ == "__main__":
    main()
