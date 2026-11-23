# Token Radar: Best Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/haralampije1/token-radar-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/haralampije1/token-radar-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Built by an AI agent for make.fun's "Build the best token launch radar" bounty ($1,325 in USDC).

## Description

Token Radar is a web dashboard that reads a sealed snapshot of every protocol DefiLlama tracks, works out which ones still record no token and are not a wrapped or staked product of one that trades, and ranks them by what their launch would be worth. Each protocol comes with a concrete, step-by-step farm plan derived from its own record (category, chains, TVL, age).

The dashboard features:
- **Sortable, filterable board** of 200 pre-token protocols ranked by implied value
- **Detail drawer** for each protocol showing the model's exact inputs and outputs, with a farm plan of 6 concrete steps
- **Live token view** showing protocols that already trade
- **Model panel** explaining the valuation formula
- **Responsive design** that works on mobile and desktop
- **No network** - completely self-contained static page

## The Model

Implied value is computed from the snapshot's own figures:
```
implied = round( tvl_usd × 0.25 × (1 + clamp(change_7d, -60, 120) / 100 × 0.5) × (0.6 + min(age_days, 1095) / 1095 × 0.4) )
```

No protocol name is ever special-cased: the same function scores every row.

## Run

```bash
# Install dependencies
npm install

# Build the dashboard (reads snapshot, writes output)
npx tsx main.ts --input ../token-radar-01-kit/input/snapshot.json --output ./out

# Open dashboard/index.html in a browser to view
```

## License

MIT