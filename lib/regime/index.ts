import { buildFeatureMatrix } from "./features";
import { GaussianHMM, initGaussianHMM } from "./hmm";
import { mapStateToRegime } from "./regime-map";
import type {
  Candle,
  DetectRegimeOptions,
  FeatureVector,
  RegimeLabel,
  RegimeResult,
} from "./types";

function meanByState(rows: FeatureVector[], states: number[], state: number): FeatureVector {
  const subset = rows.filter((_, idx) => states[idx] === state);
  if (subset.length === 0) {
    return Array.from({ length: rows[0]?.length ?? 0 }, () => 0);
  }
  return subset[0].map((_, featureIdx) =>
    subset.reduce((acc, row) => acc + row[featureIdx], 0) / subset.length,
  );
}

export function detectRegime(candles: Candle[], opts: DetectRegimeOptions = {}): RegimeResult {
  const { featureWindow = 14, nStates = 4, ...trainOptions } = opts;
  const featureMatrix = buildFeatureMatrix(candles, featureWindow);

  if (featureMatrix.rows.length < Math.max(12, nStates * 2)) {
    throw new Error("Insufficient candles to detect regime with current configuration");
  }

  const initial = initGaussianHMM(featureMatrix.rows, nStates);
  const hmm = new GaussianHMM(initial);
  const train = hmm.train(featureMatrix.rows, trainOptions);
  const stateSequence = hmm.viterbi(featureMatrix.rows);
  const posteriorsLast = hmm.posteriorLast(featureMatrix.rows);
  const state = stateSequence[stateSequence.length - 1];

  const stateLabelMap: Record<number, RegimeLabel> = {};
  for (let s = 0; s < nStates; s += 1) {
    const means = meanByState(featureMatrix.rows, stateSequence, s);
    stateLabelMap[s] = mapStateToRegime({
      state: s,
      meanLogReturn: means[0] ?? 0,
      meanVolatility: means[1] ?? 0,
      meanAtrPct: means[2] ?? 0,
      meanTrendSlope: means[3] ?? 0,
    });
  }

  return {
    label: stateLabelMap[state],
    confidence: posteriorsLast[state] ?? 0,
    state,
    stateSequence,
    posteriorsLast,
    featureMatrix,
    model: hmm.params,
    diagnostics: {
      logLikelihood: train.logLikelihood,
      iterations: train.iterations,
      stateLabelMap,
    },
  };
}

export * from "./types";
export { buildFeatureMatrix, featureNames } from "./features";
export { GaussianHMM, initGaussianHMM } from "./hmm";
export { mapStateToRegime } from "./regime-map";
