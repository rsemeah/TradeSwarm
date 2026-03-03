import { detectRegime } from "../index";
import type { Candle, RegimeLabel } from "../types";

type GeneratorConfig = {
  length: number;
  drift: number;
  volatility: number;
  rangeScale: number;
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1103515245 * state + 12345) % 0x80000000;
    return state / 0x80000000;
  };
}

function makeCandles(config: GeneratorConfig, seed = 42, startPrice = 100): Candle[] {
  const rand = seededRandom(seed);
  let close = startPrice;
  const candles: Candle[] = [];

  for (let i = 0; i < config.length; i += 1) {
    const noise = (rand() - 0.5) * config.volatility;
    const ret = config.drift + noise;
    const nextClose = Math.max(1, close * (1 + ret));
    const high = Math.max(close, nextClose) * (1 + config.rangeScale * rand());
    const low = Math.min(close, nextClose) * (1 - config.rangeScale * rand());

    candles.push({
      timestamp: new Date(1700000000000 + i * 60_000).toISOString(),
      open: close,
      high,
      low,
      close: nextClose,
      volume: 1000 + Math.floor(rand() * 250),
    });

    close = nextClose;
  }

  return candles;
}

function assertRegime(expected: RegimeLabel, candles: Candle[]): void {
  const result = detectRegime(candles, { nStates: 4, featureWindow: 14, maxIterations: 30 });
  // eslint-disable-next-line no-console
  console.log(`[regime-test] expected=${expected} got=${result.label} confidence=${result.confidence.toFixed(4)}`);
  if (result.label !== expected) {
    throw new Error(`Expected ${expected} regime but got ${result.label}`);
  }
  if (result.confidence < 0.2) {
    throw new Error(`Expected confidence >= 0.2 but got ${result.confidence}`);
  }
}

export function runRegimeHarness(): void {
  assertRegime("BULL", makeCandles({ length: 160, drift: 0.0032, volatility: 0.003, rangeScale: 0.002 }, 1));
  assertRegime("BEAR", makeCandles({ length: 160, drift: -0.0034, volatility: 0.0035, rangeScale: 0.002 }, 2));
  assertRegime("SIDEWAYS", makeCandles({ length: 160, drift: 0.00001, volatility: 0.0012, rangeScale: 0.001 }, 3));
  assertRegime("VOLATILE", makeCandles({ length: 160, drift: 0.0001, volatility: 0.02, rangeScale: 0.01 }, 4));
}

if (process.env.RUN_REGIME_HARNESS === "1") {
  runRegimeHarness();
}
