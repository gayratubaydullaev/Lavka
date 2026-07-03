export interface TimelineEvent {
  timestamp: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
}

export interface FraudFlag {
  code: string;
  message: string;
  severity: string;
}

export interface FraudProfile {
  customer_id: string;
  risk_score: number;
  trust_score: number;
  flags: FraudFlag[];
  orders_count: number;
  refunds_count: number;
  account_age_days: number;
  recommendation: string;
}

export interface AiSuggestion {
  text: string;
  confidence: number;
  source: string;
  question?: string;
}

export interface AutoRefundEligibility {
  eligible: boolean;
  trust_score: number;
  risk_score: number;
  amount: number;
  reasons: string[];
}
