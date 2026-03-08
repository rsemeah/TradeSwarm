// TradeSwarm Halal Mode Type Definitions

export type ShariaStandard = 'AAOIFI' | 'DJIM' | 'CUSTOM'
export type TruthStatus = 'VERIFIED' | 'STUBBED' | 'MISSING'
export type HalalStatus = 'COMPLIANT' | 'QUESTIONABLE' | 'NON_COMPLIANT' | 'PENDING_REVIEW'
export type AttestationLevel = 'FULL' | 'PARTIAL' | 'MANUAL_REVIEW'
export type PurificationStatus = 'PENDING' | 'DONATED' | 'WRITTEN_OFF'
export type DriftType = 'SECTOR_CHANGE' | 'RATIO_BREACH' | 'DELISTING' | 'RESTATEMENT' | 'MANUAL_FLAG'
export type DriftSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IntentStatus = 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED'

export interface ShariaProfile {
  id: string
  user_id: string
  standard: ShariaStandard
  max_debt_ratio: number
  max_receivables_ratio: number
  max_haram_revenue_ratio: number
  allowed_sectors: string[]
  blocked_sectors: string[]
  require_purification: boolean
  charity_destination?: string
  created_at: string
  updated_at: string
}

export interface GateEvidence {
  source: string
  value: unknown
  timestamp: string
  truth_status: TruthStatus
}

export interface HalalScreen {
  id: string
  user_id: string
  ticker: string
  screen_date: string
  
  // H1: Business Activity
  h1_sector?: string
  h1_haram_revenue_pct?: number
  h1_pass: boolean
  h1_evidence?: GateEvidence
  
  // H2: Debt Ratio
  h2_total_debt?: number
  h2_market_cap?: number
  h2_debt_ratio?: number
  h2_pass: boolean
  h2_evidence?: GateEvidence
  
  // H3: Receivables
  h3_receivables?: number
  h3_total_assets?: number
  h3_receivables_ratio?: number
  h3_pass: boolean
  h3_evidence?: GateEvidence
  
  // H4: Interest Income
  h4_interest_income?: number
  h4_total_revenue?: number
  h4_interest_ratio?: number
  h4_pass: boolean
  h4_evidence?: GateEvidence
  
  overall_pass: boolean
  compliance_score: number
  truth_status: TruthStatus
  data_sources?: Record<string, unknown>
  created_at: string
}

export interface HalalGate {
  id: string
  user_id: string
  screen_id?: string
  ticker: string
  strategy_type: string
  
  // H5: Position Limit
  h5_current_exposure?: number
  h5_max_exposure?: number
  h5_pass: boolean
  h5_evidence?: GateEvidence
  
  // H6: Timing (gharar check)
  h6_is_0dte?: boolean
  h6_market_hours?: boolean
  h6_pass: boolean
  h6_evidence?: GateEvidence
  
  // H7: Intent Confirmation
  h7_user_confirmed: boolean
  h7_confirmation_ts?: string
  h7_pass: boolean
  
  overall_pass: boolean
  gate_ts: string
}

export interface HalalIntent {
  id: string
  user_id: string
  gate_id?: string
  ticker: string
  strategy_type: string
  direction: 'LONG' | 'SHORT'
  notional_amount: number
  
  understood_risks: boolean
  accepted_purification: boolean
  intent_statement?: string
  
  status: IntentStatus
  expires_at?: string
  confirmed_at?: string
  created_at: string
}

export interface ShariaReceipt {
  id: string
  user_id: string
  trade_id?: string
  intent_id?: string
  
  screen_snapshot: HalalScreen
  gate_snapshot: HalalGate
  market_snapshot: {
    price: number
    iv: number
    vix: number
    timestamp: string
  }
  
  compliance_hash: string
  market_hash: string
  determinism_hash: string
  
  estimated_purification: number
  purification_rate: number
  
  attestation_level: AttestationLevel
  scholar_notes?: string
  
  truth_status: TruthStatus
  created_at: string
}

export interface PurificationEntry {
  id: string
  user_id: string
  trade_id?: string
  receipt_id?: string
  
  ticker: string
  trade_pnl: number
  haram_ratio: number
  purification_amount: number
  
  status: PurificationStatus
  charity_destination?: string
  donated_at?: string
  
  created_at: string
}

export interface ComplianceDrift {
  id: string
  user_id: string
  trade_id?: string
  ticker: string
  
  drift_type: DriftType
  drift_severity: DriftSeverity
  
  previous_status?: string
  new_status?: string
  evidence?: Record<string, unknown>
  
  action_required?: string
  action_taken?: string
  resolved_at?: string
  
  detected_at: string
}

// Gate stack for UI display
export interface GateStackItem {
  gate: string
  label: string
  description: string
  pass: boolean
  evidence?: GateEvidence
  truth_status: TruthStatus
}

export interface GateStack {
  ticker: string
  strategy: string
  gates: GateStackItem[]
  overall_pass: boolean
  attestation_level: AttestationLevel
}

// Purification summary
export interface PurificationSummary {
  total_pending: number
  total_donated: number
  entries: PurificationEntry[]
  recommended_charity?: string
}
