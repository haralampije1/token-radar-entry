// Utility functions for the token radar model.
// This module is fully authored in the current session.

/** Formats a number as USD currency with appropriate suffix. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  if (abs >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + Math.round(value / 1e3) + 'K';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

/** Formats a percentage value with sign. */
export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
}

/** Formats age in days as human-readable string. */
export function formatAge(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return 'unknown';
  if (days >= 365) return (days / 365).toFixed(1) + 'y';
  return Math.max(0, Math.round(days)) + 'd';
}

/** Formats a multiplier to 4 decimal places. */
export function formatMult(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(4);
}

/** Computes the implied value for a single protocol using the extended model. */
export function computeImpliedValue(
  tvl: number,
  change7d: number | null,
  ageDays: number | null,
  chains: string[],
  category: string | null,
  baseMultiple: number,
  growthWeight: number,
  growthFloor: number,
  growthCap: number,
  maturityFloor: number,
  maturityRange: number,
  maturityDays: number,
  unknownAgeDays: number,
  chainDiversityWeight: number,
  stabilityWeight: number,
  tvlTierBonuses: Record<string, number>,
  categoryMultipliers: Record<string, number>
): number {
  const rawGrowth = typeof change7d === 'number' && Number.isFinite(change7d) ? change7d : 0;
  const growthPct = Math.min(growthCap, Math.max(growthFloor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * growthWeight;

  const ageForModel = ageDays ?? unknownAgeDays;
  const maturityMult = maturityFloor + (Math.min(Math.max(ageForModel, 0), maturityDays) / maturityDays) * maturityRange;

  const base = tvl * baseMultiple;

  const chainMult = 1 + Math.min(chains.length, 10) * chainDiversityWeight;
  const stabilityMult = 1 + stabilityWeight * (1 - Math.min(Math.abs(growthPct) / 100, 1));

  let tvlTierMult = 1;
  if (tvl >= 1e10) tvlTierMult = tvlTierBonuses['10B'] ?? 1;
  else if (tvl >= 1e9) tvlTierMult = tvlTierBonuses['1B'] ?? 1;
  else if (tvl >= 5e8) tvlTierMult = tvlTierBonuses['500M'] ?? 1;
  else if (tvl >= 1e8) tvlTierMult = tvlTierBonuses['100M'] ?? 1;

  const catKey = (category ?? '').toLowerCase();
  const categoryMult = categoryMultipliers[catKey] ?? 1.0;

  return Math.max(1, Math.round(base * growthMult * maturityMult * chainMult * stabilityMult * tvlTierMult * categoryMult));
}

/** Computes chain diversity multiplier for a protocol. */
export function chainDiversityMultiplier(chains: string[], weight: number): number {
  return 1 + Math.min(chains.length, 10) * weight;
}

/** Computes stability multiplier based on 7-day growth volatility. */
export function stabilityMultiplier(change7d: number | null, weight: number): number {
  const rawGrowth = typeof change7d === 'number' && Number.isFinite(change7d) ? change7d : 0;
  return 1 + weight * (1 - Math.min(Math.abs(rawGrowth) / 100, 1));
}

/** Computes TVL tier multiplier based on protocol TVL. */
export function tvlTierMultiplier(tvl: number, bonuses: Record<string, number>): number {
  if (tvl >= 1e10) return bonuses['10B'] ?? 1;
  if (tvl >= 1e9) return bonuses['1B'] ?? 1;
  if (tvl >= 5e8) return bonuses['500M'] ?? 1;
  if (tvl >= 1e8) return bonuses['100M'] ?? 1;
  return 1;
}

/** Computes category multiplier for a protocol. */
export function categoryMultiplier(category: string | null, multipliers: Record<string, number>): number {
  const catKey = (category ?? '').toLowerCase();
  return multipliers[catKey] ?? 1.0;
}

/** Determines if a protocol is pre-token (no token on record). */
export function isPreTokenProtocol(mcap: number | null, geckoId: string | null, symbol: string | null): boolean {
  return mcap === null && geckoId === null && symbol === null;
}

/** Determines if a protocol is rankable (pre-token, not CEX, not versioned pool). */
export function isRankableProtocol(
  mcap: number | null,
  geckoId: string | null,
  symbol: string | null,
  category: string | null,
  name: string
): boolean {
  if (mcap !== null || geckoId !== null || symbol !== null) return false;
  if (category === 'CEX') return false;
  if (/\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(name)) return false;
  return true;
}

/** Calculates age in days from snapshot date and listed date. */
export function calculateAgeDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const DAY_MS = 86_400_000;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Capital required for farming based on TVL. */
export function capitalForTvl(tvl: number): number {
  if (tvl >= 5e9) return 250;
  if (tvl >= 1e9) return 150;
  if (tvl >= 1e8) return 100;
  return 50;
}

/** Hold days based on protocol age. */
export function holdDaysForAge(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Farm action based on category. */
export function farmActionForCategory(category: string | null, capital: number, chain: string, name: string): string {
  const c = (category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) {
    return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  }
  if (c.includes('bridge')) {
    return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  }
  if (c.includes('perpetual') || c.includes('derivative')) {
    return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  }
  if (c.includes('prediction')) {
    return `Fund $${capital} and place one market position on ${name}.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  }
  if (c.includes('stable')) {
    return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  }
  if (c.includes('rwa')) {
    return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  }
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** Generates complete farm steps for a protocol. */
export function generateFarmSteps(
  protocol: {
    name: string;
    category: string | null;
    chains: string[];
    tvl_usd: number;
    listed_at: string | null;
  },
  asOf: string
): { text: string; cost: string; time: string }[] {
  const age = calculateAgeDays(asOf, protocol.listed_at);
  const capital = capitalForTvl(protocol.tvl_usd);
  const hold = holdDaysForAge(age);
  const chain = protocol.chains.length > 0 ? protocol.chains[0] : 'its main chain';
  const isMultiChain = protocol.chains.length > 1;
  const action = farmActionForCategory(protocol.category, capital, chain, protocol.name);
  const extraChainInfo = isMultiChain ? ` (also on ${protocol.chains.slice(1, 3).join(', ')})` : '';

  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `${action}${extraChainInfo}`,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week – deposit, borrow, swap, or vote – on ${protocol.name} to build activity history.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open ${protocol.name}'s own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** Rounds a number to 4 decimal places. */
export function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** Converts a farm step object to a single formatted string. */
export function formatFarmStep(step: { text: string; cost: string; time: string }): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** Sorts protocols by implied value descending, then by slug. */
export function sortByImpliedValue<T extends { implied_value_usd: number; slug: string }>(protocols: T[]): T[] {
  return [...protocols].sort((a, b) =>
    b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
  );
}

/** Filters protocols by search query across name, slug, category, and chains. */
export function filterProtocols<T extends { name: string; slug: string; category: string | null; chains: string[] }>(
  protocols: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return protocols;
  return protocols.filter(p => {
    const hay = [p.name, p.slug, p.category ?? '', ...p.chains].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Validates a board row meets gate requirements. */
export function validateBoardRow(row: {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: string;
  age_days: number | null;
  implied_value_usd: number;
  farm_steps: string[];
}, snapshotWatchlist: string[]): string | null {
  if (!Number.isSafeInteger(row.rank) || row.rank <= 0) {
    return `${row.slug} has invalid rank ${row.rank}`;
  }
  if (!row.slug || typeof row.slug !== 'string') {
    return `${row.slug || 'unknown'} has invalid slug`;
  }
  if (!row.name || typeof row.name !== 'string') {
    return `${row.slug} has invalid name`;
  }
  if (!Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd <= 0) {
    return `${row.slug} has implied value ${row.implied_value_usd}`;
  }
  const steps = row.farm_steps;
  if (steps.length < 3 || steps.length > 12) {
    return `${row.slug} has ${steps.length} farm steps`;
  }
  for (const s of steps) {
    if (s.length < 20 || s.length > 600) {
      return `${row.slug} has a farm step of ${s.length} characters`;
    }
  }
  return null;
}