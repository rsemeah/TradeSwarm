/** ISO-8601 timestamp string. */
export type ISODateTime = string;

/** OHLCV candle representation used by regime detection. */
export interface Candle {
  timestamp: ISODateTime;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Single numeric feature row. */
export type FeatureVector = number[];

/** Feature matrix aligned to timestamps. */
export interface FeatureMatrix {
  rows: FeatureVector[];
  featureNames: string[];
  timestamps: ISODateTime[];
}

export type RegimeLabel = "BULL" | "BEAR" | "SIDEWAYS" | "VOLATILE";

export interface GaussianHMMParams {
  nStates: number;
  nFeatures: number;
  startProb: number[];
  transition: number[][];
  means: number[][];
  variances: number[][];
}

export interface TrainOptions {
  maxIterations?: number;
  tolerance?: number;
  minVariance?: number;
}

export interface DetectRegimeOptions extends TrainOptions {
  nStates?: number;
  featureWindow?: number;
}

export interface RegimeResult {
  label: RegimeLabel;
  confidence: number;
  state: number;
  stateSequence: number[];
  posteriorsLast: number[];
  featureMatrix: FeatureMatrix;
  model: GaussianHMMParams;
  diagnostics: {
    logLikelihood: number;
    iterations: number;
    stateLabelMap: Record<number, RegimeLabel>;
  };
}
