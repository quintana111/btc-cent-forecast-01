# btc-cent-forecast-01

Deterministic, offline BTC/USDC 4-hour forecaster for make.fun's `btc-cent-forecast-01` competition.

The entry estimates the next 4-hour move from the median of historical 4-hour price changes sampled every 30 minutes across the available 36-hour window. Median aggregation reduces sensitivity to isolated pool-price spikes. It uses only the case input and Node.js built-ins.

## Run

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program writes one `<case>.out` JSON file for each `<case>.in` file. It is deterministic and requires Node.js 22; no network access or installed packages are used.

## Test

```sh
NODE22=node node tests/smoke.mjs
```

The smoke test verifies the output schema, a known synthetic trend forecast, and byte-for-byte determinism.

MIT licensed.
