import type { GaussianHMMParams, TrainOptions } from "./types";

interface FitResult {
  logLikelihood: number;
  iterations: number;
}

function clampProbability(value: number): number {
  return Math.min(1 - 1e-12, Math.max(1e-12, value));
}

function normalize(values: number[]): number[] {
  const sum = values.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return values.map(() => 1 / values.length);
  }
  return values.map((value) => clampProbability(value / sum));
}

function gaussianPdf(x: number, mean: number, variance: number): number {
  const safeVariance = Math.max(variance, 1e-6);
  const coefficient = 1 / Math.sqrt(2 * Math.PI * safeVariance);
  const exponent = -((x - mean) ** 2) / (2 * safeVariance);
  return Math.max(1e-18, coefficient * Math.exp(exponent));
}

function emissionProb(observation: number[], means: number[], variances: number[]): number {
  let probability = 1;
  for (let i = 0; i < observation.length; i += 1) {
    probability *= gaussianPdf(observation[i], means[i], variances[i]);
  }
  return Math.max(probability, 1e-36);
}

function deterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function initGaussianHMM(
  observations: number[][],
  nStates: number,
  seed = 7,
): GaussianHMMParams {
  if (observations.length === 0) {
    throw new Error("Cannot initialize HMM without observations");
  }
  const nFeatures = observations[0].length;
  const rng = deterministicRandom(seed);

  const startProb = Array.from({ length: nStates }, () => 1 / nStates);
  const transition = Array.from({ length: nStates }, () =>
    normalize(Array.from({ length: nStates }, () => 0.5 + rng())),
  );

  const means = Array.from({ length: nStates }, (_, state) => {
    const index = Math.floor(((state + 0.5) / nStates) * observations.length) % observations.length;
    return [...observations[index]];
  });

  const variances = Array.from({ length: nStates }, () => {
    const perFeature = Array.from({ length: nFeatures }, (_, feature) => {
      const values = observations.map((row) => row[feature]);
      const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
      const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
      return Math.max(variance, 1e-4);
    });
    return perFeature;
  });

  return { nStates, nFeatures, startProb, transition, means, variances };
}

export class GaussianHMM {
  public params: GaussianHMMParams;

  public lastLogLikelihood = Number.NEGATIVE_INFINITY;

  public lastIterations = 0;

  constructor(params: GaussianHMMParams) {
    this.params = params;
  }

  private forwardBackward(observations: number[][]) {
    const T = observations.length;
    const N = this.params.nStates;
    const alpha = Array.from({ length: T }, () => Array.from({ length: N }, () => 0));
    const beta = Array.from({ length: T }, () => Array.from({ length: N }, () => 0));
    const scales = Array.from({ length: T }, () => 0);

    for (let i = 0; i < N; i += 1) {
      alpha[0][i] = this.params.startProb[i] * emissionProb(observations[0], this.params.means[i], this.params.variances[i]);
    }
    scales[0] = alpha[0].reduce((acc, value) => acc + value, 0) || 1;
    for (let i = 0; i < N; i += 1) alpha[0][i] /= scales[0];

    for (let t = 1; t < T; t += 1) {
      for (let j = 0; j < N; j += 1) {
        let sum = 0;
        for (let i = 0; i < N; i += 1) sum += alpha[t - 1][i] * this.params.transition[i][j];
        alpha[t][j] = sum * emissionProb(observations[t], this.params.means[j], this.params.variances[j]);
      }
      scales[t] = alpha[t].reduce((acc, value) => acc + value, 0) || 1;
      for (let j = 0; j < N; j += 1) alpha[t][j] /= scales[t];
    }

    for (let i = 0; i < N; i += 1) beta[T - 1][i] = 1;
    for (let t = T - 2; t >= 0; t -= 1) {
      for (let i = 0; i < N; i += 1) {
        let sum = 0;
        for (let j = 0; j < N; j += 1) {
          sum += this.params.transition[i][j] * emissionProb(observations[t + 1], this.params.means[j], this.params.variances[j]) * beta[t + 1][j];
        }
        beta[t][i] = sum / scales[t + 1];
      }
    }

    const gamma = Array.from({ length: T }, () => Array.from({ length: N }, () => 0));
    const xi = Array.from({ length: T - 1 }, () =>
      Array.from({ length: N }, () => Array.from({ length: N }, () => 0)),
    );

    for (let t = 0; t < T; t += 1) {
      let norm = 0;
      for (let i = 0; i < N; i += 1) {
        gamma[t][i] = alpha[t][i] * beta[t][i];
        norm += gamma[t][i];
      }
      for (let i = 0; i < N; i += 1) gamma[t][i] = clampProbability(gamma[t][i] / (norm || 1));
    }

    for (let t = 0; t < T - 1; t += 1) {
      let norm = 0;
      for (let i = 0; i < N; i += 1) {
        for (let j = 0; j < N; j += 1) {
          xi[t][i][j] =
            alpha[t][i] *
            this.params.transition[i][j] *
            emissionProb(observations[t + 1], this.params.means[j], this.params.variances[j]) *
            beta[t + 1][j];
          norm += xi[t][i][j];
        }
      }
      for (let i = 0; i < N; i += 1) {
        for (let j = 0; j < N; j += 1) {
          xi[t][i][j] = clampProbability(xi[t][i][j] / (norm || 1));
        }
      }
    }

    const logLikelihood = -scales.reduce((acc, scale) => acc + Math.log(scale || 1e-12), 0);
    return { gamma, xi, logLikelihood };
  }

  train(observations: number[][], options: TrainOptions = {}): FitResult {
    const { maxIterations = 40, tolerance = 1e-4, minVariance = 1e-5 } = options;
    if (observations.length < 2) {
      throw new Error("HMM training requires at least 2 observations");
    }

    const N = this.params.nStates;
    const D = this.params.nFeatures;
    let previousLogLikelihood = Number.NEGATIVE_INFINITY;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const { gamma, xi, logLikelihood } = this.forwardBackward(observations);

      this.params.startProb = normalize([...gamma[0]]);

      for (let i = 0; i < N; i += 1) {
        const denom = gamma.slice(0, -1).reduce((acc, row) => acc + row[i], 0) || 1;
        const transitionRow = Array.from({ length: N }, (_, j) =>
          xi.reduce((acc, matrix) => acc + matrix[i][j], 0) / denom,
        );
        this.params.transition[i] = normalize(transitionRow);
      }

      for (let i = 0; i < N; i += 1) {
        const gammaSum = gamma.reduce((acc, row) => acc + row[i], 0) || 1;
        for (let d = 0; d < D; d += 1) {
          const meanNumerator = observations.reduce((acc, obs, t) => acc + gamma[t][i] * obs[d], 0);
          const mean = meanNumerator / gammaSum;
          this.params.means[i][d] = mean;
          const varNumerator = observations.reduce((acc, obs, t) => acc + gamma[t][i] * (obs[d] - mean) ** 2, 0);
          this.params.variances[i][d] = Math.max(varNumerator / gammaSum, minVariance);
        }
      }

      this.lastLogLikelihood = logLikelihood;
      this.lastIterations = iteration + 1;

      if (Math.abs(logLikelihood - previousLogLikelihood) < tolerance) {
        break;
      }
      previousLogLikelihood = logLikelihood;
    }

    return { logLikelihood: this.lastLogLikelihood, iterations: this.lastIterations };
  }

  viterbi(observations: number[][]): number[] {
    const T = observations.length;
    const N = this.params.nStates;
    const dp = Array.from({ length: T }, () => Array.from({ length: N }, () => Number.NEGATIVE_INFINITY));
    const backtrack = Array.from({ length: T }, () => Array.from({ length: N }, () => 0));

    for (let i = 0; i < N; i += 1) {
      dp[0][i] = Math.log(clampProbability(this.params.startProb[i])) +
        Math.log(emissionProb(observations[0], this.params.means[i], this.params.variances[i]));
    }

    for (let t = 1; t < T; t += 1) {
      for (let j = 0; j < N; j += 1) {
        let bestPrev = 0;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < N; i += 1) {
          const score = dp[t - 1][i] + Math.log(clampProbability(this.params.transition[i][j]));
          if (score > bestScore) {
            bestScore = score;
            bestPrev = i;
          }
        }
        dp[t][j] = bestScore + Math.log(emissionProb(observations[t], this.params.means[j], this.params.variances[j]));
        backtrack[t][j] = bestPrev;
      }
    }

    const states = Array.from({ length: T }, () => 0);
    states[T - 1] = dp[T - 1].reduce((best, value, idx, arr) => (value > arr[best] ? idx : best), 0);
    for (let t = T - 2; t >= 0; t -= 1) {
      states[t] = backtrack[t + 1][states[t + 1]];
    }
    return states;
  }

  posteriorLast(observations: number[][]): number[] {
    const { gamma } = this.forwardBackward(observations);
    return gamma[gamma.length - 1];
  }
}
