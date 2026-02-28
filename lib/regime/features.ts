import type { Candle, FeatureMatrix, FeatureVector } from "./types";

const FEATURE_NAMES = ["logReturn", "rollingVolatility", "atrPct", "trendSlope"] as const;

export function featureNames(): string[] {
  return [...FEATURE_NAMES];
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((acc, value) => acc + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const xCentered = i - xMean;
    numerator += xCentered * (values[i] - yMean);
    denominator += xCentered * xCentered;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Build standardized regime features from candle history.
 * The returned rows are aligned to trailing windows so each row has full lookback context.
 */
export function buildFeatureMatrix(candles: Candle[], window = 14): FeatureMatrix {
  if (candles.length < window + 1) {
    return {
      rows: [],
      featureNames: featureNames(),
      timestamps: [],
    };
  }

  const logReturns: number[] = [0];
  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i += 1) {
    const prevClose = candles[i - 1].close;
    const current = candles[i];
    logReturns.push(Math.log(current.close / prevClose));
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose),
    );
    trueRanges.push(tr);
  }

  const rows: FeatureVector[] = [];
  const timestamps: string[] = [];

  for (let i = window; i < candles.length; i += 1) {
    const returnsWindow = logReturns.slice(i - window + 1, i + 1);
    const trWindow = trueRanges.slice(i - window + 1, i + 1);
    const closeWindow = candles.slice(i - window + 1, i + 1).map((c) => c.close);

    const logReturn = logReturns[i];
    const rollingVolatility = stdDev(returnsWindow);
    const atr = trWindow.reduce((acc, tr) => acc + tr, 0) / trWindow.length;
    const atrPct = atr / Math.max(candles[i].close, 1e-9);
    const slope = trendSlope(closeWindow);
    const normalizedSlope = slope / Math.max(candles[i].close, 1e-9);

    rows.push([logReturn, rollingVolatility, atrPct, normalizedSlope]);
    timestamps.push(candles[i].timestamp);
  }

  return {
    rows,
    featureNames: featureNames(),
    timestamps,
  };
}
