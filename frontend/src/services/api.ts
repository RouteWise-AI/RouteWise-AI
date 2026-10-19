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

/**
 * Determine the API Base URL.
 * Supports both single-port forwarding (via Vite proxy) and dual-port forwarding (separate public backend URL).
 *
 * 1. Single-port forwarding (recommended):
 *    Leave VITE_API_BASE_URL blank. Browser makes relative requests (/api/...) to the frontend origin,
 *    and Vite's dev server reverse-proxies them to http://127.0.0.1:8001.
 *
 * 2. Dual-port forwarding:
 *    Set VITE_API_BASE_URL to the forwarded backend URL (e.g. https://8001-xxxx.antigravity.run
 *    or https://xxxx-8001.app.github.dev). The frontend and backend can have different public hostnames.
 *
 * 3. Localhost protection:
 *    If the browser is accessed remotely (not on localhost/127.0.0.1) and VITE_API_BASE_URL points to
 *    localhost or 127.0.0.1 (which the remote client cannot reach), it safely falls back to relative ''
 *    to leverage Vite's proxy instead of failing with connection refused or mixed content errors.
 */
export function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // If no env variable is provided, always use relative path for Vite proxy
  if (!envUrl) {
    return '';
  }

  // Normalize: remove trailing slashes
  let cleanUrl = envUrl.replace(/\/+$/, '');

  // Strip trailing /api if present to prevent /api/api duplication with endpoints
  if (cleanUrl.endsWith('/api')) {
    cleanUrl = cleanUrl.slice(0, -4);
  }

  // Check if running in browser
  if (typeof window !== 'undefined') {
    const isLocalBrowser =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If accessing from a remote/forwarded origin, reject unreachable localhost/127.0.0.1 target
    if (!isLocalBrowser && (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1'))) {
      console.warn(
        `[RouteWise API] Browser hostname is "${window.location.hostname}" but VITE_API_BASE_URL points to local address "${cleanUrl}". Falling back to relative Vite proxy to avoid unreachable host errors.`
      );
      return '';
    }
  }

  return cleanUrl;
}

/**
 * Build the full request URL without duplicate /api prefixes.
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  if (!base) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api')) {
    return `${base}${cleanEndpoint.slice(4)}`;
  }
  return `${base}${cleanEndpoint}`;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = buildApiUrl(endpoint);
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
