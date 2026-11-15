// Forecast from the median of recent 4-hour returns, sampled every 30 minutes.
// Overlapping samples keep the local drift signal; the median limits spike influence.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface BtcCase {
  schema: string;
  competition: string;
  case: string;
  horizon_minutes: number;
  markets: Array<{ id: string; prices: number[] }>;
}

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const HORIZON = 240;
const LOOKBACK = 2160; // 36 hours of observed history.
const SAMPLE_STEP = 30; // Sample historical horizon returns every 30 minutes.
const MIN_PRICE = 0.00001;
const MAX_PRICE = 9_999_999.99999;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function forecast(prices: number[]): number {
  if (prices.length < HORIZON + 1) throw new Error('case has too few prices');
  if (prices.some((p) => !Number.isFinite(p) || p <= 0)) throw new Error('case contains an invalid price');
  const last = prices.length - 1;
  const firstEnd = Math.max(HORIZON, prices.length - LOOKBACK + HORIZON - 1);
  const horizonReturns: number[] = [];
  for (let end = last; end >= firstEnd; end -= SAMPLE_STEP) {
    horizonReturns.push(prices[end] - prices[end - HORIZON]);
  }
  const raw = prices[last] + median(horizonReturns);
  const bounded = Math.min(MAX_PRICE, Math.max(MIN_PRICE, raw));
  return Number(bounded.toFixed(5));
}

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const file of readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort()) {
  const input = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as BtcCase;
  if (input.schema !== 'makefun/btc-cent-case/v1' || input.competition !== 'btc-cent-forecast-01') {
    throw new Error(`${file} is not a btc-cent-forecast-01 case`);
  }
  if (input.horizon_minutes !== HORIZON || !Array.isArray(input.markets) || input.markets.length !== 1) {
    throw new Error(`${file} has an unsupported case shape`);
  }
  const market = input.markets[0];
  if (market.id !== 'btc-usdc' || !Array.isArray(market.prices)) throw new Error(`${file} has no btc-usdc series`);
  const id = file.slice(0, -3);
  if (input.case !== id) throw new Error(`${file} names a different case`);
  const output = { forecasts: [{ case: id, price: forecast(market.prices) }] };
  writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify(output)}\n`);
}
