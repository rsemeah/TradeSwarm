import type { RegimeResult } from "../regime";

/** Receipt extension payload for attaching regime diagnostics to proof bundles. */
export interface RegimeReceiptExtension {
  regime: {
    label: RegimeResult["label"];
    confidence: number;
    state: number;
    featureNames: string[];
    featuresLast: number[];
  };
  regimeDiagnostics: {
    logLikelihood: number;
    iterations: number;
    stateLabelMap: Record<number, RegimeResult["label"]>;
  };
}

/**
 * Canonical deterministic input shape to hash into receipts/replay pipelines.
 * Rounded numeric values prevent tiny floating-point variance from mutating hashes.
 */
export function regimeDeterminismInput(result: RegimeResult): Record<string, unknown> {
  const round = (value: number) => Number(value.toFixed(8));
  return {
    label: result.label,
    confidence: round(result.confidence),
    state: result.state,
    posteriorsLast: result.posteriorsLast.map(round),
    featuresLast: (result.featureMatrix.rows[result.featureMatrix.rows.length - 1] ?? []).map(round),
    featureNames: [...result.featureMatrix.featureNames],
    stateLabelMap: Object.fromEntries(
      Object.entries(result.diagnostics.stateLabelMap).map(([k, v]) => [k, v]),
    ),
  };
}

/*
Integration reference (engine receipt build flow):

import { detectRegime } from "@/lib/regime";
import { regimeDeterminismInput } from "@/lib/receipts/regime-receipt";

const regimeResult = detectRegime(candles, { featureWindow: 14, nStates: 4 });
receipt.market_context.regime = regimeResult.label;
receipt.provenance.regime_input = regimeDeterminismInput(regimeResult);
*/
