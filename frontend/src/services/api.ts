/**
 * RouteWise AI - Frontend API Service Client
 * Encapsulates backend REST calls to FastAPI.
 */

import type {
  ComparisonResult,
  MCPActivityRecord,
  MCPToolMeta,
  ReplanningResult,
  SystemHealth,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorJson.message || errorMsg;
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`API Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // System Health & Config
  getHealth: () => request<SystemHealth>('/api/health'),
  getConfig: () => request<any>('/api/config'),
  resetDemo: () => request<any>('/api/demo/reset', { method: 'POST' }),

  // Agent Chat
  sendChatMessage: (message: string, history: Array<{ role: string; content: string }>, sessionId = 'default-session', overrideProvider?: string) =>
    request<{
      response: string;
      provider_used: string;
      model_id?: string;
      tools_executed: any[];
      extracted_constraints?: any;
      session_id: string;
    }>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        session_id: sessionId,
        override_provider: overrideProvider,
      }),
    }),

  // Journey Decisions via real MCP
  compareRoutes: (params: {
    origin: string;
    destination: string;
    budget_inr: number;
    deadline_hours: number;
    weight_kg?: number;
    shipment_type?: string;
    priority?: string;
    preferred_modes?: string[];
  }) =>
    request<ComparisonResult>('/api/journey/compare', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  calculateCost: (params: {
    option_id: string;
    weight_kg?: number;
    shipment_type?: string;
    declared_value_inr?: number;
    disruption_cost_inr?: number;
  }) =>
    request<any>('/api/journey/calculate-cost', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  checkDeadline: (params: {
    departure_time: string;
    duration_hours: number;
    deadline_hours: number;
  }) =>
    request<any>('/api/journey/check-deadline', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  simulateDelay: (params: {
    option_id: string;
    delay_hours: number;
    is_cancelled?: boolean;
    cost_increase_pct?: number;
    reason?: string;
  }) =>
    request<any>('/api/journey/simulate-delay', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  replanJourney: (params: {
    original_option_id: string;
    origin: string;
    destination: string;
    delay_hours: number;
    budget_inr: number;
    deadline_hours: number;
    weight_kg?: number;
    shipment_type?: string;
    priority?: string;
    is_cancelled?: boolean;
    cost_increase_pct?: number;
    disruption_reason?: string;
  }) =>
    request<ReplanningResult>('/api/journey/replan', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // MCP Inspector
  getMCPTools: () => request<{ count: number; tools: MCPToolMeta[]; protocol: string; server_url: string }>('/api/mcp/tools'),
  getMCPActivity: (limit = 50) => request<MCPActivityRecord[]>(`/api/mcp/activity?limit=${limit}`),
  clearMCPActivity: () => request<any>('/api/mcp/clear-activity', { method: 'POST' }),
};
