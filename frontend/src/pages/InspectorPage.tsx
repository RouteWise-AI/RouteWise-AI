import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  Copy,
  Radio,
  Filter,
} from 'lucide-react';
import type { MCPActivityRecord, MCPToolMeta, SystemHealth } from '../types';
import { useToast } from '../components/Toast';
import { api, buildApiUrl } from '../services/api';

interface InspectorPageProps {
  health: SystemHealth | null;
  onRefreshHealth: () => void;
}

export const InspectorPage: React.FC<InspectorPageProps> = ({ health, onRefreshHealth }) => {
  const { showSuccess, showInfo } = useToast();
  const [activities, setActivities] = useState<MCPActivityRecord[]>([]);
  const [tools, setTools] = useState<MCPToolMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [toolFilter, setToolFilter] = useState<string>('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [act, toolsData] = await Promise.all([
        api.getMCPActivity(50),
        api.getMCPTools().catch(() => ({ tools: [] })),
      ]);
      setActivities(act);
      setTools(toolsData.tools || []);
      onRefreshHealth();
    } catch (err) {
      console.error('Failed to load inspector data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Establish Server-Sent Events (SSE) connection for real-time live streaming
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(buildApiUrl('/api/mcp/activity/stream'));

      eventSource.onopen = () => {
        setIsLiveStreaming(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const newRecord: MCPActivityRecord = JSON.parse(event.data);
          setActivities((prev) => {
            if (prev.some((a) => a.id === newRecord.id)) {
              return prev;
            }
            return [newRecord, ...prev];
          });
        } catch (e) {
          console.error('Failed to parse SSE record:', e);
        }
      };

      eventSource.onerror = () => {
        setIsLiveStreaming(false);
      };
    } catch (e) {
      console.error('EventSource initialization error:', e);
      setIsLiveStreaming(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleClear = async () => {
    await api.clearMCPActivity();
    setActivities([]);
    showInfo('MCP Activity log cleared.');
  };

  const toggleExpand = (id: string) => {
    setExpandedRecord((prev) => (prev === id ? null : id));
  };

  const handleCopy = (data: any, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showSuccess(`${label} copied to clipboard!`);
  };

  const filteredActivities = toolFilter === 'ALL'
    ? activities
    : activities.filter((a) => a.tool_name === toolFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Cpu className="w-7 h-7 text-cyan-400" />
              Model Context Protocol (MCP) Inspector
            </h1>
            {isLiveStreaming ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold animate-pulse">
                <Radio className="w-3 h-3" /> LIVE SSE
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                Polling Mode
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit log of genuine Streamable HTTP MCP JSON-RPC protocol requests and tool responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        </div>
      </div>

      {/* Technical Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">FastAPI Backend</span>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {health?.status === 'healthy' ? 'Online & Healthy' : 'Offline / Checking'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Port 8001 / REST + SSE</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MCP Server Transport</span>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {health?.mcp_server?.status === 'healthy' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Streamable HTTP (Active)
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Unreachable
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {health?.mcp_server?.configured_url || 'http://127.0.0.1:8000/mcp'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Advertised Tools</span>
          <div className="text-sm font-bold text-cyan-300">
            {tools.length > 0 ? `${tools.length} Tools Dynamically Registered` : '0 Tools Detected'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">tools/list protocol query</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Orchestrator Mode</span>
          <div className="text-sm font-bold text-purple-300">
            {health?.ai_provider_mode === 'bedrock' ? 'Amazon Bedrock Converse' : 'Deterministic Mock Mode'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Region: {health?.aws_region}</span>
        </div>
      </div>

      {/* Registered MCP Tools List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Dynamically Discovered MCP Tools (tools/list)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <div key={t.name} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-300">{t.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  MCP Tool
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Execution Activity Log ({filteredActivities.length} Calls)
            </h3>
            {isLiveStreaming && (
              <span className="text-[10px] text-emerald-400 font-mono">Auto-streaming enabled</span>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {['ALL', 'compare_routes', 'replan_journey', 'calculate_delivery_cost', 'simulate_delay'].map((f) => (
              <button
                key={f}
                onClick={() => setToolFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all ${
                  toolFilter === f
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No MCP tool calls logged matching the filter. Run a comparison or chat with the assistant to record executions.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredActivities.map((act) => {
              const isExpanded = expandedRecord === act.id;
              return (
                <div key={act.id} className="p-4 hover:bg-slate-800/20 transition-all">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(act.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {act.tool_name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              act.is_real_mcp
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {act.is_real_mcp ? 'Real MCP Protocol' : 'Mock/Fallback'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {act.provider_mode} mode
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          ID: {act.id} • {new Date(act.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300">
                        {act.duration_ms.toFixed(1)} ms
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          act.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {act.status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <div className="flex items-center justify-between mb-1 font-sans">
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Tool Call Arguments:
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(act.arguments, 'Arguments');
                            }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copy JSON
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-200 overflow-x-auto text-[11px] max-h-60">
                          {JSON.stringify(act.arguments, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1 font-sans">
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Tool Execution Result (JSON):
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(act.result, 'Result');
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copy JSON
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-300 overflow-x-auto text-[11px] max-h-60">
                          {JSON.stringify(act.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
