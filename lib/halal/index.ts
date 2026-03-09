// lib/halal/index.ts
// Expose a minimal set of maintenance functions used by the cron route.
import { DriftDetectionResult } from "@/lib/types/halal";
import * as portfolio from "./portfolio/computePortfolioState";
import * as drift from "./drift/detectComplianceDrift";
import * as receipts from "./receipts/buildShariaReceipt";
import * as purification from "./purification/estimatePurification";
import * as screening from "./screening/runHalalScreen";
import * as compliance from "./compliance/shariaComplianceGate";
import submit from "./submitHalalProposal";

export const expireStaleScreens = drift.expireStaleScreens;
export const detectComplianceDrift = drift.detectComplianceDrift;
export const processNextScreeningJob = drift.processNextScreeningJob;
export const takePortfolioSnapshot = portfolio.takePortfolioSnapshot;
export const computePortfolioState = portfolio.computePortfolioState;
export const buildShariaReceipt = receipts.buildShariaReceipt;
export const hashHalalDecisionInputs = receipts.hashHalalDecisionInputs;
export const estimatePurification = purification.estimatePurification;
export const logPurificationRecord = purification.logPurificationRecord;
export const runHalalScreen = screening.runHalalScreen;
export const shariaComplianceGate = compliance.shariaComplianceGate;
export const submitHalalProposal = submit.submitHalalProposal;

export default {
  expireStaleScreens,
  detectComplianceDrift,
  processNextScreeningJob,
  takePortfolioSnapshot,
  computePortfolioState,
  buildShariaReceipt,
  hashHalalDecisionInputs,
  estimatePurification,
  logPurificationRecord,
  runHalalScreen,
  shariaComplianceGate,
  submitHalalProposal,
};
