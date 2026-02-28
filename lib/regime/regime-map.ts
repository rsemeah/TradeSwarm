import type { RegimeLabel } from "./types";

export interface StateDescriptor {
  state: number;
  meanLogReturn: number;
  meanVolatility: number;
  meanAtrPct: number;
  meanTrendSlope: number;
}

/**
 * Tunable boundaries used to map latent states into user-facing regime labels.
 * Adjust thresholds with calibration data for a given market and timeframe.
 */
export interface RegimeThresholds {
  bullishReturn: number;
  bearishReturn: number;
  highVolatility: number;
  highAtrPct: number;
  trendTolerance: number;
}

export const DEFAULT_REGIME_THRESHOLDS: RegimeThresholds = {
  bullishReturn: 0.0008,
  bearishReturn: -0.0008,
  highVolatility: 0.012,
  highAtrPct: 0.018,
  trendTolerance: 0.00003,
};

export function mapStateToRegime(
  descriptor: StateDescriptor,
  thresholds: RegimeThresholds = DEFAULT_REGIME_THRESHOLDS,
): RegimeLabel {
  const {
    meanLogReturn,
    meanVolatility,
    meanAtrPct,
    meanTrendSlope,
  } = descriptor;

  const isVolatile = meanVolatility >= thresholds.highVolatility || meanAtrPct >= thresholds.highAtrPct;
  if (isVolatile) {
    return "VOLATILE";
  }

  const bullishSignal = meanLogReturn >= thresholds.bullishReturn || meanTrendSlope > thresholds.trendTolerance;
  if (bullishSignal) {
    return "BULL";
  }

  const bearishSignal = meanLogReturn <= thresholds.bearishReturn || meanTrendSlope < -thresholds.trendTolerance;
  if (bearishSignal) {
    return "BEAR";
  }

  return "SIDEWAYS";
}
