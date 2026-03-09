// lib/types/halal.ts
// Core types for Halal mode (trimmed/adaptive for integration)

export type TruthStatus = "VERIFIED" | "STUBBED" | "MISSING";
export type ShariaStandard = "AAOIFI" | "DJIM" | "CUSTOM";
export type ScreenFreshness = "FRESH" | "STALE" | "MISSING" | "EXPIRED";
export type ComplianceDecision = "PASS" | "FAIL" | "CONTESTED_REQUIRES_OVERRIDE";

export type PortfolioIntent =
  | "INITIATE_POSITION"
  | "ADD_TO_POSITION"
  | "REDUCE_POSITION"
  | "EXIT_POSITION"
  | "REBALANCE"
  | "REPLACE_DISQUALIFIED_HOLDING"
  | "ROTATE_DEFENSIVE"
  | "ALLOCATE_GOLD_SLEEVE"
  | "MOVE_TO_CASH"
  | "DEFER";

export type IntentStatus =
  | "PROPOSED"
  | "COMPLIANCE_PENDING"
  | "COMPLIANCE_PASSED"
  | "COMPLIANCE_FAILED"
  | "CAPITAL_PENDING"
  | "QUEUED_PAPER"
  | "EXECUTED_PAPER"
  | "CANCELLED";

export interface ShariaProfile {
  profile_id: string;
  user_id: string;
  standard: ShariaStandard;
  max_debt_ratio?: number;
  max_interest_income_ratio?: number;
  max_receivables_ratio?: number;
  contested_assets_allowed?: boolean;
  purification_tracking_required?: boolean;
  truth_status?: TruthStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ScreenEvidence {
  evidence_id?: string;
  detail?: string;
}

export interface HalalScreenResult {
  screen_id: string;
  ticker: string;
  profile_id: string;
  is_contested: boolean;
  truth_status: TruthStatus;
  screened_at?: string;
  expires_at?: string;
  evidence?: ScreenEvidence[];
}

export type ShariaReceiptType =
  | "SHARIA_RECEIPT"
  | "SCREEN_FAIL_RECEIPT"
  | "CONTESTED_OVERRIDE_RECEIPT"
  | "PURIFICATION_LIABILITY_RECEIPT"
  | "COMPLIANCE_DRIFT_RECEIPT"
  | "REBALANCE_RECEIPT";

export interface ShariaReceipt {
  receipt_id?: string;
  receipt_type: ShariaReceiptType;
  profile_id?: string;
  screen_id?: string;
  created_at?: string;
  truth_status?: TruthStatus;
  payload?: Record<string, unknown>;
}

export interface PortfolioIntentRecord {
  intent_id?: string;
  portfolio_id: string;
  intent_type: PortfolioIntent;
  status?: IntentStatus;
  ticker?: string | null;
  truth_status?: TruthStatus;
}

export interface PurificationRecord {
  purification_id?: string;
  portfolio_id: string;
  ticker: string;
  purification_amount: number;
  status?: string;
  truth_status?: TruthStatus;
}

export interface DriftDetectionResult {
  events_created: number;
  high_severity_count: number;
  rescreens_queued: number;
  truth_status: TruthStatus;
}

export interface PortfolioState {
  portfolio_id: string;
  total_positions: number;
  halal_positions: number;
  contested_positions: number;
  sleeve_weights: Record<string, number>;
  total_value_usd: number;
  cash_pct: number;
  diversification_ok: boolean;
  concentration_breach_tickers: string[];
  stale_screen_tickers: string[];
  pending_purification_total: number;
  active_drift_count: number;
  truth_status: TruthStatus;
}

export interface GateStatus {
  pass: boolean | null;
  status: TruthStatus;
  detail: string;
}

export interface HalalProposalResult {
  gates: {
    H1_profile: GateStatus;
    H2_financial: GateStatus;
    H3_industry: GateStatus;
    H4_instrument: GateStatus;
    H5_compliance: GateStatus;
    H6_purification: GateStatus;
    H7_receipt: GateStatus;
  };
  profile_id: string | null;
  screen_id: string | null;
  compliance_gate_id: string | null;
  intent_id: string | null;
  receipt_id: string | null;
  purification_estimate: number;
  decision: 'APPROVED_PAPER_QUEUE' | 'BLOCKED' | 'CONTESTED_OVERRIDE_REQUIRED';
  block_reason?: string;
  overall_truth_status: TruthStatus;
}

export interface HalalProposalInput {
  user_id: string;
  portfolio_id: string;
  ticker: string;
  sector: string;
  instrument_type: string;
  proposed_allocation_pct: number;
  intent_type: PortfolioIntent;
}

export interface ComplianceGateInput {
  proposal?: any;
  screen_result?: any;
  profile?: ShariaProfile;
}

export interface ComplianceGateOutput {
  gate_result: { pass: boolean; status: TruthStatus; detail: string };
  receipt_id: string | null;
  decision: ComplianceDecision | string;
  block_reason?: string;
}
