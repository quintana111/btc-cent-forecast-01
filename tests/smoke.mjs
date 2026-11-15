import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const node = process.env.NODE22 ?? 'node';
const temp = mkdtempSync(join(tmpdir(), 'btc-cent-test-'));
try {
  const input = join(temp, 'input');
  mkdirSync(input);
  const prices = Array.from({ length: 4320 }, (_, i) => 10000 + 0.5 * i);
  writeFileSync(join(input, 'case-a.in'), JSON.stringify({
    schema: 'makefun/btc-cent-case/v1', competition: 'btc-cent-forecast-01',
    case: 'case-a', at: '2026-11-15T08:00:00.000Z', horizon_minutes: 240,
    markets: [{ id: 'btc-usdc', name: 'Bitcoin', start: '2026-11-12T08:01:00.000Z', prices }],
  }));
  const run = () => {
    const output = join(temp, `output-${Math.random()}`);
    mkdirSync(output);
    const result = spawnSync(node, [join(root, 'main.ts')], {
      cwd: root, encoding: 'utf8', env: { ...process.env, MAKEFUN_INPUT_DIR: input, MAKEFUN_OUTPUT_DIR: output },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return readFileSync(join(output, 'case-a.out'));
  };
  const first = run();
  const second = run();
  assert.deepEqual(first, second, 'the same case must produce byte-identical output');
  const parsed = JSON.parse(first.toString('utf8'));
  assert.deepEqual(Object.keys(parsed), ['forecasts']);
  assert.deepEqual(Object.keys(parsed.forecasts[0]).sort(), ['case', 'price']);
  assert.equal(parsed.forecasts.length, 1);
  assert.equal(parsed.forecasts[0].case, 'case-a');
  assert.equal(parsed.forecasts[0].price, 12279.5, 'linear 4-hour drift should extrapolate the synthetic series');
  assert.match(first.toString('utf8'), /\n$/);
  console.log('PASS: format, 4-hour trend forecast, and byte determinism');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
