export type TransportMode = 'ROAD' | 'EXPRESS_ROAD' | 'RAIL' | 'AIR';
export type ShipmentType = 'STANDARD' | 'EXPRESS' | 'FRAGILE' | 'PERISHABLE' | 'DOCUMENT';
export type PriorityGoal = 'CHEAPEST' | 'FASTEST' | 'BALANCED' | 'DEADLINE_CRITICAL';
export type DeadlineStatus = 'ON_TIME' | 'AT_RISK' | 'LATE';

export interface JourneyOption {
  id: string;
  name: string;
  carrier: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  distance_km: number;
  base_duration_hours: number;
  base_cost_inr: number;
  weight_capacity_kg: number;
  reliability_score: number;
  carbon_emissions_kg: number;
  departure_time: string;
  assumptions: string[];
}

export interface CostBreakdown {
  base_cost_inr: number;
  weight_surcharge_inr: number;
  handling_surcharge_inr: number;
  disruption_cost_inr: number;
  total_cost_inr: number;
  currency: string;
  calculation_notes: string[];
}

export interface DeadlineEvaluation {
  departure_time: string;
  estimated_duration_hours: number;
  estimated_arrival_time: string;
  required_deadline: string;
  is_feasible: boolean;
  margin_hours: number;
  status: DeadlineStatus;
  notes: string;
}

export interface ConstraintCheckResult {
  is_budget_met: boolean;
  is_deadline_met: boolean;
  is_weight_met: boolean;
  is_mode_met: boolean;
  overall_feasible: boolean;
  rejection_reasons: string[];
}

export interface EvaluatedOption {
  option: JourneyOption;
  cost: CostBreakdown;
  deadline: DeadlineEvaluation;
  constraints: ConstraintCheckResult;
  score: number;
  is_recommended: boolean;
  tradeoff_summary: string;
}

export interface ComparisonResult {
  run_id?: string;
  created_at?: string;
  origin: string;
  destination: string;
  priority: PriorityGoal;
  budget_inr: number;
  deadline_hours: number;
  weight_kg?: number;
  shipment_type?: ShipmentType;
  total_evaluated: number;
  feasible_count: number;
  recommended_option?: EvaluatedOption;
  alternatives: EvaluatedOption[];
  has_feasible_solution: boolean;
  refusal_or_tradeoff_explanation: string;
  data_source: string;
}

export interface DisruptionDetails {
  option_id: string;
  delay_hours: number;
  is_cancelled: boolean;
  cost_increase_pct: number;
  reason: string;
}

export interface ReplanningResult {
  run_id?: string;
  created_at?: string;
  original_option_id: string;
  original_option_name?: string;
  original_carrier?: string;
  original_mode?: TransportMode;
  origin?: string;
  destination?: string;
  origin_id?: string;
  destination_id?: string;
  budget_inr?: number;
  deadline_hours?: number;
  original_cost_inr: number;
  original_duration_hours: number;
  original_arrival: string;
  disruption_applied: DisruptionDetails;
  baseline_duration_hours?: number;
  applicable_delay_hours?: number;
  disrupted_duration_hours: number;
  disrupted_arrival: string;
  disrupted_margin_hours?: number;
  disrupted_status?: DeadlineStatus;
  disrupted_still_feasible: boolean;
  revised_recommended_option?: EvaluatedOption;
  is_revised_feasible?: boolean;
  cost_delta_inr: number;
  duration_delta_hours: number;
  all_revised_options: EvaluatedOption[];
  decision_explanation: string;
  remaining_risks: string[];
  data_source?: string;
}

export interface MCPActivityRecord {
  id: string;
  tool_name: string;
  arguments: Record<string, any>;
  result: any;
  is_real_mcp: boolean;
  provider_mode: string;
  status: string;
  duration_ms: number;
  error_message?: string;
  timestamp: string;
}

export interface MCPToolMeta {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface SystemHealth {
  status: string;
  app: string;
  version: string;
  tagline: string;
  ai_provider_mode: string;
  aws_region: string;
  bedrock_model_id: string;
  mcp_server: {
    configured_url: string;
    status: string;
    details: any;
  };
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tools_executed?: Array<{
    tool: string;
    arguments: Record<string, any>;
    result_data?: any;
  }>;
}
